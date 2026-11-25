// F&V — Test del pack demo: demuestra el gate de la Fase 1.1 como prueba ejecutable.
//   · el pack valida sin errores
//   · 100 % de ítems con source_ref completo y revisor
//   · 0 ítems sin fuente
//   · todos los códigos son inequívocamente DEMO (nada real, nada inventado)

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadPack, validatePack } from "@factronics-fv/content-schema";

const PACK_DIR = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

describe("pack demo F&V (gate de F1.1)", () => {
  const pack = loadPack(PACK_DIR);

  test("el pack demo valida sin errores", () => {
    const r = validatePack(pack);
    assert.equal(r.valido, true, `errores: ${JSON.stringify(r.errores, null, 2)}`);
  });

  test("100 % de ítems con source_ref completo; 0 sin fuente", () => {
    const r = validatePack(pack);
    assert.equal(r.stats.total > 0, true);
    assert.equal(r.stats.sinSourceRef, 0);
    assert.equal(r.stats.pctSourceRef, 100);
  });

  test("todo source_ref tiene revisor y fecha de revisión", () => {
    for (const { item } of pack.entries) {
      assert.ok(item.source_ref.revisor?.length >= 3, `ítem ${item.id} sin revisor`);
      assert.match(item.source_ref.fecha_revision, /^\d{4}-\d{2}-\d{2}$/, `ítem ${item.id} sin fecha de revisión`);
    }
  });

  test("todo código del pack es inequívocamente DEMO", () => {
    const codigoDEMO = /^DEMO[-_]/i;
    for (const { item } of pack.entries) {
      for (const campo of ["codigo", "codigo_oficial"]) {
        if (typeof item[campo] === "string") {
          assert.match(item[campo], codigoDEMO, `ítem ${item.id}: ${campo}='${item[campo]}' no es DEMO`);
        }
      }
      assert.match(item.source_ref.codigo_oficial, codigoDEMO, `ítem ${item.id}: source_ref no es DEMO`);
    }
  });

  test("todos los ítems están etiquetados DEMO y el manifiesto declara demo=true", () => {
    assert.equal(pack.manifest.demo, true);
    for (const { item } of pack.entries) {
      assert.ok(item.etiquetas.includes("DEMO"), `ítem ${item.id} sin etiqueta DEMO`);
    }
  });

  test("el pack cubre los 15 tipos de entidad del dominio", () => {
    const r = validatePack(pack);
    for (const tipo of [
      "tecnologia", "familia", "generacion", "modelo", "sistema", "componente",
      "numero_parte", "codigo_error", "tinta", "documento", "pagina", "fragmento",
      "pregunta", "intento", "certificado",
    ]) {
      assert.ok((r.stats.porTipo[tipo] ?? 0) > 0, `falta cobertura del tipo '${tipo}'`);
    }
  });
});
