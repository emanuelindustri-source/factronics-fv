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

import {
  ERRORES,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BUNDLE_FORMAT,
  BACKUP_MAX_BYTES,
  SUPPORTED_CONTRACT_MAJOR,
  LOCAL_SCHEMA_VERSION,
  cmpSemver,
} from "./constants.mjs";
import { canonicalJson } from "./canonical.mjs";
import { sha256Hex } from "./integrity.mjs";
import { validarConEsquema, instalarBundle } from "./installer.mjs";
import { aplicarDelta } from "./delta.mjs";

/** Serialización canónica del backup sin 'checksum'. */
export function payloadChecksum(backup) {
  const copia = { ...backup };
  delete copia.checksum;
  return canonicalJson(copia);
}

/**
 * Crea un archivo de backup a partir de los estados instalados.
 *
 * @param {object} args
 * @param {Array<{ estado: object }>} args.packs estados instalados (con syncManifest/syncManifestText/signature)
 * @param {object} args.settings preferencias NO personales
 * @param {string} args.source "android" | "web"
 * @param {string} args.created ISO "AAAA-MM-DDTHH:MM:SSZ"
 * @param {string} args.appMinVersion versión mínima de app para restaurar
 * @returns {object} documento fv-backup listo para serializar
 */
export function crearBackup({ packs, settings, source, created, appMinVersion }) {
  const backup = {
    format: BACKUP_FORMAT,
    format_version: BACKUP_FORMAT_VERSION,
    app_min_version: appMinVersion,
    created,
    source,
    local_schema_version: LOCAL_SCHEMA_VERSION,
    packs: packs.map(({ estado }) => ({
      sync_manifest: estado.syncManifest,
      signature: estado.signature,
      pack_manifest: JSON.parse(estado.files["pack.json"]),
      files: { ...estado.files, "sync-manifest.json": estado.syncManifestText },
    })),
    sync_state: packs.map(({ estado }) => ({
      pack_id: estado.packId,
      pack_version: estado.packVersion,
      last_applied_sequence: estado.lastAppliedSequence,
    })),
    settings: { ...settings },
    checksum: "",
  };
  backup.checksum = sha256Hex(payloadChecksum(backup));
  return backup;
}

function rechazo(codigo, mensaje) {
  return { ok: false, codigo, errores: [{ codigo, mensaje }] };
}

/**
 * Valida un backup (estructura, versión, tamaño, checksum) sin restaurar.
 * @param {string|object} datos JSON del backup o texto
 * @param {{ clientVersion: string, tamanoBytes?: number }} opts
 */
export function validarBackup(datos, { clientVersion, tamanoBytes: tam = null } = {}) {
  let backup = datos;
  if (typeof datos === "string") {
    if (Buffer.byteLength(datos, "utf8") > BACKUP_MAX_BYTES) {
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
  if (!backup || typeof backup !== "object" || backup.format !== BACKUP_FORMAT) {
    return rechazo(ERRORES.RESPALDO_CORRUPTO, "formato de backup desconocido");
  }
  const major = parseInt(String(backup.format_version ?? "0").split(".")[0], 10);
  if (cmpSemver(backup.format_version ?? "0.0.0", BACKUP_FORMAT_VERSION) > 0) {
    return rechazo(ERRORES.VERSION_FUTURA, `format_version '${backup.format_version}' es futura (soportada: ${BACKUP_FORMAT_VERSION})`);
  }
  if (major !== 1) {
    return rechazo(ERRORES.RESPALDO_VERSION, `format_version '${backup.format_version}' no soportada`);
  }
  if (cmpSemver(clientVersion, backup.app_min_version) < 0) {
    return rechazo(ERRORES.VERSION_CLIENTE, `el backup exige app >= ${backup.app_min_version}; esta es ${clientVersion}`);
  }
  const v = validarConEsquema("backup", backup);
  if (!v.ok) return rechazo(ERRORES.RESPALDO_CORRUPTO, `backup inválido: ${v.errores.join("; ")}`);

  const esperado = sha256Hex(payloadChecksum(backup));
  if (esperado !== backup.checksum) {
    return rechazo(ERRORES.RESPALDO_CORRUPTO, `checksum inválido: declarado ${backup.checksum}, calculado ${esperado}`);
  }
  return { ok: true, errores: [], backup };
}

/**
 * Restaura un backup sobre almacenamiento limpio (operación pura de referencia).
 * Rechaza corruptos y nunca deja estado parcial: o restaura todo o nada.
 *
 * @returns {{ ok: boolean, codigo?: string, errores: object[], estados?: object[], sync_state?: object[], settings?: object }}
 */
export function restablecerBackup(datos, { clientVersion, truststore, isoNow, tamanoBytes: tam = null }) {
  const v = validarBackup(datos, { clientVersion, tamanoBytes: tam });
  if (!v.ok) return v;
  const backup = v.backup;

  const estados = [];
  for (const pack of backup.packs) {
    const bundle = {
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
    const inst = instalarBundle(bundle, {
      truststore,
      clientVersion,
      instalado: null,
      isoNow,
      verificarArchivos: !sincronizado,
    });
    if (!inst.ok) {
      return rechazo(inst.errores[0]?.codigo ?? ERRORES.RESPALDO_CORRUPTO, `pack '${pack.sync_manifest?.pack_id}' del backup no es válido: ${inst.errores.map((e) => e.mensaje).join("; ")}`);
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
