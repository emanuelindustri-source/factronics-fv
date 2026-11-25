// F&V — Backup local: export / import versionado con integridad y privacidad.
//
// Política de privacidad (ADR-0009): el backup contiene SOLO packs de contenido,
// estado de sincronización y preferencias no personales (idioma, tema, festividades).
// PROHIBIDO incluir nombre, foto, fecha de nacimiento, progreso o cualquier dato
// personal. No lleva secretos ni claves.
//
// Integridad: checksum SHA-256 sobre la serialización canónica (claves ordenadas)
// del documento sin el campo 'checksum'. Restaurar un archivo con un bit cambiado
// falla con RESPALDO-CORRUPTO; nunca se restaura a medias.
//
// Paridad semántica con packages/sync-contracts/src/backup.mjs.

import {
  ERRORES,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BUNDLE_FORMAT,
  BACKUP_MAX_BYTES,
  LOCAL_SCHEMA_VERSION,
  cmpSemver,
} from "./constants";
import { canonicalJson } from "./canonical";
import { sha256Hex } from "./integrity";
import { validarConEsquemaLite, instalarBundle, type ErrorInfo } from "./installer";
import type {
  BackupDoc,
  BackupSettings,
  BackupSyncState,
  BundleDoc,
  PackState,
  SyncManifest,
  Truststore,
} from "./types";

/** Serialización canónica del backup sin 'checksum'. */
export function payloadChecksum(backup: BackupDoc): string {
  const copia: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(backup)) {
    if (k !== "checksum") copia[k] = v;
  }
  return canonicalJson(copia);
}

export interface OpcionesCrearBackup {
  /** Estados instalados (con syncManifest/syncManifestText/signature). */
  packs: Array<{ estado: PackState }>;
  /** Preferencias NO personales. */
  settings: BackupSettings;
  /** "android" | "web" */
  source: string;
  /** ISO "AAAA-MM-DDTHH:MM:SSZ" */
  created: string;
  /** Versión mínima de app para restaurar. */
  appMinVersion: string;
}

/**
 * Crea un archivo de backup a partir de los estados instalados.
 */
export async function crearBackup({ packs, settings, source, created, appMinVersion }: OpcionesCrearBackup): Promise<BackupDoc> {
  const backup: BackupDoc = {
    format: BACKUP_FORMAT,
    format_version: BACKUP_FORMAT_VERSION,
    app_min_version: appMinVersion,
    created,
    source,
    local_schema_version: LOCAL_SCHEMA_VERSION,
    packs: packs.map(({ estado }) => ({
      sync_manifest: estado.syncManifest as SyncManifest,
      signature: estado.signature ?? null,
      pack_manifest: JSON.parse(estado.files["pack.json"]),
      files: { ...estado.files, "sync-manifest.json": estado.syncManifestText ?? "" },
    })),
    sync_state: packs.map(({ estado }) => ({
      pack_id: String(estado.packId),
      pack_version: String(estado.packVersion),
      last_applied_sequence: estado.lastAppliedSequence,
    })),
    settings: { ...settings },
    checksum: "",
  };
  backup.checksum = await sha256Hex(payloadChecksum(backup));
  return backup;
}

function rechazo(codigo: string, mensaje: string): { ok: false; codigo: string; errores: ErrorInfo[] } {
  return { ok: false, codigo, errores: [{ codigo, mensaje }] };
}

export interface ResultadoValidacionBackup {
  ok: boolean;
  codigo?: string;
  errores: ErrorInfo[];
  backup?: BackupDoc;
}

const byteLength = (s: string): number => new TextEncoder().encode(s).length;

/**
 * Valida un backup (estructura, versión, tamaño, checksum) sin restaurar.
 */
export async function validarBackup(
  datos: string | BackupDoc,
  { clientVersion, tamanoBytes: tam = null }: { clientVersion?: string; tamanoBytes?: number | null } = {},
): Promise<ResultadoValidacionBackup> {
  let backup: BackupDoc | unknown = datos;
  if (typeof datos === "string") {
    if (byteLength(datos) > BACKUP_MAX_BYTES) {
      return rechazo(ERRORES.RESPALDO_GRANDE, `el backup supera el límite de ${BACKUP_MAX_BYTES} bytes`);
    }
    try {
      backup = JSON.parse(datos);
    } catch {
      return rechazo(ERRORES.RESPALDO_CORRUPTO, "el backup no es JSON válido");
    }
  }
  if (tam !== null && tam > BACKUP_MAX_BYTES) {
    return rechazo(ERRORES.RESPALDO_GRANDE, `el backup supera el límite de ${BACKUP_MAX_BYTES} bytes`);
  }
  if (!backup || typeof backup !== "object" || (backup as BackupDoc).format !== BACKUP_FORMAT) {
    return rechazo(ERRORES.RESPALDO_CORRUPTO, "formato de backup desconocido");
  }
  const doc = backup as BackupDoc;
  const major = parseInt(String(doc.format_version ?? "0").split(".")[0], 10);
  if (cmpSemver(doc.format_version ?? "0.0.0", BACKUP_FORMAT_VERSION) > 0) {
    return rechazo(ERRORES.VERSION_FUTURA, `format_version '${doc.format_version}' es futura (soportada: ${BACKUP_FORMAT_VERSION})`);
  }
  if (major !== 1) {
    return rechazo(ERRORES.RESPALDO_VERSION, `format_version '${doc.format_version}' no soportada`);
  }
  if (cmpSemver(clientVersion, doc.app_min_version) < 0) {
    return rechazo(ERRORES.VERSION_CLIENTE, `el backup exige app >= ${doc.app_min_version}; esta es ${clientVersion}`);
  }
  // Esquema (incluye la prohibición de datos personales en settings).
  const v = validarConEsquemaLite("backup", doc);
  if (!v.ok) return rechazo(ERRORES.RESPALDO_CORRUPTO, `backup inválido: ${v.errores.join("; ")}`);

  const esperado = await sha256Hex(payloadChecksum(doc));
  if (esperado !== doc.checksum) {
    return rechazo(ERRORES.RESPALDO_CORRUPTO, `checksum inválido: declarado ${doc.checksum}, calculado ${esperado}`);
  }
  return { ok: true, errores: [], backup: doc };
}

export interface ResultadoRestauracion {
  ok: boolean;
  codigo?: string;
  errores: ErrorInfo[];
  estados?: PackState[];
  sync_state?: BackupSyncState[];
  settings?: BackupSettings;
}

/**
 * Restaura un backup sobre almacenamiento limpio (operación pura de referencia).
 * Rechaza corruptos y nunca deja estado parcial: o restaura todo o nada.
 */
export async function restablecerBackup(
  datos: string | BackupDoc,
  { clientVersion, truststore, isoNow, tamanoBytes: tam = null }: {
    clientVersion: string;
    truststore: Truststore | null | undefined;
    isoNow: string;
    tamanoBytes?: number | null;
  },
): Promise<ResultadoRestauracion> {
  const v = await validarBackup(datos, { clientVersion, tamanoBytes: tam });
  if (!v.ok) return v as ResultadoRestauracion;
  const backup = v.backup as BackupDoc;

  const estados: PackState[] = [];
  for (const pack of backup.packs) {
    const bundle: BundleDoc = {
      bundle_format: BUNDLE_FORMAT,
      sync_manifest: pack.sync_manifest,
      signature: pack.signature,
      pack_manifest: pack.pack_manifest,
      files: pack.files,
    };
    const ss = backup.sync_state.find((s) => s.pack_id === pack.sync_manifest?.pack_id);
    // Cadena de verificación de la restauración (ADR-0009):
    //   - firma del manifiesto de origen SIEMPRE (prueba de procedencia);
    //   - reglas de contenido de F1.1 SIEMPRE;
    //   - hashes de archivos solo si el pack nunca recibió deltas (si hubo deltas,
    //     cada cambio ya se verificó por hash al aplicarse).
    const sincronizado = (ss?.last_applied_sequence ?? 0) > 0;
    const inst = await instalarBundle(bundle, {
      truststore,
      clientVersion,
      instalado: null,
      isoNow,
      verificarArchivos: !sincronizado,
    });
    if (!inst.ok || !inst.estado) {
      return rechazo(
        inst.errores[0]?.codigo ?? ERRORES.RESPALDO_CORRUPTO,
        `pack '${pack.sync_manifest?.pack_id}' del backup no es válido: ${inst.errores.map((e) => e.mensaje).join("; ")}`,
      );
    }
    // Conserva la versión actual y el estado de sincronización (idempotencia tras restaurar).
    estados.push({
      ...inst.estado,
      packVersion: ss?.pack_version ?? inst.estado.packVersion,
      lastAppliedSequence: ss?.last_applied_sequence ?? 0,
    });
  }

  // Los deltas registrados en sync_state se conservan como estado de sincronización.
  return {
    ok: true,
    errores: [],
    estados,
    sync_state: backup.sync_state,
    settings: backup.settings,
  };
}

export { BACKUP_MAX_BYTES };
