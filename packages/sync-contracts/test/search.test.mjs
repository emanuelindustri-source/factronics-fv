// F&V — Tests de búsqueda offline e índices (ID / tipo / tecnología).
import { test } from "node:test";
import assert from "node:assert/strict";
import { construirIndices, buscar, tecnologiasDe, tamanoBytes, itemsDe } from "../src/state.mjs";
import { estadoMiniPack, FIXTURES } from "./helpers.mjs";

test("los índices cubren ID, tipo y tecnología", () => {
  const { estado } = estadoMiniPack();
  const idx = construirIndices(estado);
  assert.equal(idx.porId.size, 3);
  assert.deepEqual([...idx.porTipo.keys()].sort(), ["certificado", "pregunta", "tecnologia"]);
  assert.deepEqual([...idx.porTecnologia.keys()], ["tec:demo-test"]);
  assert.deepEqual(idx.porTecnologia.get("tec:demo-test"), ["qst:demo-test-0001"]);
});

test("tecnologiasDe extrae las referencias tec: del ítem", () => {
  const pregunta = FIXTURES.mini_pack.items.pregunta[0];
  assert.deepEqual(tecnologiasDe(pregunta), ["tec:demo-test"]);
  assert.deepEqual(tecnologiasDe(FIXTURES.mini_pack.items.tecnologia[0]), []);
});

for (const caso of FIXTURES.search_cases) {
  test(`búsqueda: ${caso.name}`, () => {
    const { estado } = estadoMiniPack();
    const r = buscar(estado, caso.query);
    assert.deepEqual(r.map((i) => i.id).sort(), [...caso.expect_ids].sort());
  });
}

test("la búsqueda funciona sin red (todo el estado es local)", () => {
  const { estado } = estadoMiniPack();
  // Sin fetch ni red: el estado ya contiene los archivos del pack.
  const r = buscar(estado, { texto: "demo" });
  assert.ok(r.length >= 2);
  assert.ok(itemsDe(estado).length === 3);
});

test("el tamaño del pack se calcula para Ajustes", () => {
  const { estado } = estadoMiniPack();
  assert.ok(tamanoBytes(estado) > 0);
  assert.equal(tamanoBytes({ files: {} }), 0);
});
