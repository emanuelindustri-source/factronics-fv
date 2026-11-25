// F&V — Tests de backup/export/import (round-trip, corrupción, privacidad).
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearBackup, validarBackup, restablecerBackup } from "../src/backup.mjs";
import { entriesDe } from "../src/state.mjs";
import { construirBackup, estadoMiniPack, SETTINGS_DEMO, CLIENT_VERSION, ISO_NOW, FIXTURES } from "./helpers.mjs";

for (const caso of FIXTURES.backup_cases) {
  test(`backup: ${caso.name}`, () => {
    const { backup, texto, truststore } = construirBackup(caso.mutacion);
    const v = validarBackup(texto, { clientVersion: CLIENT_VERSION, tamanoBytes: caso.tamano_simulado ?? null });
    if (caso.expect === "accept") {
      assert.equal(v.ok, true, `esperaba aceptar y rechazó: ${JSON.stringify(v.errores)}`);
      // Round-trip completo sobre almacenamiento limpio.
      const r = restablecerBackup(texto, { clientVersion: CLIENT_VERSION, truststore, isoNow: ISO_NOW });
      assert.equal(r.ok, true, `restauración falló: ${JSON.stringify(r.errores)}`);
      assert.equal(r.estados.length, 1);
      assert.equal(entriesDe(r.estados[0]).length, 3);
      assert.deepEqual(r.settings, SETTINGS_DEMO);
      assert.equal(r.sync_state[0].pack_id, "pack-fv-test");
      assert.equal(r.sync_state[0].last_applied_sequence, 0);
    } else {
      assert.equal(v.ok, false, "esperaba rechazo y fue aceptado");
      const codigos = v.errores.map((e) => e.codigo);
      const alguno = (caso.codes_any ?? []).some((c) => codigos.includes(c));
      assert.ok(alguno, `esperaba alguno de ${JSON.stringify(caso.codes_any)} y llegó ${JSON.stringify(codigos)}`);
    }
  });
}

test("restaurar conserva el estado de sincronización (idempotencia entre dispositivos)", () => {
  const { estado, truststore } = estadoMiniPack();
  const conSecuencia = { ...estado, lastAppliedSequence: 3, packVersion: "1.3.0" };
  const backup = crearBackup({
    packs: [{ estado: conSecuencia }],
    settings: { language: "es-VE", theme_mode: "dark" },
    source: "web",
    created: "2026-11-25T10:00:00Z",
    appMinVersion: "0.1.0",
  });
  const r = restablecerBackup(JSON.stringify(backup), { clientVersion: CLIENT_VERSION, truststore, isoNow: ISO_NOW });
  assert.equal(r.ok, true, JSON.stringify(r.errores));
  assert.equal(r.estados[0].lastAppliedSequence, 3);
  assert.equal(r.estados[0].packVersion, "1.3.0");
});

test("un bit alterado en el payload invalida el checksum (nunca restaura corruptos)", () => {
  const { texto, truststore } = construirBackup("ninguna");
  const alterado = texto.replace('"es-VE"', '"es-VX"');
  const r = restablecerBackup(alterado, { clientVersion: CLIENT_VERSION, truststore, isoNow: ISO_NOW });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, "RESPALDO-CORRUPTO");
  assert.equal(r.estados, undefined);
});

test("el backup jamás contiene datos personales (política de privacidad)", () => {
  const { backup } = construirBackup("ninguna");
  const clavesSettings = Object.keys(backup.settings).sort();
  assert.deepEqual(clavesSettings, ["dynamic_color", "festivities_enabled", "festivity_override", "language", "sober_mode", "theme_mode"]);
  const texto = JSON.stringify(backup);
  assert.ok(!texto.includes('"name"'), "el backup no debe incluir nombre");
});
