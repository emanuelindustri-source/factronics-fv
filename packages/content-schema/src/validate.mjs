// F&V — Validador de packs de contenido.
//
// Dos capas:
//   1) JSON Schema (draft 2020-12) por tipo de entidad — estructura.
//   2) Reglas semánticas — trazabilidad y coherencia:
//        · SIN source_ref NO SE VALIDA NI SE PUBLICA (rechazo explícito).
//        · IDs estables: formato <prefijo>:<slug>, prefijo coherente con el tipo, únicos.
//        · Referencias entre ítems resueltas y del tipo correcto.
//        · Packs demo: etiqueta DEMO y códigos con prefijo 'DEMO-' (nada real, nada inventado).
//        · Certificados: aviso "programa interno" + "no es una certificación oficial de Videojet".
//
// Todo error lleva una regla identificable para las pruebas: FALTA-PROCEDENCIA,
// SOURCE-REF-INCOMPLETO, ID-*, REFERENCIA-*, DEMO-*, CERTIFICADO-*, PREGUNTA-*.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  SCHEMA_VERSION,
  TIPOS,
  PREFIJOS,
  CAMPOS_REF,
  CAMPOS_SOURCE_REF,
  PREFIJO_CODIGO_DEMO,
  ETIQUETA_DEMO,
} from "./constants.mjs";

const DIR_SCHEMAS = join(dirname(fileURLToPath(import.meta.url)), "..", "schemas");

const REGLAS = {
  FALTA_PROCEDENCIA: "FALTA-PROCEDENCIA",
  SOURCE_INCOMPLETO: "SOURCE-REF-INCOMPLETO",
  SCHEMA: "JSON-SCHEMA",
  ID_FORMATO: "ID-FORMATO",
  ID_TIPO: "ID-TIPO",
  ID_DUPLICADO: "ID-DUPLICADO",
  SCHEMA_VERSION: "SCHEMA-VERSION",
  REFERENCIA: "REFERENCIA-NO-RESUELTA",
  REFERENCIA_TIPO: "REFERENCIA-TIPO",
  SOURCE_AUTO: "SOURCE-REF-AUTO",
  SOURCE_PAGINAS: "SOURCE-REF-PAGINAS",
  COHERENCIA_PAGINA: "COHERENCIA-PAGINA",
  DEMO_ETIQUETA: "DEMO-ETIQUETA",
  DEMO_CODIGO: "DEMO-CODIGO",
  CERTIFICADO_AVISO: "CERTIFICADO-AVISO",
  CERTIFICADO_PROGRAMA: "CERTIFICADO-PROGRAMA",
  PREGUNTA_RESPUESTA: "PREGUNTA-RESPUESTA",
  ARCHIVO_TIPO: "ARCHIVO-TIPO",
};

// ---------------------------------------------------------------------------
// Compilación de esquemas (una sola vez por proceso)
// ---------------------------------------------------------------------------
let ajvCache = null;

function crearAjv() {
  if (ajvCache) return ajvCache;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const archivos = readdirSync(DIR_SCHEMAS).filter((f) => f.endsWith(".schema.json"));
  for (const archivo of archivos) {
    const schema = JSON.parse(readFileSync(join(DIR_SCHEMAS, archivo), "utf8"));
    ajv.addSchema(schema);
  }
  ajvCache = ajv;
  return ajv;
}

function validadorDeTipo(tipo) {
  const ajv = crearAjv();
  const id = `https://factronics-fv.github.io/schemas/content/1.0.0/${tipo}.schema.json`;
  return ajv.getSchema(id);
}

function validadorManifest() {
  const ajv = crearAjv();
  return ajv.getSchema("https://factronics-fv.github.io/schemas/content/1.0.0/pack.schema.json");
}

function mensajeAjv(errores) {
  return (errores ?? [])
    .map((e) => `${e.instancePath || "/"} ${e.message}`.trim())
    .join("; ");
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function sinAcentos(s) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function esIdValido(id) {
  return (
    typeof id === "string" &&
    /^(tec|fam|gen|mod|sis|cmp|prt|err|ink|doc|pag|frag|qst|att|crt):[a-z0-9]+(-[a-z0-9]+)*$/.test(id)
  );
}

// ---------------------------------------------------------------------------
// Validación principal
// ---------------------------------------------------------------------------
/**
 * @param {{ manifest: object, entries: Array<{archivo: string, item: object}> }} pack
 * @returns {{ valido: boolean, errores: Array<{regla:string, id:string, mensaje:string}>, avisos: Array<{regla:string, id:string, mensaje:string}>, stats: object }}
 */
export function validatePack(pack) {
  const errores = [];
  const avisos = [];
  const { manifest, entries } = pack;

  const err = (regla, id, mensaje) => errores.push({ regla, id: id ?? "-", mensaje });
  const aviso = (regla, id, mensaje) => avisos.push({ regla, id: id ?? "-", mensaje });

  // 1) Manifiesto -----------------------------------------------------------
  const vManifest = validadorManifest();
  if (!vManifest(manifest)) {
    err(REGLAS.SCHEMA, "pack.json", `manifiesto inválido: ${mensajeAjv(vManifest.errors)}`);
  }

  const esDemo = manifest?.demo === true;
  if (!esDemo) {
    aviso(
      "PACK-NO-DEMO",
      "pack.json",
      "pack no demo: el contenido real solo se publica en el repo privado con autorización escrita pieza por pieza (ADR-0003)"
    );
  }

  // 2) Ítems: índice y unicidad de IDs -------------------------------------
  const indice = new Map();
  for (const { item } of entries) {
    const id = item?.id;
    if (typeof id !== "string") continue;
    if (indice.has(id)) {
      err(REGLAS.ID_DUPLICADO, id, "ID duplicado dentro del pack (los IDs deben ser únicos y estables)");
    } else {
      indice.set(id, item);
    }
  }

  // 3) Ítems: validación uno a uno ----------------------------------------
  for (const { archivo, item } of entries) {
    const id = typeof item?.id === "string" ? item.id : `(${archivo})`;

    // 3a) Procedencia OBLIGATORIA — rechazo explícito, sin fuente no se valida.
    if (item?.source_ref === undefined || item?.source_ref === null || typeof item.source_ref !== "object") {
      err(
        REGLAS.FALTA_PROCEDENCIA,
        id,
        "SIN FUENTE NO SE PUBLICA: el ítem no tiene source_ref (documento, código oficial, revisión, página, cita textual, confianza, revisor y fecha)"
      );
    } else {
      const faltantes = CAMPOS_SOURCE_REF.filter(
        (c) => item.source_ref[c] === undefined || item.source_ref[c] === null || item.source_ref[c] === ""
      );
      if (faltantes.length > 0) {
        err(
          REGLAS.SOURCE_INCOMPLETO,
          id,
          `source_ref incompleto; faltan campos obligatorios: ${faltantes.join(", ")}`
        );
      }
    }

    // 3b) Tipo conocido y estructura por JSON Schema.
    const tipo = item?.tipo;
    if (!TIPOS.includes(tipo)) {
      err(REGLAS.SCHEMA, id, `tipo desconocido o ausente: ${JSON.stringify(tipo)}`);
      continue;
    }

    const esperado = `${tipo}.json`;
    if (archivo !== `items/${esperado}`) {
      err(REGLAS.ARCHIVO_TIPO, id, `el ítem de tipo '${tipo}' debe vivir en items/${esperado}, pero está en ${archivo}`);
    }

    const validador = validadorDeTipo(tipo);
    if (!validador(item)) {
      err(REGLAS.SCHEMA, id, `estructura inválida (${tipo}): ${mensajeAjv(validador.errors)}`);
    }

    // 3c) ID estable: formato y coherencia prefijo ↔ tipo.
    if (typeof item.id !== "string" || !esIdValido(item.id)) {
      err(REGLAS.ID_FORMATO, id, "ID inválido: se espera '<prefijo>:<slug-kebab-case>'");
    } else {
      const prefijo = item.id.split(":")[0];
      if (PREFIJOS[tipo] !== prefijo) {
        err(REGLAS.ID_TIPO, id, `el prefijo del ID '${prefijo}' no corresponde al tipo '${tipo}' (esperado '${PREFIJOS[tipo]}')`);
      }
    }

    // 3d) Versión de esquema coherente con el manifiesto.
    if (item.schema_version !== manifest?.schema_version) {
      err(
        REGLAS.SCHEMA_VERSION,
        id,
        `schema_version del ítem ('${item.schema_version}') no coincide con la del manifiesto ('${manifest?.schema_version}'); ejecute 'npm run migrate:content'`
      );
    }

    // 3e) Referencias entre ítems (resolución + tipo correcto).
    for (const [campo, tipoEsperado] of Object.entries(CAMPOS_REF)) {
      const valor = item[campo];
      if (valor === undefined || valor === null) continue;
      const refs = Array.isArray(valor) ? valor : [valor];
      for (const ref of refs) {
        const destino = indice.get(ref);
        if (!destino) {
          err(REGLAS.REFERENCIA, id, `la referencia ${campo}='${ref}' no existe en el pack`);
        } else if (tipoEsperado && destino.tipo !== tipoEsperado) {
          err(REGLAS.REFERENCIA_TIPO, id, `la referencia ${campo}='${ref}' apunta a un '${destino.tipo}' y se esperaba un '${tipoEsperado}'`);
        }
      }
    }

    // 3f) source_ref.documento_id: debe resolver y no puede ser autorreferencia.
    const refDoc = item.source_ref?.documento_id;
    if (refDoc !== undefined) {
      const destino = indice.get(refDoc);
      if (!destino) {
        err(REGLAS.REFERENCIA, id, `source_ref.documento_id='${refDoc}' no existe en el pack`);
      } else {
        if (destino.tipo !== "documento") {
          err(REGLAS.REFERENCIA_TIPO, id, `source_ref.documento_id='${refDoc}' apunta a un '${destino.tipo}' y se esperaba un 'documento'`);
        }
        if (refDoc === item.id) {
          err(REGLAS.SOURCE_AUTO, id, "source_ref.documento_id no puede apuntar al propio ítem (autorreferencia de procedencia)");
        }
      }
    }

    // 3g) Rango de páginas de la cita.
    const sr = item.source_ref;
    if (sr && Number.isInteger(sr.pagina) && Number.isInteger(sr.pagina_fin) && sr.pagina_fin < sr.pagina) {
      err(REGLAS.SOURCE_PAGINAS, id, `source_ref.pagina_fin (${sr.pagina_fin}) no puede ser menor que source_ref.pagina (${sr.pagina})`);
    }

    // 3h) Coherencia documento ↔ página en fragmentos.
    if (tipo === "fragmento" && item.pagina_id && indice.has(item.pagina_id)) {
      const pag = indice.get(item.pagina_id);
      if (pag.documento_id !== item.documento_id) {
        err(REGLAS.COHERENCIA_PAGINA, id, `pagina_id='${item.pagina_id}' pertenece al documento '${pag.documento_id}', no a '${item.documento_id}'`);
      }
    }

    // 3i) Reglas de packs demo: nada real, nada inventado, todo etiquetado.
    if (esDemo) {
      const etiquetas = Array.isArray(item.etiquetas) ? item.etiquetas : [];
      if (!etiquetas.includes(ETIQUETA_DEMO)) {
        err(REGLAS.DEMO_ETIQUETA, id, `todo ítem de un pack demo debe llevar la etiqueta '${ETIQUETA_DEMO}'`);
      }
      const codigos = [item.codigo, item.codigo_oficial, sr?.codigo_oficial].filter((c) => typeof c === "string");
      for (const codigo of codigos) {
        if (!PREFIJO_CODIGO_DEMO.test(codigo)) {
          err(
            REGLAS.DEMO_CODIGO,
            id,
            `en packs demo todo código debe empezar por 'DEMO-' (recibido: '${codigo}'); está prohibido inventar o usar códigos reales`
          );
        }
      }
    }

    // 3j) Certificados: programa interno, nunca oficial de Videojet.
    if (tipo === "certificado") {
      const programa = typeof item.programa === "string" ? sinAcentos(item.programa) : "";
      const avisoTxt = typeof item.aviso === "string" ? sinAcentos(item.aviso) : "";
      if (!programa.includes("programa interno")) {
        err(REGLAS.CERTIFICADO_PROGRAMA, id, "el certificado debe declararse como 'programa interno' de Factronics, C.A.");
      }
      if (!avisoTxt.includes("no es una certificacion oficial de videojet")) {
        err(
          REGLAS.CERTIFICADO_AVISO,
          id,
          "el certificado debe incluir el aviso: 'No es una certificación oficial de Videojet Technologies'"
        );
      }
    }

    // 3k) Preguntas: la respuesta debe estar entre las opciones cuando aplica.
    if (tipo === "pregunta" && Array.isArray(item.opciones)) {
      const { tipo_pregunta: tp, respuesta_correcta: rc } = item;
      if (tp === "seleccion_simple" || tp === "verdadero_falso") {
        if (typeof rc !== "string" || !item.opciones.includes(rc)) {
          err(REGLAS.PREGUNTA_RESPUESTA, id, `respuesta_correcta debe ser una de las opciones en '${tp}'`);
        }
      } else if (tp === "seleccion_multiple") {
        const lista = Array.isArray(rc) ? rc : null;
        if (!lista || lista.length === 0 || !lista.every((r) => item.opciones.includes(r))) {
          err(REGLAS.PREGUNTA_RESPUESTA, id, "en seleccion_multiple la respuesta_correcta debe ser un array contenido en las opciones");
        }
      }
    }
  }

  // 4) Estadísticas ---------------------------------------------------------
  const total = entries.length;
  const conFuente = entries.filter((e) => e.item?.source_ref && typeof e.item.source_ref === "object").length;
  const porTipo = {};
  for (const { item } of entries) {
    const t = item?.tipo ?? "desconocido";
    porTipo[t] = (porTipo[t] ?? 0) + 1;
  }
  const stats = {
    total,
    conSourceRef: conFuente,
    sinSourceRef: total - conFuente,
    pctSourceRef: total === 0 ? 0 : Math.round((conFuente / total) * 10000) / 100,
    porTipo,
    schemaVersion: manifest?.schema_version,
    demo: esDemo,
  };

  return { valido: errores.length === 0, errores, avisos, stats };
}
