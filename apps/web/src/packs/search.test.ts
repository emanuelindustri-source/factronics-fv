// F&V — Tests de búsqueda offline e índices (ID / tipo / tecnología).
// Paridad con packages/sync-contracts/test/search.test.mjs (ADR-0009).
import { describe, it, expect } from "vitest";
import { construirIndices, buscar, tecnologiasDe, tamanoBytes, itemsDe } from "./state";
import { estadoMiniPack, FIXTURES } from "./testkit";

it("los índices cubren ID, tipo y tecnología", async () => {
  const { estado } = await estadoMiniPack();
  const idx = construirIndices(estado);
  expect(idx.porId.size).toBe(3);
  expect([...idx.porTipo.keys()].sort()).toEqual(["certificado", "pregunta", "tecnologia"]);
  expect([...idx.porTecnologia.keys()]).toEqual(["tec:demo-test"]);
  expect(idx.porTecnologia.get("tec:demo-test")).toEqual(["qst:demo-test-0001"]);
});

it("tecnologiasDe extrae las referencias tec: del ítem", () => {
  const pregunta = FIXTURES.mini_pack.items.pregunta[0];
  expect(tecnologiasDe(pregunta)).toEqual(["tec:demo-test"]);
  expect(tecnologiasDe(FIXTURES.mini_pack.items.tecnologia[0])).toEqual([]);
});

describe("búsqueda (fixtures compartidos)", () => {
  for (const caso of FIXTURES.search_cases) {
    it(`búsqueda: ${caso.name}`, async () => {
      const { estado } = await estadoMiniPack();
      const r = buscar(estado, caso.query);
      expect(r.map((i) => i.id).sort()).toEqual([...caso.expect_ids].sort());
    });
  }
});

it("la búsqueda funciona sin red (todo el estado es local)", async () => {
  const { estado } = await estadoMiniPack();
  // Sin fetch ni red: el estado ya contiene los archivos del pack.
  const r = buscar(estado, { texto: "demo" });
  expect(r.length).toBeGreaterThanOrEqual(2);
  expect(itemsDe(estado).length).toBe(3);
});

it("el tamaño del pack se calcula para Ajustes", async () => {
  const { estado } = await estadoMiniPack();
  expect(tamanoBytes(estado)).toBeGreaterThan(0);
  expect(tamanoBytes({ files: {} })).toBe(0);
});
