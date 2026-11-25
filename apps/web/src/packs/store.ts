// F&V — Almacén de packs en Dexie (IndexedDB) sobre la BD fv-db.
//
// Capa de escritura ATÓMICA del contrato de sincronización (ADR-0009): la
// validación completa (hashes + firma, que son operaciones WebCrypto) se ejecuta
// ANTES de abrir la transacción, y toda la escritura ocurre dentro de UNA
// transacción Dexie 'rw'. Así una interrupción o un fallo a mitad de escritura
// nunca deja un pack a medias: IndexedDB revierte la transacción completa.
// (Las operaciones no-IDB no pueden esperarse dentro de una transacción IndexedDB:
// la transacción se cerraría prematuramente; por eso la validación es fase previa.)
//
// Paridad de lógica con packages/sync-contracts (installer/delta/backup/state).

import { db, type PackRow, type ItemRow, type TombstoneRow } from "../db";
import { ERRORES, ErrorContrato } from "./constants";
import { estadoDesdeBundle, estadoVacio, resumenDe, validarBundle, type Resumen } from "./installer";
import { aplicarDelta } from "./delta";
import { crearBackup, restablecerBackup } from "./backup";
import { buscar, entriesDe, tamanoBytes, type OpcionesBusqueda } from "./state";
import type {
  BackupDoc,
  BackupSettings,
  BundleDoc,
  ContenidoItem,
  DeltaDoc,
  PackState,
  Truststore,
} from "./types";

function textoErrores(errores: Array<{ codigo: string; mensaje: string }>): string {
  return errores.map((e) => e.mensaje).join("; ");
}

/** Tipo laxo para el bundle de entrada: se valida en runtime contra el contrato. */
export type BundleRecibido = Parameters<typeof validarBundle>[0];

function codigoDe(errores: Array<{ codigo: string; mensaje: string }>, codigo?: string): string {
  return codigo ?? errores[0]?.codigo ?? ERRORES.PACK_CORRUPTO;
}

const compararIds = (a: ContenidoItem, b: ContenidoItem): number => {
  const ia = String(a.id);
  const ib = String(b.id);
  return ia < ib ? -1 : ia > ib ? 1 : 0;
};

/** Reconstruye el PackState completo (archivos byte a byte) desde las filas de la BD. */
export async function readState(packId: string): Promise<PackState | null> {
  const fila = await db.packs.get(packId);
  if (!fila) return null;

  const filasItems = await db.contentItems.where("pack_id").equals(packId).toArray();
  const filasTomb = await db.tombstones.where("pack_id").equals(packId).toArray();

  // Texto exacto guardado al instalar/aplicar deltas (byte a byte con los hashes).
  const itemsTexto: Record<string, string> = { ...(fila.items_files_text ?? {}) };
  // Respaldo: si faltara el texto exacto, se recompone por tipo desde las filas.
  const porTipo = new Map<string, ContenidoItem[]>();
  for (const f of filasItems) {
    if (!porTipo.has(f.tipo)) porTipo.set(f.tipo, []);
    porTipo.get(f.tipo)?.push(f.data);
  }
  for (const [tipo, items] of porTipo) {
    const ruta = `items/${tipo}.json`;
    if (!(ruta in itemsTexto)) itemsTexto[ruta] = JSON.stringify([...items].sort(compararIds));
  }

  const files: Record<string, string> = { "pack.json": fila.pack_manifest_text };
  Object.assign(files, itemsTexto);
  files["sync-manifest.json"] = fila.sync_manifest_text;

  return {
    packId: fila.pack_id,
    packVersion: fila.pack_version,
    schemaVersion: fila.schema_version,
    minClientVersion: fila.min_client_version,
    demo: fila.demo,
    lastAppliedSequence: fila.last_applied_sequence,
    files,
    tombstones: Object.fromEntries(filasTomb.map((t) => [t.id, t.data])),
    syncManifest: fila.sync_manifest,
    syncManifestText: fila.sync_manifest_text,
    signature: fila.signature,
    installedAt: fila.installed_at,
    updatedAt: fila.updated_at,
  };
}

/** Escribe un PackState completo. DEBE llamarse dentro de una transacción 'rw'. */
async function escribirEstado(estado: PackState): Promise<void> {
  const packId = estado.packId;
  if (!packId) throw new ErrorContrato(ERRORES.PACK_CORRUPTO, "el estado no tiene packId");

  const itemsTexto: Record<string, string> = {};
  for (const [ruta, texto] of Object.entries(estado.files)) {
    if (ruta.startsWith("items/")) itemsTexto[ruta] = texto;
  }

  const fila: PackRow = {
    pack_id: packId,
    pack_version: estado.packVersion ?? "0.0.0",
    schema_version: estado.schemaVersion ?? "1.0.0",
    min_client_version: estado.minClientVersion ?? "0.0.0",
    demo: estado.demo === true,
    installed_at: estado.installedAt ?? estado.updatedAt ?? "",
    updated_at: estado.updatedAt ?? "",
    last_applied_sequence: estado.lastAppliedSequence ?? 0,
    sync_manifest: estado.syncManifest as PackRow["sync_manifest"],
    sync_manifest_text: estado.syncManifestText ?? "",
    pack_manifest_text: estado.files["pack.json"] ?? "",
    signature: estado.signature ?? null,
    size_bytes: tamanoBytes(estado),
    items_files_text: itemsTexto,
  };
  await db.packs.put(fila);

  await db.contentItems.where("pack_id").equals(packId).delete();
  await db.tombstones.where("pack_id").equals(packId).delete();

  const filasItems: ItemRow[] = [];
  for (const { item } of entriesDe(estado)) {
    if (typeof item?.id !== "string" || typeof item?.tipo !== "string") continue;
    filasItems.push({ id: item.id, tipo: item.tipo, pack_id: packId, data: item });
  }
  if (filasItems.length > 0) await db.contentItems.bulkPut(filasItems);

  const filasTomb: TombstoneRow[] = Object.entries(estado.tombstones).map(([id, data]) => ({
    id,
    pack_id: packId,
    data,
  }));
  if (filasTomb.length > 0) await db.tombstones.bulkPut(filasTomb);

  await db.syncState.put({
    pack_id: packId,
    pack_version: estado.packVersion ?? "0.0.0",
    last_applied_sequence: estado.lastAppliedSequence ?? 0,
  });
}

const TABLAS = () => [db.packs, db.contentItems, db.tombstones, db.syncState] as const;

/** Resumen para Ajustes del primer pack instalado (o estado vacío claro). */
export async function getPackSummary(): Promise<Resumen> {
  const estado = await getInstalledState();
  return resumenDe(estado ?? estadoVacio());
}

/** Estado del primer pack instalado, o null si no hay ninguno. */
export async function getInstalledState(): Promise<PackState | null> {
  const fila = await db.packs.orderBy("pack_id").first();
  if (!fila) return null;
  return readState(fila.pack_id);
}

export interface OpcionesInstalar {
  truststore: Truststore | null | undefined;
  clientVersion: string;
  isoNow: string;
  tamanoBytes?: number | null;
}

export interface ResultadoInstalarStore {
  ok: true;
  motivo?: string;
  estado: PackState;
}

/**
 * Instala un bundle validándolo por completo y escribiéndolo en UNA transacción.
 * Si la validación falla NO escribe nada: lanza ErrorContrato con .codigo.
 */
export async function installBundle(bundle: BundleRecibido, opts: OpcionesInstalar): Promise<ResultadoInstalarStore> {
  const { truststore, clientVersion, isoNow, tamanoBytes: tam = null } = opts;
  const packId = bundle?.sync_manifest?.pack_id;
  const instalado = typeof packId === "string" ? await readState(packId) : null;

  const v = await validarBundle(bundle, { truststore, clientVersion, instalado, tamanoBytes: tam, verificarArchivos: true });
  if (!v.valido) {
    throw new ErrorContrato(codigoDe(v.errores, v.codigo), textoErrores(v.errores));
  }
  if (v.motivo === "ya-instalado") {
    return { ok: true, motivo: "ya-instalado", estado: instalado as PackState };
  }

  const estado = estadoDesdeBundle(bundle as BundleDoc, isoNow);
  await db.transaction("rw", ...TABLAS(), async () => {
    await escribirEstado(estado);
  });
  return { ok: true, estado };
}

/** Desinstala un pack (en una transacción: nada queda a medias). */
export async function uninstall(packId: string): Promise<void> {
  await db.transaction("rw", ...TABLAS(), async () => {
    await db.packs.delete(packId);
    await db.contentItems.where("pack_id").equals(packId).delete();
    await db.tombstones.where("pack_id").equals(packId).delete();
    await db.syncState.delete(packId);
  });
}

/** Desinstala todos los packs. */
export async function uninstallAll(): Promise<void> {
  await db.transaction("rw", ...TABLAS(), async () => {
    await db.packs.clear();
    await db.contentItems.clear();
    await db.tombstones.clear();
    await db.syncState.clear();
  });
}

/**
 * Aplica un delta sobre el pack correspondiente en una transacción.
 * Si el delta se rechaza, no se escribe nada (ErrorContrato con .codigo).
 */
export async function applyDeltaToStore(
  delta: DeltaDoc,
  { clientVersion, isoNow }: { clientVersion: string; isoNow: string },
): Promise<{ ok: true; motivo?: string; estado: PackState }> {
  const packId = delta?.pack_id;
  const estado = typeof packId === "string" ? await readState(packId) : null;
  const r = await aplicarDelta(estado, delta, { clientVersion, isoNow });
  if (!r.ok || !r.estado) {
    throw new ErrorContrato(codigoDe(r.errores, r.codigo), textoErrores(r.errores));
  }
  if (r.motivo === "ya-aplicado") {
    return { ok: true, motivo: "ya-aplicado", estado: r.estado };
  }
  await db.transaction("rw", ...TABLAS(), async () => {
    await escribirEstado(r.estado as PackState);
  });
  return { ok: true, motivo: r.motivo, estado: r.estado };
}

export interface OpcionesExportar {
  settings: BackupSettings;
  source: string;
  created: string;
  appMinVersion: string;
}

/** Exporta un backup fv-backup con los estados de TODOS los packs instalados. */
export async function exportBackup(opts: OpcionesExportar): Promise<{ backup: BackupDoc; texto: string }> {
  const estados: PackState[] = [];
  for (const fila of await db.packs.toArray()) {
    const estado = await readState(fila.pack_id);
    if (estado) estados.push(estado);
  }
  const backup = await crearBackup({
    packs: estados.map((estado) => ({ estado })),
    settings: opts.settings,
    source: opts.source,
    created: opts.created,
    appMinVersion: opts.appMinVersion,
  });
  return { backup, texto: JSON.stringify(backup) };
}

/**
 * Importa (restaura) un backup: valida y escribe todo en una transacción.
 * Si algo falla NO se escribe nada: lanza ErrorContrato con .codigo.
 */
export async function importBackup(
  texto: string,
  { clientVersion, truststore, isoNow }: { clientVersion: string; truststore: Truststore | null | undefined; isoNow: string },
): Promise<{ ok: true; estados: PackState[] }> {
  const r = await restablecerBackup(texto, { clientVersion, truststore, isoNow });
  if (!r.ok || !r.estados) {
    throw new ErrorContrato(codigoDe(r.errores, r.codigo), textoErrores(r.errores));
  }
  await db.transaction("rw", ...TABLAS(), async () => {
    for (const estado of r.estados as PackState[]) {
      await escribirEstado(estado);
    }
  });
  return { ok: true, estados: r.estados };
}

/** Búsqueda offline sobre todos los packs instalados. */
export async function searchContent(query: OpcionesBusqueda = {}): Promise<ContenidoItem[]> {
  const resultados: ContenidoItem[] = [];
  for (const fila of await db.packs.toArray()) {
    const estado = await readState(fila.pack_id);
    if (estado) resultados.push(...buscar(estado, query));
  }
  resultados.sort(compararIds);
  return resultados.slice(0, query.limite ?? 200);
}
