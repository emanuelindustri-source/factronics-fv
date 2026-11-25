// F&V — Tests del bundle .fvpack del pack demo (integridad, firma y deriva).
//
// El bundle es la unidad de instalación de las apps (Android/PWA). Estos tests
// comprueban que el bundle commiteado:
//   1. pasa la validación completa del contrato (hashes + firma DEMO + contenido);
//   2. no tiene deriva respecto al pack fuente (pack.json + items/*.json);
//   3. su truststore contiene solo la clave pública DEMO (jamás la privada).
//
// La clave privada DEMO vive en _private/ (fuera de git) y NO se necesita aquí:
// la firma se VERIFICA, no se regenera.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validarBundle,
  instalarBundle,
  estadoDesdeBundle,
  resumenDe,
  buscar,
  sha256Hex,
  verificarManifiesto,
} from "@factronics-fv/sync-contracts";

const DIR_PACK = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_BUNDLE = join(DIR_PACK, "bundle");

const bundle = JSON.parse(readFileSync(join(DIR_BUNDLE, "pack-fv-demo.fvpack"), "utf8"));
const truststore = JSON.parse(readFileSync(join(DIR_BUNDLE, "truststore.json"), "utf8"));

test("el bundle del pack demo pasa la validación completa del contrato", () => {
  const r = validarBundle(bundle, { truststore, clientVersion: "0.5.0", instalado: null });
  assert.equal(r.valido, true, JSON.stringify(r.errores));
});

test("la firma del bundle verifica con el truststore DEMO", () => {
  const manifestText = bundle.files["sync-manifest.json"];
  const r = verificarManifiesto(manifestText, bundle.signature, truststore);
  assert.deepEqual(r, { ok: true });
});

test("el truststore DEMO solo contiene la clave pública (nunca secretos en el repo)", () => {
  for (const k of truststore.keys) {
    assert.equal(k.demo, true, "la clave debe estar etiquetada como DEMO");
    assert.ok(k.public_key.length > 0);
    assert.equal(k.private_key, undefined, "PROHIBIDO: la clave privada jamás se publica");
  }
  const texto = JSON.stringify(truststore);
  assert.ok(!texto.includes("privateKey") && !texto.includes("private_key"));
});

test("sin deriva: el bundle coincide byte a byte con el pack fuente", () => {
  // pack.json + items/*.json regenerados desde la fuente deben coincidir con los
  // archivos del bundle, y los hashes del sync-manifest deben ser los calculados.
  const fuente = { "pack.json": readFileSync(join(DIR_PACK, "pack.json"), "utf8") };
  for (const f of readdirSync(join(DIR_PACK, "items")).sort()) {
    if (f.endsWith(".json")) fuente[`items/${f}`] = readFileSync(join(DIR_PACK, "items", f), "utf8");
  }
  for (const [path, content] of Object.entries(fuente)) {
    assert.equal(bundle.files[path], content, `archivo con deriva: ${path}`);
    const declarado = bundle.sync_manifest.files.find((x) => x.path === path);
    assert.ok(declarado, `falta ${path} en sync-manifest`);
    assert.equal(declarado.sha256, sha256Hex(content), `hash con deriva en ${path}`);
    assert.equal(declarado.bytes, Buffer.byteLength(content, "utf8"));
  }
});

test("instalación del bundle demo: 25 ítems, todos con fuente, índices construidos", () => {
  const r = instalarBundle(bundle, { truststore, clientVersion: "0.5.0", instalado: null, isoNow: "2026-11-25T12:00:00Z" });
  assert.equal(r.ok, true);
  const resumen = resumenDe(r.estado);
  assert.equal(resumen.instalado, true);
  assert.equal(resumen.packId, "pack-fv-demo");
  assert.equal(resumen.itemsTotal, 25);
  assert.equal(resumen.demo, true);
  assert.ok(resumen.tamanoBytes > 0);
});

test("búsqueda offline sobre el pack demo instalado", () => {
  const estado = estadoDesdeBundle(bundle, "2026-11-25T12:00:00Z");
  // Por tipo (índice): existen preguntas y tecnologías en el pack demo.
  const preguntas = buscar(estado, { tipo: "pregunta" });
  assert.equal(preguntas.length, 3);
  // Por texto libre sin red: los ítems demo contienen 'DEMO-'.
  const demo = buscar(estado, { texto: "DEMO-DOC" });
  assert.ok(demo.length > 0);
  // Estado vacío consistente: sin pack no hay resultados (la app muestra estado vacío).
  assert.deepEqual(buscar(estado, { texto: "zzz-que-no-existe" }), []);
});
