// F&V — Reglas semánticas de contenido en el cliente (paridad con el validador de F1.1).
//
// El validador completo de F1.1 (ajv + reglas) vive en packages/content-schema y es
// obligatorio en CI y en la herramienta de empaquetado. Las apps necesitan validar
// TAMBIÉN al instalar/importar sin red, así que este módulo implementa las mismas
// reglas semánticas con los MISMOS nombres de regla. La paridad se prueba con los
// fixtures compartidos de packages/shared-fixtures/sync/validation-cases.json en
// JavaScript, TypeScript (PWA) y Kotlin (Android). Ver ADR-0009.

import {
  PREFIJOS,
  CAMPOS_SOURCE_REF,
  REGLAS,
  PREFIJO_CODIGO_DEMO,
  ETIQUETA_DEMO,
  CONTENT_SCHEMA_VERSION,
} from "./constants.mjs";

const RE_ID = /^(tec|fam|gen|mod|sis|cmp|prt|err|ink|doc|pag|frag|qst|att|crt):[a-z0-9]+(-[a-z0-9]+)*$/;

function sinAcentos(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Valida las reglas semánticas de F1.1 sobre los ítems de un pack.
 * @param {{ demo: boolean, schema_version: string }} manifest manifiesto pack.json
 * @param {Array<{ archivo: string, item: object }>} entries
 * @returns {{ valido: boolean, errores: Array<{regla: string, id: string, mensaje: string}> }}
 */
export function validarContenido(manifest, entries) {
  const errores = [];
  const err = (regla, id, mensaje) => errores.push({ regla, id: id ?? "-", mensaje });
  const esDemo = manifest?.demo === true;

  // Índice y unicidad de IDs.
  const indice = new Map();
  for (const { item } of entries) {
    const id = item?.id;
    if (typeof id !== "string") continue;
    if (indice.has(id)) {
      err(REGLAS.ID_DUPLICADO, id, "ID duplicado dentro del pack");
    } else {
      indice.set(id, item);
    }
  }

  for (const { archivo, item } of entries) {
    const id = typeof item?.id === "string" ? item.id : `(${archivo})`;

    // Procedencia obligatoria: SIN FUENTE NO SE PUBLICA.
    if (item?.source_ref === undefined || item?.source_ref === null || typeof item.source_ref !== "object") {
      err(REGLAS.FALTA_PROCEDENCIA, id, "SIN FUENTE NO SE PUBLICA: el ítem no tiene source_ref");
    } else {
      const faltantes = CAMPOS_SOURCE_REF.filter(
        (c) => item.source_ref[c] === undefined || item.source_ref[c] === null || item.source_ref[c] === ""
      );
      if (faltantes.length > 0) {
        err(REGLAS.SOURCE_INCOMPLETO, id, `source_ref incompleto; faltan: ${faltantes.join(", ")}`);
      }
    }

    // Tipo conocido y coherencia tipo ↔ archivo.
    const tipo = item?.tipo;
    if (typeof tipo !== "string" || !(tipo in PREFIJOS)) {
      err(REGLAS.ARCHIVO_TIPO, id, `tipo desconocido o ausente: ${JSON.stringify(tipo)}`);
      continue;
    }
    const esperado = `items/${tipo}.json`;
    if (archivo !== esperado) {
      err(REGLAS.ARCHIVO_TIPO, id, `el ítem de tipo '${tipo}' debe vivir en ${esperado}, pero está en ${archivo}`);
    }

    // ID estable: formato y coherencia prefijo ↔ tipo.
    if (typeof item.id !== "string" || !RE_ID.test(item.id)) {
      err(REGLAS.ID_FORMATO, id, "ID inválido: se espera '<prefijo>:<slug-kebab-case>'");
    } else {
      const prefijo = item.id.split(":")[0];
      if (PREFIJOS[tipo] !== prefijo) {
        err(REGLAS.ID_TIPO, id, `el prefijo '${prefijo}' no corresponde al tipo '${tipo}' (esperado '${PREFIJOS[tipo]}')`);
      }
    }

    // Versión de esquema coherente con el manifiesto.
    if (item.schema_version !== manifest?.schema_version) {
      err(
        REGLAS.SCHEMA_VERSION,
        id,
        `schema_version del ítem ('${item.schema_version}') no coincide con la del manifiesto ('${manifest?.schema_version}')`
      );
    }

    // Rango de páginas de la cita.
    const sr = item.source_ref;
    if (sr && Number.isInteger(sr.pagina) && Number.isInteger(sr.pagina_fin) && sr.pagina_fin < sr.pagina) {
      err(REGLAS.SOURCE_INCOMPLETO, id, `source_ref.pagina_fin (${sr.pagina_fin}) < source_ref.pagina (${sr.pagina})`);
    }

    // Reglas demo: etiqueta y códigos DEMO- (nada real, nada inventado).
    if (esDemo) {
      const etiquetas = Array.isArray(item.etiquetas) ? item.etiquetas : [];
      if (!etiquetas.includes(ETIQUETA_DEMO)) {
        err(REGLAS.DEMO_ETIQUETA, id, `todo ítem de un pack demo debe llevar la etiqueta '${ETIQUETA_DEMO}'`);
      }
      const codigos = [item.codigo, item.codigo_oficial, sr?.codigo_oficial].filter((c) => typeof c === "string");
      for (const codigo of codigos) {
        if (!PREFIJO_CODIGO_DEMO.test(codigo)) {
          err(REGLAS.DEMO_CODIGO, id, `en packs demo todo código debe empezar por 'DEMO-' (recibido: '${codigo}')`);
        }
      }
    }

    // Certificados: programa interno, nunca oficial de Videojet.
    if (tipo === "certificado") {
      const programa = typeof item.programa === "string" ? sinAcentos(item.programa) : "";
      const avisoTxt = typeof item.aviso === "string" ? sinAcentos(item.aviso) : "";
      if (!programa.includes("programa interno")) {
        err(REGLAS.CERTIFICADO_PROGRAMA, id, "el certificado debe declararse como 'programa interno' de Factronics, C.A.");
      }
      if (!avisoTxt.includes("no es una certificacion oficial de videojet")) {
        err(REGLAS.CERTIFICADO_AVISO, id, "el certificado debe incluir el aviso 'No es una certificación oficial de Videojet Technologies'");
      }
    }

    // Preguntas: la respuesta debe estar entre las opciones cuando aplica.
    if (tipo === "pregunta" && Array.isArray(item.opciones)) {
      const tp = item.tipo_pregunta;
      const rc = item.respuesta_correcta;
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

  // El schema_version del manifiesto debe ser el soportado por esta app.
  if (manifest?.schema_version !== CONTENT_SCHEMA_VERSION) {
    err(REGLAS.SCHEMA_VERSION, "pack.json", `schema_version '${manifest?.schema_version}' no soportada (esperada '${CONTENT_SCHEMA_VERSION}')`);
  }

  return { valido: errores.length === 0, errores };
}
