// F&V — Tests de instalación de bundles (casos de sync-cases.json → bundle_cases).
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarBundle, instalarBundle, estadoVacio, resumenDe } from "../src/installer.mjs";
import { construirBundle, estadoInstalado, FIXTURES, CLIENT_VERSION, ISO_NOW } from "./helpers.mjs";

for (const caso of FIXTURES.bundle_cases) {
  test(`bundle: ${caso.name}`, () => {
    const { bundle, truststore } = construirBundle(caso.mutacion);
    const instalado = caso.instalado_version ? estadoInstalado(caso.instalado_version) : null;
    const r = validarBundle(bundle, {
      truststore,
      clientVersion: CLIENT_VERSION,
      instalado,
      tamanoBytes: caso.tamano_simulado ?? null,
    });

    if (caso.expect === "accept") {
      assert.equal(r.valido, true, `esperaba aceptar y rechazó: ${JSON.stringify(r.errores)}`);
      if (caso.motivo) assert.equal(r.motivo, caso.motivo);
    } else {
      assert.equal(r.valido, false, "esperaba rechazo y fue aceptado");
      const codigos = r.errores.map((e) => e.codigo);
      const alguno = (caso.codes_any ?? []).some((c) => codigos.includes(c));
      assert.ok(alguno, `esperaba alguno de ${JSON.stringify(caso.codes_any)} y llegó ${JSON.stringify(codigos)}`);
      for (const regla of caso.rules_any ?? []) {
        const mensajes = r.errores.map((e) => e.mensaje).join(" | ");
        assert.ok(mensajes.includes(regla), `esperaba la regla ${regla} en: ${mensajes}`);
      }
    }
  });
}

test("instalar un bundle válido produce el estado completo (staging lógico)", () => {
  const { bundle, truststore } = construirBundle("ninguna");
  const r = instalarBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, instalado: null, isoNow: ISO_NOW });
  assert.equal(r.ok, true);
  assert.equal(r.estado.packId, "pack-fv-test");
  assert.equal(r.estado.packVersion, "1.0.0");
  assert.equal(r.estado.lastAppliedSequence, 0);
  assert.ok(r.estado.files["items/tecnologia.json"]);
  assert.ok(r.estado.files["sync-manifest.json"]);
  assert.equal(r.estado.signature.key_id, "test-key");
});

test("instalar sobre la misma versión devuelve 'ya-instalado' sin tocar el estado", () => {
  const { bundle, truststore } = construirBundle("ninguna");
  const instalado = { ...estadoInstalado("1.0.0"), updatedAt: "antes" };
  const r = instalarBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, instalado, isoNow: ISO_NOW });
  assert.equal(r.ok, true);
  assert.equal(r.motivo, "ya-instalado");
  assert.equal(r.estado, instalado);
});

test("un bundle inválido jamás produce estado (nada a medias)", () => {
  const { bundle, truststore } = construirBundle("hash-alterado");
  const r = instalarBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, instalado: null, isoNow: ISO_NOW });
  assert.equal(r.ok, false);
  assert.equal(r.estado, undefined);
});

test("estado vacío: la app declara que no hay pack (sin contenido inventado)", () => {
  const vacio = estadoVacio();
  assert.equal(vacio.packId, null);
  assert.deepEqual(resumenDe(vacio), { instalado: false });
});

test("resumenDe expone versión, tamaño y actualización para Ajustes", () => {
  const { bundle, truststore } = construirBundle("ninguna");
  const r = instalarBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, instalado: null, isoNow: ISO_NOW });
  const resumen = resumenDe(r.estado);
  assert.equal(resumen.instalado, true);
  assert.equal(resumen.packVersion, "1.0.0");
  assert.equal(resumen.itemsTotal, 3);
  assert.ok(resumen.tamanoBytes > 0);
  assert.equal(resumen.updatedAt, ISO_NOW);
  assert.equal(resumen.indices.porId, 3);
  assert.equal(resumen.indices.porTecnologia, 1);
});
