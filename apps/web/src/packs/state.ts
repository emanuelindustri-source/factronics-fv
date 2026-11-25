// F&V — Estado local de un pack instalado: índices de búsqueda y consulta offline.
//
// El estado es una estructura plana compartida por Android (almacén de archivos) y
// PWA (Dexie): lo que persiste cada plataforma son sus campos; los índices se
// reconstruyen al abrir. Los algoritmos de índice y búsqueda de este módulo son la
// referencia paritaria (fixtures compartidos, ver ADR-0009).
//
// Paridad semántica con packages/sync-contracts/src/state.mjs.

import { PREFIJOS } from "./constants";
import type { ContenidoItem, PackState } from "./types";

const CAMPOS_REF: Record<string, string | null> = {
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

export interface EntradaItem {
  archivo: string;
  item: ContenidoItem;
}

/** Todos los ítems del pack, con el archivo en el que viven. */
export function itemsDe(state: PackState): EntradaItem[] {
  const out: EntradaItem[] = [];
  for (const [path, content] of Object.entries(state.files ?? {})) {
    if (!path.startsWith("items/")) continue;
    let arr: unknown;
    try {
      arr = JSON.parse(content);
    } catch {
      continue;
    }
    if (!Array.isArray(arr)) continue;
    for (const item of arr) out.push({ archivo: path, item: item as ContenidoItem });
  }
  return out;
}

/** Ítems como pares {archivo, item} eliminando los tombstones aplicados. */
export function entriesDe(state: PackState): EntradaItem[] {
  return itemsDe(state).filter(({ item }) => !(String(item?.id) in (state.tombstones ?? {})));
}

/** IDs de tecnología asociados a un ítem (índice por tecnología). */
export function tecnologiasDe(item: ContenidoItem): string[] {
  const out = new Set<string>();
  const add = (v: unknown): void => {
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

export interface Indices {
  porId: Map<string, ContenidoItem>;
  porTipo: Map<string, string[]>;
  porTecnologia: Map<string, string[]>;
}

/**
 * Índices de búsqueda por ID / tipo / tecnología.
 */
export function construirIndices(state: PackState): Indices {
  const porId = new Map<string, ContenidoItem>();
  const porTipo = new Map<string, string[]>();
  const porTecnologia = new Map<string, string[]>();
  for (const { item } of entriesDe(state)) {
    if (typeof item?.id !== "string") continue;
    porId.set(item.id, item);
    const tipo = typeof item.tipo === "string" ? item.tipo : "desconocido";
    if (!porTipo.has(tipo)) porTipo.set(tipo, []);
    porTipo.get(tipo)?.push(item.id);
    for (const tec of tecnologiasDe(item)) {
      if (!porTecnologia.has(tec)) porTecnologia.set(tec, []);
      porTecnologia.get(tec)?.push(item.id);
    }
  }
  for (const lista of porTipo.values()) lista.sort();
  for (const lista of porTecnologia.values()) lista.sort();
  return { porId, porTipo, porTecnologia };
}

function sinAcentos(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function contieneTexto(item: ContenidoItem, texto: string): boolean {
  const objetivo = sinAcentos(texto);
  const pila: unknown[] = [item];
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

export interface OpcionesBusqueda {
  texto?: string;
  tipo?: string | null;
  tecnologia?: string | null;
  limite?: number;
}

/**
 * Búsqueda offline sobre el pack instalado.
 * Filtros: texto libre (sin acentos, minúsculas), tipo exacto y tecnología exacta.
 * Orden estable por ID. Límite de 200 resultados (la búsqueda completa con FTS es F4.4).
 * @returns ítems que cumplen todos los filtros
 */
export function buscar(state: PackState, { texto = "", tipo = null, tecnologia = null, limite = 200 }: OpcionesBusqueda = {}): ContenidoItem[] {
  const indices = construirIndices(state);
  let candidatos = [...indices.porId.values()];
  if (tipo) candidatos = candidatos.filter((i) => i.tipo === tipo);
  if (tecnologia) {
    const ids = new Set(indices.porTecnologia.get(tecnologia) ?? []);
    candidatos = candidatos.filter((i) => ids.has(String(i.id)));
  }
  const q = texto.trim();
  if (q) candidatos = candidatos.filter((i) => contieneTexto(i, q));
  candidatos.sort((a, b) => (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0));
  return candidatos.slice(0, limite);
}

/** Tamaño aproximado del estado en bytes (UTF-8) para mostrarlo en Ajustes. */
export function tamanoBytes(state: { files?: Record<string, string> }): number {
  const codificador = new TextEncoder();
  let total = 0;
  for (const content of Object.values(state.files ?? {})) {
    total += codificador.encode(content).length;
  }
  return total;
}

/** Serializa los ítems a los archivos items/<tipo>.json (orden estable por ID). */
export function serializarArchivosItems(entries: EntradaItem[]): Record<string, string> {
  const porTipo = new Map<string, ContenidoItem[]>();
  for (const { item } of entries) {
    const tipo = typeof item?.tipo === "string" && item.tipo in PREFIJOS ? item.tipo : null;
    if (!tipo) continue;
    if (!porTipo.has(tipo)) porTipo.set(tipo, []);
    porTipo.get(tipo)?.push(item);
  }
  const files: Record<string, string> = {};
  for (const [tipo, items] of [...porTipo.entries()].sort()) {
    items.sort((a, b) => (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0));
    files[`items/${tipo}.json`] = JSON.stringify(items);
  }
  return files;
}
