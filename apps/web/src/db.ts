// F&V (by Factronics) — almacenamiento local (IndexedDB vía Dexie)
//
// v1: perfil de usuario (F1.2).
// v2: almacén de packs del contrato de sincronización (ADR-0009) — packs,
//     ítems de contenido, tombstones y estado de sincronización.
import Dexie, { type Table } from "dexie";
import type { ContenidoItem, SignatureBlock, SyncManifest, Tombstone } from "./packs/types";

export interface Profile {
  id: number;
  name: string;
  role: string;
  company: string;
  language: string;
  theme: string;
  festivitiesEnabled?: boolean;
  soberMode?: boolean;
  festivityOverride?: string;
}

/** Fila de pack instalado (metadatos del contrato + textos exactos para round-trip). */
export interface PackRow {
  pack_id: string;
  pack_version: string;
  schema_version: string;
  min_client_version: string;
  demo: boolean;
  installed_at: string;
  updated_at: string;
  last_applied_sequence: number;
  sync_manifest: SyncManifest;
  /** Contenido EXACTO de sync-manifest.json (firma verificable byte a byte). */
  sync_manifest_text: string;
  /** Contenido EXACTO de pack.json (hash verificable byte a byte). */
  pack_manifest_text: string;
  signature: SignatureBlock | null;
  size_bytes: number;
  /**
   * Texto EXACTO de cada archivo items/<tipo>.json. Garantiza que la exportación
   * (backup) reproducirá los mismos bytes que los hashes declarados en el
   * manifiesto, sea cual sea el formato de serialización del pack original.
   */
  items_files_text: Record<string, string>;
}

/** Ítem de contenido indexado para consulta (la fuente de verdad son los archivos). */
export interface ItemRow {
  id: string;
  tipo: string;
  pack_id: string;
  data: ContenidoItem;
}

/** Tombstone (borrado lógico definitivo) aplicado a un pack. */
export interface TombstoneRow {
  id: string;
  pack_id: string;
  data: Tombstone;
}

/** Estado de sincronización por pack (última secuencia de delta aplicada). */
export interface SyncStateRow {
  pack_id: string;
  pack_version: string;
  last_applied_sequence: number;
}

class FVDatabase extends Dexie {
  profile!: Table<Profile, number>;
  packs!: Table<PackRow, string>;
  contentItems!: Table<ItemRow, string>;
  tombstones!: Table<TombstoneRow, string>;
  syncState!: Table<SyncStateRow, string>;

  constructor() {
    super("fv-db");
    this.version(1).stores({
      profile: "id"
    });
    this.version(2).stores({
      profile: "id",
      packs: "pack_id, updated_at",
      contentItems: "id, tipo, pack_id, [pack_id+tipo]",
      tombstones: "id, pack_id",
      syncState: "pack_id"
    });
  }
}

export const db = new FVDatabase();

export const DEMO_PROFILE: Profile = {
  id: 1,
  name: "Khristyan Hidalgo",
  role: "profile.role.demo",
  company: "Factronics, C.A.",
  language: "es-VE",
  theme: "system",
  festivitiesEnabled: true,
  soberMode: false,
  festivityOverride: "auto"
};

export async function getProfile(): Promise<Profile> {
  const existing = await db.profile.get(1);
  if (existing) return existing;
  await db.profile.put(DEMO_PROFILE);
  return DEMO_PROFILE;
}

export async function saveProfile(patch: Partial<Profile>): Promise<Profile> {
  const current = await getProfile();
  const next = { ...current, ...patch, id: 1 };
  await db.profile.put(next);
  return next;
}
