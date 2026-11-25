// F&V — Tests de aplicación de deltas (orden, idempotencia, tombstones).
// Paridad con packages/sync-contracts/test/delta.test.mjs (ADR-0009).
import { describe, it, expect } from "vitest";
import { aplicarDelta, type ResultadoDelta } from "./delta";
import { entriesDe } from "./state";
import { construirDeltas, estadoMiniPack, FIXTURES, CLIENT_VERSION, ISO_NOW } from "./testkit";
import type { DeltaDoc, PackState } from "./types";

async function aplicarTodos(estado: PackState, deltas: DeltaDoc[]): Promise<{ r: ResultadoDelta; estado: PackState }> {
  let actual = estado;
  let ultima: ResultadoDelta | null = null;
  for (const d of deltas) {
    ultima = await aplicarDelta(actual, d, { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
    if (!ultima.ok) return { r: ultima, estado: actual };
    actual = ultima.estado as PackState;
  }
  return { r: ultima as ResultadoDelta, estado: actual };
}

describe("deltas del contrato (fixtures compartidos)", () => {
  for (const caso of FIXTURES.delta_cases) {
    it(`delta: ${caso.name}`, async () => {
      const { estado } = await estadoMiniPack();
      const deltas = await construirDeltas(caso.kind);

      if (caso.kind === "idempotencia") {
        const primera = await aplicarDelta(estado, deltas[0], { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
        expect(primera.ok).toBe(true);
        const segunda = await aplicarDelta(primera.estado as PackState, deltas[0], { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
        expect(segunda.ok).toBe(true);
        expect(segunda.motivo).toBe(caso.motivo_segunda);
        expect(segunda.estado?.packVersion).toBe(caso.expect_version);
        // Mismo estado: mismos ítems y misma secuencia.
        expect(entriesDe(segunda.estado as PackState).map((e) => e.item.id).sort()).toEqual(
          entriesDe(primera.estado as PackState).map((e) => e.item.id).sort(),
        );
        expect(segunda.estado?.lastAppliedSequence).toBe(primera.estado?.lastAppliedSequence);
        return;
      }

      const { r, estado: final } = await aplicarTodos(estado, deltas);
      if (caso.expect === "accept") {
        expect(r.ok, `esperaba aplicar y rechazó: ${JSON.stringify(r.errores)}`).toBe(true);
        if (caso.expect_version) expect(final.packVersion).toBe(caso.expect_version);
        if (caso.expect_items !== undefined) expect(entriesDe(final).length).toBe(caso.expect_items);
        if (caso.expect_tombstones) {
          for (const id of caso.expect_tombstones) expect(id in final.tombstones, `falta tombstone de ${id}`).toBe(true);
        }
      } else {
        expect(r.ok, "esperaba rechazo y fue aplicado").toBe(false);
        const codigos = r.errores.map((e) => e.codigo);
        const alguno = (caso.codes_any ?? []).some((c) => codigos.includes(c));
        expect(alguno, `esperaba alguno de ${JSON.stringify(caso.codes_any)} y llegó ${JSON.stringify(codigos)}`).toBe(true);
      }
    });
  }
});

it("un delta rechazado no modifica el estado (operación pura)", async () => {
  const { estado } = await estadoMiniPack();
  const [malo] = await construirDeltas("orden-invalido");
  const r = await aplicarDelta(estado, malo, { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
  expect(r.ok).toBe(false);
  expect(r.estado?.packVersion).toBe(estado.packVersion);
  expect(r.estado?.lastAppliedSequence).toBe(estado.lastAppliedSequence);
});

it("el tombstone elimina el ítem del archivo pero queda registrado (no resucita)", async () => {
  const { estado } = await estadoMiniPack();
  const [delta] = await construirDeltas("valido");
  const r = await aplicarDelta(estado, delta, { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
  expect(r.ok).toBe(true);
  const tras = r.estado as PackState;
  const ids = entriesDe(tras).map((e) => e.item.id).sort();
  expect(ids).toEqual(["crt:demo-test", "qst:demo-test-0001"]);
  expect("tec:demo-test" in tras.tombstones).toBe(true);
  expect(entriesDe({ ...tras, tombstones: {} }).length).toBe(2);
});
