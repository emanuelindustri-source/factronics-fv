// F&V — Tests del validador de contenido (casos positivos y negativos).
// Ejecutar: npm test --workspace=@factronics-fv/content-schema

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validatePack } from "../src/validate.mjs";
import { loadPack } from "../src/load.mjs";

const FIXTURES = fileURLToPath(new URL("../../shared-fixtures/content/", import.meta.url));
const PACK_DEMO = fileURLToPath(new URL("../../content-packs-demo/", import.meta.url));

function fixture(ruta) {
  return JSON.parse(readFileSync(`${FIXTURES}${ruta}`, "utf8"));
}

function clon(obj) {
  return structuredClone(obj);
}

/** Arma un pack de prueba con manifiesto demo e ítems dados. */
function packDemo(entriesExtra = []) {
  const manifest = clon(fixture("manifestos/pack-demo-valido.json"));
  const entries = entriesExtra.map((item) => ({
    archivo: `items/${item.tipo}.json`,
    item,
  }));
  return { manifest, entries };
}

function reglasDe(resultado) {
  return resultado.errores.map((e) => e.regla);
}

// ---------------------------------------------------------------------------
// Casos de control (positivos)
// ---------------------------------------------------------------------------
describe("casos de control (ítems válidos)", () => {
  test("un ítem con source_ref completo y etiqueta DEMO valida sin errores", () => {
    const r = validatePack(packDemo([clon(fixture("validos/tecnologia-demo.json"))]));
    assert.equal(r.valido, true, `errores inesperados: ${JSON.stringify(r.errores)}`);
    assert.equal(r.stats.sinSourceRef, 0);
  });

  test("pregunta válida con respuesta dentro de las opciones", () => {
    const r = validatePack(packDemo([clon(fixture("validos/pregunta-demo.json"))]));
    assert.equal(r.valido, true, `errores inesperados: ${JSON.stringify(r.errores)}`);
  });

  test("referencias resueltas: documento citado por source_ref.documento_id", () => {
    const doc = clon(fixture("validos/documento-demo.json"));
    const tec = clon(fixture("validos/tecnologia-demo.json"));
    tec.source_ref.documento_id = "doc:demo-origen";
    const r = validatePack(packDemo([doc, tec]));
    assert.equal(r.valido, true, `errores inesperados: ${JSON.stringify(r.errores)}`);
  });
});

// ---------------------------------------------------------------------------
// LA REGLA REINA: sin fuente no se valida ni se publica
// ---------------------------------------------------------------------------
describe("procedencia obligatoria (source_ref)", () => {
  test("un ítem SIN source_ref se rechaza explícitamente (sin fuente no se publica)", () => {
    const r = validatePack(packDemo([clon(fixture("invalidos/item-sin-source-ref.json"))]));
    assert.equal(r.valido, false, "el validador DEBE rechazar datos sin source_ref");
    assert.ok(
      reglasDe(r).includes("FALTA-PROCEDENCIA"),
      `esperaba la regla FALTA-PROCEDENCIA, hubo: ${JSON.stringify(r.errores)}`
    );
    const error = r.errores.find((e) => e.regla === "FALTA-PROCEDENCIA");
    assert.match(error.mensaje, /SIN FUENTE NO SE PUBLICA/);
  });

  test("source_ref sin revisor se rechaza (procedencia incompleta)", () => {
    const r = validatePack(packDemo([clon(fixture("invalidos/item-source-ref-sin-revisor.json"))]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("SOURCE-REF-INCOMPLETO"));
    assert.ok(r.errores.some((e) => e.mensaje.includes("revisor")));
  });

  test("source_ref sin cita_textual se rechaza (procedencia incompleta)", () => {
    const r = validatePack(packDemo([clon(fixture("invalidos/item-source-ref-sin-cita.json"))]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("SOURCE-REF-INCOMPLETO"));
    assert.ok(r.errores.some((e) => e.mensaje.includes("cita_textual")));
  });

  test("source_ref.documento_id no puede ser autorreferencia", () => {
    const doc = clon(fixture("validos/documento-demo.json"));
    doc.source_ref.documento_id = "doc:demo-origen"; // apunta a sí mismo
    const r = validatePack(packDemo([doc]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("SOURCE-REF-AUTO"));
  });

  test("source_ref con pagina_fin menor que pagina se rechaza", () => {
    const tec = clon(fixture("validos/tecnologia-demo.json"));
    tec.source_ref.pagina = 5;
    tec.source_ref.pagina_fin = 2;
    const r = validatePack(packDemo([tec]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("SOURCE-REF-PAGINAS"));
  });
});

// ---------------------------------------------------------------------------
// IDs estables
// ---------------------------------------------------------------------------
describe("IDs estables", () => {
  test("ID malformado se rechaza", () => {
    const r = validatePack(packDemo([clon(fixture("invalidos/item-id-invalido.json"))]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("ID-FORMATO"));
  });

  test("prefijo del ID incoherente con el tipo se rechaza", () => {
    const r = validatePack(packDemo([clon(fixture("invalidos/item-id-tipo-incoherente.json"))]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("ID-TIPO"));
  });

  test("ID duplicado se rechaza", () => {
    const a = clon(fixture("validos/tecnologia-demo.json"));
    const b = clon(fixture("validos/tecnologia-demo.json"));
    b.nombre = "Copia con el mismo ID";
    const r = validatePack(packDemo([a, b]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("ID-DUPLICADO"));
  });
});

// ---------------------------------------------------------------------------
// Referencias entre ítems
// ---------------------------------------------------------------------------
describe("referencias entre ítems", () => {
  test("referencia rota (el destino no existe) se rechaza", () => {
    const tec = clon(fixture("validos/tecnologia-demo.json"));
    tec.source_ref.documento_id = "doc:no-existe";
    const r = validatePack(packDemo([tec]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("REFERENCIA-NO-RESUELTA"));
  });

  test("referencia al tipo equivocado se rechaza", () => {
    const tec = clon(fixture("validos/tecnologia-demo.json"));
    const otro = clon(fixture("validos/tecnologia-demo.json"));
    otro.id = "doc:demo-otro"; // es otra tecnologia con id de documento
    tec.source_ref.documento_id = "doc:demo-otro";
    const r = validatePack(packDemo([tec, otro]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("REFERENCIA-TIPO"));
  });
});

// ---------------------------------------------------------------------------
// Reglas de packs demo: nada real, nada inventado
// ---------------------------------------------------------------------------
describe("reglas de packs demo", () => {
  test("ítem sin etiqueta DEMO en pack demo se rechaza", () => {
    const r = validatePack(packDemo([clon(fixture("invalidos/item-sin-etiqueta-demo.json"))]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("DEMO-ETIQUETA"));
  });

  test("código sin prefijo DEMO- en pack demo se rechaza", () => {
    const r = validatePack(packDemo([clon(fixture("invalidos/item-codigo-no-demo.json"))]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("DEMO-CODIGO"));
  });

  test("el código 'DEMO-...' si se acepta", () => {
    const item = clon(fixture("invalidos/item-codigo-no-demo.json"));
    item.codigo = "DEMO-ERR-01";
    const r = validatePack(packDemo([item]));
    assert.equal(r.valido, true, `errores inesperados: ${JSON.stringify(r.errores)}`);
  });
});

// ---------------------------------------------------------------------------
// Preguntas y certificados
// ---------------------------------------------------------------------------
describe("preguntas y certificados", () => {
  test("respuesta fuera de las opciones se rechaza", () => {
    const r = validatePack(packDemo([clon(fixture("invalidos/pregunta-respuesta-fuera.json"))]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("PREGUNTA-RESPUESTA"));
  });

  test("certificado sin el aviso obligatorio se rechaza", () => {
    const r = validatePack(packDemo([clon(fixture("invalidos/certificado-sin-aviso.json"))]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("CERTIFICADO-AVISO"));
  });

  test("certificado que se declara oficial se rechaza", () => {
    const crt = clon(fixture("invalidos/certificado-sin-aviso.json"));
    crt.aviso = "No es una certificación oficial de Videojet Technologies.";
    crt.programa = "Certificación oficial de Videojet Technologies";
    const r = validatePack(packDemo([crt]));
    assert.equal(r.valido, false);
    assert.ok(reglasDe(r).includes("CERTIFICADO-PROGRAMA"));
  });
});

// ---------------------------------------------------------------------------
// Integración: el pack demo real del repositorio
// ---------------------------------------------------------------------------
describe("pack demo del repositorio (integración)", () => {
  const pack = loadPack(PACK_DEMO);

  test("el pack demo completo valida sin errores", () => {
    const r = validatePack(pack);
    assert.equal(r.valido, true, `errores: ${JSON.stringify(r.errores, null, 2)}`);
  });

  test("el 100% de los ítems tiene source_ref completo y revisor", () => {
    const r = validatePack(pack);
    assert.equal(r.stats.sinSourceRef, 0);
    assert.equal(r.stats.pctSourceRef, 100);
    for (const { item } of pack.entries) {
      assert.ok(item.source_ref.revisor?.length > 0, `ítem ${item.id} sin revisor`);
    }
  });

  test("todos los ítems del pack demo están etiquetados como DEMO", () => {
    for (const { item } of pack.entries) {
      assert.ok(item.etiquetas.includes("DEMO"), `ítem ${item.id} sin etiqueta DEMO`);
    }
  });

  test("el manifiesto del pack demo declara demo=true", () => {
    assert.equal(pack.manifest.demo, true);
  });
});
