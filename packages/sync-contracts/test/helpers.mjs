// F&V — Helpers de prueba del contrato de sincronización.
// Construye bundles, deltas y backups a partir de los fixtures compartidos,
// con criptografía efímera por ejecución (nunca claves en el repo).

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256Hex, generarParClaves, firmarManifiesto } from "../src/integrity.mjs";
import { estadoDesdeBundle } from "../src/installer.mjs";
import { crearBackup, payloadChecksum } from "../src/backup.mjs";

const DIR_FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "shared-fixtures", "sync");

export const FIXTURES = JSON.parse(readFileSync(join(DIR_FIXTURES, "sync-cases.json"), "utf8"));
export const VECTORS = JSON.parse(readFileSync(join(DIR_FIXTURES, "crypto-vectors.json"), "utf8"));

export const CLIENT_VERSION = FIXTURES.client_version;
export const ISO_NOW = "2026-11-25T12:00:00Z";

export function clon(o) {
  return structuredClone(o);
}

function totalItems(items) {
  return Object.values(items).reduce((n, arr) => n + arr.length, 0);
}

function archivosDe(manifest, items) {
  const files = { "pack.json": JSON.stringify(manifest) };
  for (const [tipo, arr] of Object.entries(items)) {
    if (arr.length > 0) files[`items/${tipo}.json`] = JSON.stringify(arr);
  }
  return files;
}

function syncManifestDe(manifest, items, files, { minClient = "0.1.0", contractVersion = "1.0.0" } = {}) {
  const entries = Object.keys(files)
    .sort()
    .map((path) => ({ path, sha256: sha256Hex(files[path]), bytes: Buffer.byteLength(files[path], "utf8") }));
  return {
    contract_version: contractVersion,
    pack_id: manifest.id,
    pack_version: manifest.version,
    schema_version: manifest.schema_version,
    min_client_version: minClient,
    demo: manifest.demo,
    creado: manifest.creado,
    responsable: manifest.responsable,
    items_total: totalItems(items),
    files: entries,
  };
}

/**
 * Construye un bundle .fvpack válido a partir del mini-pack de fixtures,
 * aplicando la mutación indicada (ver sync-cases.json → bundle_cases.mutacion).
 */
export function construirBundle(mutacion = "ninguna", { keyId = "test-key", keypair = null } = {}) {
  const kp = keypair ?? generarParClaves();
  const manifest = clon(FIXTURES.mini_pack.manifest);
  const items = clon(FIXTURES.mini_pack.items);
  let opts = {};
  let forzarArchivos = null;

  const tec = items.tecnologia[0];
  const pre = items.pregunta[0];
  const crt = items.certificado[0];

  switch (mutacion) {
    case "ninguna":
      break;
    case "item-sin-source-ref":
      delete tec.source_ref;
      break;
    case "source-ref-incompleto":
      delete tec.source_ref.cita_textual;
      break;
    case "id-formato":
      tec.id = "TEC demo";
      break;
    case "id-tipo":
      tec.id = "fam:demo-test";
      break;
    case "id-duplicado":
      items.pregunta.push(clon(pre));
      break;
    case "etiqueta-demo":
      tec.etiquetas = [];
      break;
    case "codigo-no-demo":
      tec.source_ref.codigo_oficial = "ABC-0001";
      break;
    case "schema-version-dispar":
      tec.schema_version = "1.1.0";
      break;
    case "archivo-tipo":
      items.tecnologia.push(items.pregunta.pop());
      break;
    case "certificado-sin-aviso":
      delete crt.aviso;
      break;
    case "certificado-programa-oficial":
      crt.programa = "Programa oficial de certificación de Videojet Technologies";
      break;
    case "pregunta-respuesta":
      pre.respuesta_correcta = "Opción imposible";
      break;
    case "json-invalido":
      forzarArchivos = { "items/pregunta.json": "{esto no es json" };
      break;
    case "manifest-campo-faltante":
      break;
    case "min-client-version":
      opts = { minClient: "99.0.0" };
      break;
    case "version-futura":
      manifest.schema_version = "2.0.0";
      for (const arr of Object.values(items)) for (const it of arr) it.schema_version = "2.0.0";
      break;
    case "contract-version-futura":
      opts = { contractVersion: "2.0.0" };
      break;
    case "hash-alterado":
    case "firma-alterada":
    case "clave-desconocida":
    case "sin-firma":
    case "downgrade":
      // Mutaciones aplicadas después de firmar (o resueltas por 'instalado_version').
      break;
    default:
      throw new Error(`mutación desconocida: ${mutacion}`);
  }

  const files = archivosDe(manifest, items);
  if (forzarArchivos) Object.assign(files, forzarArchivos);
  const syncManifest = syncManifestDe(manifest, items, files, opts);
  if (mutacion === "manifest-campo-faltante") delete syncManifest.min_client_version;

  const manifestText = JSON.stringify(syncManifest, null, 2);
  files["sync-manifest.json"] = manifestText;
  const signature = firmarManifiesto(manifestText, { keyId, privateKeyB64: kp.privateKeyB64 });
  const truststore = { keys: [{ key_id: keyId, alg: "SHA256withECDSA", demo: true, public_key: kp.publicKeyB64 }] };

  const bundle = { bundle_format: "fvpack/1", sync_manifest: syncManifest, signature, pack_manifest: manifest, files };

  // Mutaciones sobre el bundle ya firmado (integridad/firma).
  switch (mutacion) {
    case "hash-alterado":
      bundle.files["pack.json"] = bundle.files["pack.json"] + " ";
      break;
    case "firma-alterada":
      bundle.signature.sig = "AAAA";
      break;
    case "clave-desconocida":
      bundle.signature.key_id = "clave-desconocida";
      break;
    case "sin-firma":
      bundle.signature = null;
      break;
    default:
      break;
  }

  return { bundle, truststore, keypair: kp };
}

/** Estado instalado de referencia (para casos de downgrade / ya-instalado). */
export function estadoInstalado(version) {
  return { packId: "pack-fv-test", packVersion: version, lastAppliedSequence: 0, files: {}, tombstones: {} };
}

function upsert(ruta, itemsArr) {
  const content = JSON.stringify(itemsArr);
  return { path: ruta, sha256: sha256Hex(content), bytes: Buffer.byteLength(content, "utf8"), content };
}

function deltaBase(extra) {
  return {
    contract_version: "1.0.0",
    pack_id: "pack-fv-test",
    base_version: "1.0.0",
    delta_version: "1.1.0",
    sequence: 1,
    min_client_version: "0.1.0",
    upserts: [],
    tombstones: [],
    ...extra,
  };
}

function preguntaRev2() {
  const p = clon(FIXTURES.mini_pack.items.pregunta[0]);
  p.revision = 2;
  p.enunciado = "¿Para qué sirve el mini-pack de fixtures? (revisión 2)";
  return p;
}

function certificadoRev2() {
  const c = clon(FIXTURES.mini_pack.items.certificado[0]);
  c.revision = 2;
  return c;
}

/**
 * Construye los deltas de un caso de sync-cases.json → delta_cases.
 * @returns {object[]} lista de deltas a aplicar en orden
 */
export function construirDeltas(kind) {
  switch (kind) {
    case "valido":
    case "idempotencia":
      return [
        deltaBase({
          upserts: [upsert("items/pregunta.json", [preguntaRev2()])],
          tombstones: [{ id: "tec:demo-test", tipo: "tecnologia", revision: 2, deleted_at: "2026-11-26", reason: "retirado en revisión demo" }],
        }),
      ];
    case "orden-invalido":
      return [deltaBase({ sequence: 5 })];
    case "base-descuadre":
      return [deltaBase({ base_version: "0.9.0" })];
    case "downgrade":
      return [deltaBase({ delta_version: "1.0.0" })];
    case "tombstone-resurreccion":
      return [
        deltaBase({
          tombstones: [{ id: "qst:demo-test-0001", tipo: "pregunta", revision: 2, deleted_at: "2026-11-26", reason: "retirado en revisión demo" }],
        }),
        deltaBase({
          base_version: "1.1.0",
          delta_version: "1.2.0",
          sequence: 2,
          upserts: [upsert("items/pregunta.json", [clon(FIXTURES.mini_pack.items.pregunta[0])])],
        }),
      ];
    case "hash-malo": {
      const up = upsert("items/pregunta.json", [preguntaRev2()]);
      up.sha256 = "0".repeat(64);
      return [deltaBase({ upserts: [up] })];
    }
    case "min-client":
      return [deltaBase({ min_client_version: "99.0.0" })];
    case "cadena":
      return [
        deltaBase({ upserts: [upsert("items/pregunta.json", [preguntaRev2()])] }),
        deltaBase({ base_version: "1.1.0", delta_version: "1.2.0", sequence: 2, upserts: [upsert("items/certificado.json", [certificadoRev2()])] }),
        deltaBase({
          base_version: "1.2.0",
          delta_version: "1.3.0",
          sequence: 3,
          tombstones: [{ id: "tec:demo-test", tipo: "tecnologia", revision: 2, deleted_at: "2026-11-26", reason: "retirado en revisión demo" }],
        }),
      ];
    default:
      throw new Error(`kind de delta desconocido: ${kind}`);
  }
}

/** Estado instalado completo a partir del mini-pack (para deltas/backup/búsqueda). */
export function estadoMiniPack(isoNow = ISO_NOW) {
  const { bundle, truststore } = construirBundle("ninguna");
  return { estado: estadoDesdeBundle(bundle, isoNow), truststore, bundle };
}

export const SETTINGS_DEMO = {
  language: "es-VE",
  theme_mode: "system",
  dynamic_color: true,
  festivities_enabled: true,
  sober_mode: false,
  festivity_override: "auto",
};

/**
 * Construye un backup a partir del mini-pack instalado, con la mutación indicada.
 * @returns {{ backup: object, texto: string, truststore: object }}
 */
export function construirBackup(mutacion = "ninguna") {
  const { estado, truststore } = estadoMiniPack();
  const backup = crearBackup({
    packs: [{ estado }],
    settings: clon(SETTINGS_DEMO),
    source: "android",
    created: "2026-11-25T10:00:00Z",
    appMinVersion: "0.1.0",
  });

  switch (mutacion) {
    case "ninguna":
      break;
    case "checksum-alterado":
      backup.settings.language = "en";
      break;
    case "formato-futuro":
      backup.format_version = "2.0.0";
      break;
    case "settings-con-nombre":
      backup.settings.name = "Khristyan Hidalgo";
      backup.checksum = sha256Hex(payloadChecksum(backup));
      break;
    case "json-invalido":
      return { backup: null, texto: "esto no es un backup", truststore };
    default:
      throw new Error(`mutación de backup desconocida: ${mutacion}`);
  }
  return { backup, texto: JSON.stringify(backup), truststore };
}
