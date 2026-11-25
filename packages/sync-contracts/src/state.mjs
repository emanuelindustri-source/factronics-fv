// F&V — Estado local de un pack instalado: índices de búsqueda y consulta offline.
//
// El estado es una estructura plana compartida por Android (almacén de archivos) y
// PWA (Dexie): lo que persiste cada plataforma son sus campos; los índices se
// reconstruyen al abrir. Los algoritmos de índice y búsqueda de este módulo son la
// referencia paritaria (fixtures compartidos, ver ADR-0009).

import { PREFIJOS } from "./constants.mjs";

const CAMPOS_REF = {
  tecnologia_id: "tecnologia",
  familia_id: "familia",
  generacion_id: "generacion",
  sistema_id: "sistema",
  componente_id: "componente",
  documento_id: "documento",
  pagina_id: "pagina",
  pregunta_id: "pregunta",
  modelo_ids: "modelo",
  intento_ids: "intento",
  entidades: null,
};

/**
 * @typedef {object} PackState
 * @property {string} packId
 * @property {string} packVersion
 * @property {string} schemaVersion
 * @property {string} minClientVersion
 * @property {boolean} demo
 * @property {number} lastAppliedSequence
 * @property {Record<string,string>} files  ruta → contenido exacto del archivo
 * @property {Record<string,object>} tombstones id → tombstone
 * @property {string} installedAt  ISO
 * @property {string} updatedAt    ISO
 */

/** Todos los ítems del pack, con el archivo en el que viven. */
export function itemsDe(state) {
  const out = [];
  for (const [path, content] of Object.entries(state.files ?? {})) {
    if (!path.startsWith("items/")) continue;
    let arr;
    try {
      arr = JSON.parse(content);
    } catch {
      continue;
    }
    if (!Array.isArray(arr)) continue;
    for (const item of arr) out.push({ archivo: path, item });
  }
  return out;
}

/** Ítems como pares {archivo, item} eliminando los tombstones aplicados. */
export function entriesDe(state) {
  return itemsDe(state).filter(({ item }) => !(item?.id in (state.tombstones ?? {})));
}

/** IDs de tecnología asociados a un ítem (índice por tecnología). */
export function tecnologiasDe(item) {
  const out = new Set();
  const add = (v) => {
    if (typeof v === "string" && v.startsWith("tec:")) out.add(v);
  };
  add(item?.tecnologia_id);
  for (const campo of Object.keys(CAMPOS_REF)) {
    const v = item?.[campo];
    if (Array.isArray(v)) v.forEach(add);
    else add(v);
  }
  return [...out].sort();
}

/**
 * Índices de búsqueda por ID / tipo / tecnología.
 * @returns {{ porId: Map<string,object>, porTipo: Map<string,string[]>, porTecnologia: Map<string,string[]> }}
 */
export function construirIndices(state) {
  const porId = new Map();
  const porTipo = new Map();
  const porTecnologia = new Map();
  for (const { item } of entriesDe(state)) {
    if (typeof item?.id !== "string") continue;
    porId.set(item.id, item);
    const tipo = typeof item.tipo === "string" ? item.tipo : "desconocido";
    if (!porTipo.has(tipo)) porTipo.set(tipo, []);
    porTipo.get(tipo).push(item.id);
    for (const tec of tecnologiasDe(item)) {
      if (!porTecnologia.has(tec)) porTecnologia.set(tec, []);
      porTecnologia.get(tec).push(item.id);
    }
  }
  for (const lista of porTipo.values()) lista.sort();
  for (const lista of porTecnologia.values()) lista.sort();
  return { porId, porTipo, porTecnologia };
}

function sinAcentos(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function contieneTexto(item, texto) {
  const objetivo = sinAcentos(texto);
  const pila = [item];
  while (pila.length > 0) {
    const v = pila.pop();
    if (typeof v === "string") {
      if (sinAcentos(v).includes(objetivo)) return true;
    } else if (Array.isArray(v)) {
      for (const x of v) pila.push(x);
    } else if (v && typeof v === "object") {
      for (const x of Object.values(v)) pila.push(x);
    }
  }
  return false;
}

/**
 * Búsqueda offline sobre el pack instalado.
 * Filtros: texto libre (sin acentos, minúsculas), tipo exacto y tecnología exacta.
 * Orden estable por ID. Límite de 200 resultados (la búsqueda completa con FTS es F4.4).
 * @returns {object[]} ítems que cumplen todos los filtros
 */
export function buscar(state, { texto = "", tipo = null, tecnologia = null, limite = 200 } = {}) {
  const indices = construirIndices(state);
  let candidatos = [...indices.porId.values()];
  if (tipo) candidatos = candidatos.filter((i) => i.tipo === tipo);
  if (tecnologia) {
    const ids = new Set(indices.porTecnologia.get(tecnologia) ?? []);
    candidatos = candidatos.filter((i) => ids.has(i.id));
  }
  const q = texto.trim();
  if (q) candidatos = candidatos.filter((i) => contieneTexto(i, q));
  candidatos.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return candidatos.slice(0, limite);
}

/** Tamaño aproximado del estado en bytes (UTF-8) para mostrarlo en Ajustes. */
export function tamanoBytes(state) {
  let total = 0;
  for (const content of Object.values(state.files ?? {})) {
    total += Buffer.byteLength(content, "utf8");
  }
  return total;
}

/** Serializa los ítems a los archivos items/<tipo>.json (orden estable por ID). */
export function serializarArchivosItems(entries) {
  const porTipo = new Map();
  for (const { item } of entries) {
    const tipo = item?.tipo in PREFIJOS ? item.tipo : null;
    if (!tipo) continue;
    if (!porTipo.has(tipo)) porTipo.set(tipo, []);
    porTipo.get(tipo).push(item);
  }
  const files = {};
  for (const [tipo, items] of [...porTipo.entries()].sort()) {
    items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    files[`items/${tipo}.json`] = JSON.stringify(items);
  }
  return files;
}
