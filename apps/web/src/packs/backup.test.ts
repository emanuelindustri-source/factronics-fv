// F&V — Tests de backup/export/import (round-trip, corrupción, privacidad).
// Paridad con packages/sync-contracts/test/backup.test.mjs (ADR-0009).
import { describe, it, expect } from "vitest";
import { crearBackup, validarBackup, restablecerBackup } from "./backup";
import { entriesDe } from "./state";
import { construirBackup, estadoMiniPack, SETTINGS_DEMO, CLIENT_VERSION, ISO_NOW, FIXTURES } from "./testkit";
import type { PackState } from "./types";

describe("backups del contrato (fixtures compartidos)", () => {
  for (const caso of FIXTURES.backup_cases) {
    it(`backup: ${caso.name}`, async () => {
      const { backup, texto, truststore } = await construirBackup(caso.mutacion);
      const v = await validarBackup(texto, { clientVersion: CLIENT_VERSION, tamanoBytes: caso.tamano_simulado ?? null });
      if (caso.expect === "accept") {
        expect(v.ok, `esperaba aceptar y rechazó: ${JSON.stringify(v.errores)}`).toBe(true);
        // Round-trip completo sobre almacenamiento limpio.
        const r = await restablecerBackup(texto, { clientVersion: CLIENT_VERSION, truststore, isoNow: ISO_NOW });
        expect(r.ok, `restauración falló: ${JSON.stringify(r.errores)}`).toBe(true);
        expect(r.estados?.length).toBe(1);
        expect(entriesDe(r.estados![0]).length).toBe(3);
        expect(r.settings).toEqual(SETTINGS_DEMO);
        expect(r.sync_state?.[0].pack_id).toBe("pack-fv-test");
        expect(r.sync_state?.[0].last_applied_sequence).toBe(0);
      } else {
        expect(v.ok, "esperaba rechazo y fue aceptado").toBe(false);
        const codigos = v.errores.map((e) => e.codigo);
        const alguno = (caso.codes_any ?? []).some((c) => codigos.includes(c));
        expect(alguno, `esperaba alguno de ${JSON.stringify(caso.codes_any)} y llegó ${JSON.stringify(codigos)}`).toBe(true);
      }
      void backup;
    });
  }
});

it("restaurar conserva el estado de sincronización (idempotencia entre dispositivos)", async () => {
  const { estado, truststore } = await estadoMiniPack();
  const conSecuencia: PackState = { ...estado, lastAppliedSequence: 3, packVersion: "1.3.0" };
  const backup = await crearBackup({
    packs: [{ estado: conSecuencia }],
    settings: { language: "es-VE", theme_mode: "dark" },
    source: "web",
    created: "2026-11-25T10:00:00Z",
    appMinVersion: "0.1.0",
  });
  const r = await restablecerBackup(JSON.stringify(backup), { clientVersion: CLIENT_VERSION, truststore, isoNow: ISO_NOW });
  expect(r.ok, JSON.stringify(r.errores)).toBe(true);
  expect(r.estados?.[0].lastAppliedSequence).toBe(3);
  expect(r.estados?.[0].packVersion).toBe("1.3.0");
});

it("un bit alterado en el payload invalida el checksum (nunca restaura corruptos)", async () => {
  const { texto, truststore } = await construirBackup("ninguna");
  const alterado = texto.replace('"es-VE"', '"es-VX"');
  const r = await restablecerBackup(alterado, { clientVersion: CLIENT_VERSION, truststore, isoNow: ISO_NOW });
  expect(r.ok).toBe(false);
  expect(r.codigo).toBe("RESPALDO-CORRUPTO");
  expect(r.estados).toBeUndefined();
});

it("el backup jamás contiene datos personales (política de privacidad)", async () => {
  const { backup } = await construirBackup("ninguna");
  const clavesSettings = Object.keys(backup!.settings).sort();
  expect(clavesSettings).toEqual(["dynamic_color", "festivities_enabled", "festivity_override", "language", "sober_mode", "theme_mode"]);
  const texto = JSON.stringify(backup);
  expect(texto.includes('"name"'), "el backup no debe incluir nombre").toBe(false);
});
