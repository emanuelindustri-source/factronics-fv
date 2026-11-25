// F&V — Tests de aplicación de deltas (orden, idempotencia, tombstones).
import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarDelta } from "../src/delta.mjs";
import { entriesDe } from "../src/state.mjs";
import { construirDeltas, estadoMiniPack, FIXTURES, CLIENT_VERSION, ISO_NOW } from "./helpers.mjs";

function aplicarTodos(estado, deltas) {
  let actual = estado;
  let ultima = null;
  for (const d of deltas) {
    ultima = aplicarDelta(actual, d, { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
    if (!ultima.ok) return { r: ultima, estado: actual };
    actual = ultima.estado;
  }
  return { r: ultima, estado: actual };
}

for (const caso of FIXTURES.delta_cases) {
  test(`delta: ${caso.name}`, () => {
    const { estado } = estadoMiniPack();
    const deltas = construirDeltas(caso.kind);

    if (caso.kind === "idempotencia") {
      const primera = aplicarDelta(estado, deltas[0], { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
      assert.equal(primera.ok, true);
      const segunda = aplicarDelta(primera.estado, deltas[0], { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
      assert.equal(segunda.ok, true);
      assert.equal(segunda.motivo, caso.motivo_segunda);
      assert.equal(segunda.estado.packVersion, caso.expect_version);
      // Mismo estado: mismos ítems y misma secuencia.
      assert.deepEqual(entriesDe(segunda.estado).map((e) => e.item.id).sort(), entriesDe(primera.estado).map((e) => e.item.id).sort());
      assert.equal(segunda.estado.lastAppliedSequence, primera.estado.lastAppliedSequence);
      return;
    }

    const { r, estado: final } = aplicarTodos(estado, deltas);
    if (caso.expect === "accept") {
      assert.equal(r.ok, true, `esperaba aplicar y rechazó: ${JSON.stringify(r.errores)}`);
      if (caso.expect_version) assert.equal(final.packVersion, caso.expect_version);
      if (caso.expect_items !== undefined) assert.equal(entriesDe(final).length, caso.expect_items);
      if (caso.expect_tombstones) {
        for (const id of caso.expect_tombstones) assert.ok(id in final.tombstones, `falta tombstone de ${id}`);
      }
    } else {
      assert.equal(r.ok, false, "esperaba rechazo y fue aplicado");
      const codigos = r.errores.map((e) => e.codigo);
      const alguno = (caso.codes_any ?? []).some((c) => codigos.includes(c));
      assert.ok(alguno, `esperaba alguno de ${JSON.stringify(caso.codes_any)} y llegó ${JSON.stringify(codigos)}`);
    }
  });
}

test("un delta rechazado no modifica el estado (operación pura)", () => {
  const { estado } = estadoMiniPack();
  const [malo] = construirDeltas("orden-invalido");
  const r = aplicarDelta(estado, malo, { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
  assert.equal(r.ok, false);
  assert.equal(r.estado.packVersion, estado.packVersion);
  assert.equal(r.estado.lastAppliedSequence, estado.lastAppliedSequence);
});

test("el tombstone elimina el ítem del archivo pero queda registrado (no resucita)", () => {
  const { estado } = estadoMiniPack();
  const [delta] = construirDeltas("valido");
  const r = aplicarDelta(estado, delta, { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
  assert.equal(r.ok, true);
  const ids = entriesDe(r.estado).map((e) => e.item.id).sort();
  assert.deepEqual(ids, ["crt:demo-test", "qst:demo-test-0001"]);
  assert.ok("tec:demo-test" in r.estado.tombstones);
  assert.equal(entriesDe({ ...r.estado, tombstones: {} }).length, 2);
});
