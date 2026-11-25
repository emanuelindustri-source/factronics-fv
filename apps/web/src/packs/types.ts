// F&V — Tipos compartidos del contrato de sincronización (port TS de packages/sync-contracts).
// Paridad semántica con la implementación JavaScript de referencia (ADR-0009).
// Sin lógica aquí: solo la forma de los documentos del contrato.

/** Entrada de integridad por archivo declarada en sync-manifest.files[]. */
export interface FileEntry {
  path: string;
  sha256: string;
  bytes: number;
}

/** Contenido literal de sync-manifest.json (capa de sincronización, ADR-0009). */
export interface SyncManifest {
  contract_version: string;
  pack_id: string;
  pack_version: string;
  schema_version: string;
  min_client_version: string;
  demo: boolean;
  creado: string;
  responsable: string;
  items_total: number;
  files: FileEntry[];
}

/** Bloque signature.json: firma ECDSA P-256 (DER base64) sobre sha256 de sync-manifest.json. */
export interface SignatureBlock {
  alg: string;
  key_id: string;
  signed: string;
  sig: string;
}

/** Clave pública de confianza (truststore.json). Solo claves PÚBLICAS. */
export interface TruststoreKey {
  key_id: string;
  alg?: string;
  demo?: boolean;
  public_key: string;
  nota?: string;
}

export interface Truststore {
  contract_version?: string;
  keys: TruststoreKey[];
}

/** Contenido literal de pack.json (esquema de contenido F1.1, sin tocar). */
export interface PackManifest {
  id: string;
  version: string;
  schema_version: string;
  demo: boolean;
  creado: string;
  responsable: string;
  [campo: string]: unknown;
}

/** Unidad de instalación .fvpack: manifiesto + firma + archivos completos. */
export interface BundleDoc {
  bundle_format: string;
  sync_manifest: SyncManifest;
  signature: SignatureBlock | null;
  pack_manifest: PackManifest;
  files: Record<string, string>;
}

/** Procedencia obligatoria de un ítem (SIN FUENTE NO SE PUBLICA). */
export interface SourceRef {
  documento?: string;
  codigo_oficial?: string;
  revision?: string;
  pagina?: number;
  pagina_fin?: number;
  cita_textual?: string;
  confianza?: string;
  revisor?: string;
  fecha_revision?: string;
  [campo: string]: unknown;
}

/** Ítem de contenido F1.1 (forma abierta: el contenido evoluciona sin romper el contrato). */
export interface ContenidoItem {
  id?: string;
  tipo?: string;
  schema_version?: string;
  revision?: number;
  estado?: string;
  actualizado?: string;
  etiquetas?: unknown;
  source_ref?: SourceRef | null;
  codigo?: string;
  codigo_oficial?: string;
  programa?: string;
  aviso?: string;
  opciones?: unknown;
  tipo_pregunta?: string;
  respuesta_correcta?: string | string[];
  [campo: string]: unknown;
}

/** Tombstone (borrado lógico definitivo) de un delta de sincronización. */
export interface Tombstone {
  id: string;
  tipo?: string;
  revision: number;
  deleted_at: string;
  reason: string;
  [campo: string]: unknown;
}

/** Archivo sustituido por completo en un delta (la unidad de upsert es el archivo). */
export interface DeltaUpsert {
  path: string;
  sha256: string;
  bytes: number;
  content: string;
}

/** Documento delta del contrato v1 (schema delta.schema.json). */
export interface DeltaDoc {
  contract_version: string;
  pack_id: string;
  base_version: string;
  delta_version: string;
  sequence: number;
  min_client_version: string;
  upserts: DeltaUpsert[];
  tombstones: Tombstone[];
}

/** Estado local de un pack instalado (referencia paritaria, ver state.mjs). */
export interface PackState {
  packId: string | null;
  packVersion: string | null;
  schemaVersion: string | null;
  minClientVersion: string | null;
  demo: boolean;
  lastAppliedSequence: number;
  /** Ruta → contenido exacto del archivo (UTF-8). */
  files: Record<string, string>;
  /** id → tombstone. */
  tombstones: Record<string, Tombstone>;
  syncManifest?: SyncManifest | null;
  syncManifestText?: string;
  signature?: SignatureBlock | null;
  installedAt: string | null;
  updatedAt: string | null;
}

/** Pack dentro de un backup fv-backup. */
export interface BackupPack {
  sync_manifest: SyncManifest;
  signature: SignatureBlock | null;
  pack_manifest: PackManifest;
  files: Record<string, string>;
}

/** Estado de sincronización por pack dentro de un backup. */
export interface BackupSyncState {
  pack_id: string;
  pack_version: string;
  last_applied_sequence: number;
}

/**
 * Preferencias NO personales del backup (privacidad, ADR-0009).
 * PROHIBIDO: nombre, foto, fecha de nacimiento, progreso o cualquier dato personal.
 * La validación rechaza propiedades fuera del catálogo permitido.
 */
export interface BackupSettings {
  language?: string;
  theme_mode?: string;
  dynamic_color?: boolean;
  festivities_enabled?: boolean;
  sober_mode?: boolean;
  festivity_override?: string;
  [campo: string]: unknown;
}

/** Documento fv-backup completo. */
export interface BackupDoc {
  format: string;
  format_version: string;
  app_min_version: string;
  created: string;
  source: string;
  local_schema_version: number;
  packs: BackupPack[];
  sync_state: BackupSyncState[];
  settings: BackupSettings;
  checksum: string;
}

/** Almacén local declarativo para las migraciones (ver localSchema.mjs / ADR-0009). */
export interface AlmacenLocal {
  local_schema_version?: number;
  packs: Record<string, unknown>;
  [campo: string]: unknown;
}

export interface MigracionLocal {
  desde: number;
  hasta: number;
  aplicar: (store: AlmacenLocal) => AlmacenLocal;
}

export interface ResultadoMigracion {
  ok: boolean;
  store: AlmacenLocal;
  codigo?: string;
  mensaje?: string;
}
