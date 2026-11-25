// F&V — Empaqueta y firma el pack demo como bundle .fvpack (contrato v1).
//
// Flujo (ADR-0009):
//   1. Carga packages/content-packs-demo (pack.json + items/*.json).
//   2. Valida con el validador COMPLETO de F1.1 (packages/content-schema):
//      si el pack no pasa validate:content, NO se empaqueta nada.
//   3. Calcula el sync-manifest (SHA-256 por archivo) y lo firma con la clave DEMO.
//   4. Escribe:
//        packages/content-packs-demo/bundle/pack-fv-demo.fvpack  (unidad de instalación)
//        packages/content-packs-demo/bundle/truststore.json      (clave PÚBLICA demo)
//
// Claves: la clave PRIVADA vive solo en _private/demo-signing/ (gitignored, fuera del
// repo — misma disciplina que el keystore de Android). Si no existe, se genera una
// vez. En el repo solo queda la clave pública, etiquetada como DEMO. La clave de
// producción de packs reales se guardará fuera del repo (F4.3/F11.1) y este script
// la usará vía variable de entorno: aquí NO se toca.
//
// Uso:
//   node tools/pack-bundle.mjs          # empaqueta, firma y escribe
//   node tools/pack-bundle.mjs --check  # comprueba deriva sin escribir (para CI)

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPack, validatePack } from "../packages/content-schema/src/index.mjs";
import { sha256Hex, generarParClaves, firmarManifiesto, verificarManifiesto } from "../packages/sync-contracts/src/integrity.mjs";
import { BUNDLE_FORMAT, CONTRACT_VERSION, CONTENT_SCHEMA_VERSION } from "../packages/sync-contracts/src/constants.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_PACK = join(RAIZ, "packages", "content-packs-demo");
const DIR_BUNDLE = join(DIR_PACK, "bundle");
const DIR_CLAVES = join(RAIZ, "_private", "demo-signing");
const RUTA_BUNDLE = join(DIR_BUNDLE, "pack-fv-demo.fvpack");
const RUTA_TRUSTSTORE = join(DIR_BUNDLE, "truststore.json");
const RUTA_CLAVE = join(DIR_CLAVES, "demo-signing-key.json");
const KEY_ID = "demo-pack-fv-2026";

const checkMode = process.argv.includes("--check");

// 1) Cargar y validar con el validador completo de F1.1.
const pack = loadPack(DIR_PACK);
const validacion = validatePack(pack);
if (!validacion.valido) {
  console.error("El pack NO pasa validate:content; no se empaqueta:");
  for (const e of validacion.errores) console.error(`  [${e.regla}] ${e.id}: ${e.mensaje}`);
  process.exit(1);
}

// 2) Archivos del pack: pack.json + items/*.json (texto exacto UTF-8).
const archivos = {};
const textoPackJson = readFileSync(join(DIR_PACK, "pack.json"), "utf8");
archivos["pack.json"] = textoPackJson;
const dirItems = join(DIR_PACK, "items");
for (const f of readdirSync(dirItems).sort()) {
  if (!f.endsWith(".json")) continue;
  archivos[`items/${f}`] = readFileSync(join(dirItems, f), "utf8");
}

const itemsTotal = pack.entries.length;
const manifest = pack.manifest;

// 3) Sync-manifest (los archivos se ordenan por ruta para un hash estable).
const syncManifest = {
  contract_version: CONTRACT_VERSION,
  pack_id: manifest.id,
  pack_version: manifest.version,
  schema_version: manifest.schema_version ?? CONTENT_SCHEMA_VERSION,
  min_client_version: "0.1.0",
  demo: manifest.demo === true,
  creado: manifest.creado,
  responsable: manifest.responsable,
  items_total: itemsTotal,
  files: Object.keys(archivos)
    .sort()
    .map((path) => ({ path, sha256: sha256Hex(archivos[path]), bytes: Buffer.byteLength(archivos[path], "utf8") })),
};
const manifestText = JSON.stringify(syncManifest, null, 2);
archivos["sync-manifest.json"] = manifestText;

// 4) Clave DEMO (privada solo en _private/, fuera de git).
let clave;
if (existsSync(RUTA_CLAVE)) {
  clave = JSON.parse(readFileSync(RUTA_CLAVE, "utf8"));
} else if (checkMode) {
  console.error("No hay clave DEMO en _private/demo-signing/; sin ella no se puede re-firmar. Ejecuta sin --check para generarla.");
  process.exit(1);
} else {
  mkdirSync(DIR_CLAVES, { recursive: true });
  clave = { key_id: KEY_ID, ...generarParClaves(), nota: "Clave DEMO de packs F&V. SOLO pruebas. Privada: nunca subir a git (ver .gitignore _private/)." };
  writeFileSync(RUTA_CLAVE, JSON.stringify(clave, null, 2) + "\n", "utf8");
  console.log(`Clave DEMO generada en ${RUTA_CLAVE} (fuera de git).`);
}

const signature = firmarManifiesto(manifestText, { keyId: clave.key_id, privateKeyB64: clave.privateKeyB64 });
const truststore = {
  contract_version: CONTRACT_VERSION,
  keys: [
    {
      key_id: clave.key_id,
      alg: "SHA256withECDSA",
      demo: true,
      public_key: clave.publicKeyB64,
      nota: "Clave PÚBLICA DEMO del pack demo F&V. Solo verifica el mecanismo de firma; NO es una clave de producción (ADR-0009).",
    },
  ],
};

const bundle = {
  bundle_format: BUNDLE_FORMAT,
  sync_manifest: syncManifest,
  signature,
  pack_manifest: manifest,
  files: archivos,
};

// 5) Verificación previa a escribir: la firma debe verificar con el truststore.
const verif = verificarManifiesto(manifestText, signature, truststore);
if (!verif.ok) {
  console.error(`La firma generada no verifica (${verif.codigo}); abortado.`);
  process.exit(1);
}

const textoBundle = JSON.stringify(bundle, null, 2) + "\n";
const textoTruststore = JSON.stringify(truststore, null, 2) + "\n";

if (checkMode) {
  // Comprueba deriva: mismo contenido de archivos y manifiesto que lo commiteado.
  // (La firma ECDSA no es determinista: se verifica, no se compara byte a byte.)
  if (!existsSync(RUTA_BUNDLE) || !existsSync(RUTA_TRUSTSTORE)) {
    console.error("FALTA el bundle o el truststore commiteado; ejecuta node tools/pack-bundle.mjs");
    process.exit(1);
  }
  const previo = JSON.parse(readFileSync(RUTA_BUNDLE, "utf8"));
  const problemas = [];
  if (JSON.stringify(previo.sync_manifest) !== JSON.stringify(syncManifest)) problemas.push("sync-manifest con deriva respecto al pack fuente");
  for (const [path, content] of Object.entries(archivos)) {
    if (path === "sync-manifest.json") continue;
    if (previo.files?.[path] !== content) problemas.push(`archivo '${path}' con deriva`);
  }
  const tsPrevio = JSON.parse(readFileSync(RUTA_TRUSTSTORE, "utf8"));
  const v2 = verificarManifiesto(manifestText, previo.signature, tsPrevio);
  if (!v2.ok) problemas.push(`firma del bundle commiteado no verifica (${v2.codigo})`);
  if (problemas.length > 0) {
    console.error("DRIFT en el bundle del pack demo:");
    for (const p of problemas) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`OK sin deriva: ${RUTA_BUNDLE} (${itemsTotal} ítems, ${statSync(RUTA_BUNDLE).size} bytes)`);
} else {
  mkdirSync(DIR_BUNDLE, { recursive: true });
  writeFileSync(RUTA_BUNDLE, textoBundle, "utf8");
  writeFileSync(RUTA_TRUSTSTORE, textoTruststore, "utf8");
  console.log(`Bundle escrito: ${RUTA_BUNDLE}`);
  console.log(`Truststore DEMO: ${RUTA_TRUSTSTORE}`);
  console.log(`Ítems: ${itemsTotal} · firmado con key_id=${clave.key_id}`);
}
