// F&V — Instalación de packs desde bundle .fvpack (validación completa, sin escritura).
//
// Este módulo es la referencia paritaria de la instalación ATÓMICA: todo se valida
// antes de tocar el almacén (staging lógico). Las apps añaden la capa de escritura
// (transacción Dexie en PWA; staging + journal + rename en Android) de modo que una
// interrupción nunca deja un pack a medias. Ver ADR-0009.
//
// Paridad semántica con packages/sync-contracts/src/installer.mjs. En lugar de ajv,
// validarConEsquemaLite implementa comprobaciones manuales equivalentes a los
// esquemas JSON de packages/sync-contracts/schemas (campos requeridos, tipos,
// patrones, const/enum y propiedades adicionales).

import {
  ERRORES,
  BUNDLE_FORMAT,
  BUNDLE_MAX_BYTES,
  SUPPORTED_CONTRACT_MAJOR,
  CONTENT_SCHEMA_VERSION,
  SIGN_ALG,
  cmpSemver,
} from "./constants";
import { sha256Hex, verificarManifiesto } from "./integrity";
import { validarContenido } from "./contentRules";
import { entriesDe, construirIndices, tamanoBytes, serializarArchivosItems } from "./state";
import type { BundleDoc, ContenidoItem, PackState, Truststore } from "./types";

// ---------------------------------------------------------------------------
// Validación de esquema lite (equivalente manual a ajv + schemas/).
// ---------------------------------------------------------------------------

type Errores = string[];

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function esEntero(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v);
}

function comprobarRequeridos(v: Record<string, unknown>, campos: readonly string[], ruta: string, errores: Errores): void {
  for (const c of campos) {
    if (v[c] === undefined) errores.push(`${ruta}/${c} es obligatorio`);
  }
}

function comprobarExtra(v: Record<string, unknown>, permitidos: readonly string[], ruta: string, errores: Errores): void {
  for (const k of Object.keys(v)) {
    if (!permitidos.includes(k)) errores.push(`${ruta}/${k} no está permitido`);
  }
}

function comprobarPatron(v: unknown, re: RegExp, ruta: string, errores: Errores, desc: string): void {
  if (typeof v !== "string" || !re.test(v)) errores.push(`${ruta} debe ser ${desc}`);
}

function comprobarTextoNoVacio(v: unknown, ruta: string, errores: Errores): void {
  if (typeof v !== "string" || v.length < 1) errores.push(`${ruta} debe ser un texto no vacío`);
}

function comprobarEnteroMin(v: unknown, min: number, ruta: string, errores: Errores): void {
  const n = v;
  if (!esEntero(n) || n < min) errores.push(`${ruta} debe ser un entero >= ${min}`);
}

const RE_SEMVER = /^\d+\.\d+\.\d+$/;
const RE_PACK_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const RE_HASH = /^[0-9a-f]{64}$/;
const RE_RUTA_PACK = /^(pack\.json|items\/[a-z_]+\.json|signature\.json|sync-manifest\.json)$/;
const RE_RUTA_DELTA = /^(pack\.json|items\/[a-z_]+\.json)$/;
const RE_ID_ITEM = /^(tec|fam|gen|mod|sis|cmp|prt|err|ink|doc|pag|frag|qst|att|crt):[a-z0-9]+(-[a-z0-9]+)*$/;

const CAMPOS_SYNC_MANIFEST = [
  "contract_version",
  "pack_id",
  "pack_version",
  "schema_version",
  "min_client_version",
  "demo",
  "creado",
  "responsable",
  "items_total",
  "files",
] as const;

const CAMPOS_SIGNATURE = ["alg", "key_id", "signed", "sig"] as const;

function validarSyncManifiestoLite(m: unknown, ruta: string, errores: Errores): void {
  if (!esObjeto(m)) {
    errores.push(`${ruta} debe ser un objeto`);
    return;
  }
  comprobarRequeridos(m, CAMPOS_SYNC_MANIFEST, ruta, errores);
  comprobarExtra(m, CAMPOS_SYNC_MANIFEST, ruta, errores);
  for (const c of ["contract_version", "pack_version", "schema_version", "min_client_version"]) {
    if (m[c] !== undefined) comprobarPatron(m[c], RE_SEMVER, `${ruta}/${c}`, errores, "una versión semántica (n.n.n)");
  }
  if (m.pack_id !== undefined) comprobarPatron(m.pack_id, RE_PACK_ID, `${ruta}/pack_id`, errores, "un ID kebab-case");
  if (m.demo !== undefined && typeof m.demo !== "boolean") errores.push(`${ruta}/demo debe ser booleano`);
  if (m.creado !== undefined) comprobarPatron(m.creado, RE_FECHA, `${ruta}/creado`, errores, "una fecha AAAA-MM-DD");
  if (m.responsable !== undefined) comprobarTextoNoVacio(m.responsable, `${ruta}/responsable`, errores);
  if (m.items_total !== undefined) comprobarEnteroMin(m.items_total, 0, `${ruta}/items_total`, errores);
  const files = m.files;
  if (files !== undefined) {
    if (!Array.isArray(files) || files.length < 1) {
      errores.push(`${ruta}/files debe ser un array con al menos 1 elemento`);
    } else {
      files.forEach((f, i) => validarEntradaArchivoSync(f, `${ruta}/files/${i}`, errores));
    }
  }
}

function validarEntradaArchivoSync(f: unknown, ruta: string, errores: Errores): void {
  if (!esObjeto(f)) {
    errores.push(`${ruta} debe ser un objeto`);
    return;
  }
  comprobarRequeridos(f, ["path", "sha256", "bytes"], ruta, errores);
  comprobarExtra(f, ["path", "sha256", "bytes"], ruta, errores);
  if (f.path !== undefined) comprobarPatron(f.path, RE_RUTA_PACK, `${ruta}/path`, errores, "una ruta de archivo del pack");
  if (f.sha256 !== undefined) comprobarPatron(f.sha256, RE_HASH, `${ruta}/sha256`, errores, "un SHA-256 hex");
  if (f.bytes !== undefined) comprobarEnteroMin(f.bytes, 0, `${ruta}/bytes`, errores);
}

function validarSignatureLite(s: unknown, ruta: string, errores: Errores): void {
  if (!esObjeto(s)) {
    errores.push(`${ruta} debe ser un objeto`);
    return;
  }
  comprobarRequeridos(s, CAMPOS_SIGNATURE, ruta, errores);
  comprobarExtra(s, CAMPOS_SIGNATURE, ruta, errores);
  if (s.alg !== undefined && s.alg !== SIGN_ALG) errores.push(`${ruta}/alg debe ser '${SIGN_ALG}'`);
  if (s.key_id !== undefined) comprobarTextoNoVacio(s.key_id, `${ruta}/key_id`, errores);
  if (s.signed !== undefined) comprobarPatron(s.signed, RE_HASH, `${ruta}/signed`, errores, "un SHA-256 hex");
  if (s.sig !== undefined) comprobarTextoNoVacio(s.sig, `${ruta}/sig`, errores);
}

function validarDeltaLite(d: unknown, ruta: string, errores: Errores): void {
  if (!esObjeto(d)) {
    errores.push(`${ruta} debe ser un objeto`);
    return;
  }
  const campos = [
    "contract_version",
    "pack_id",
    "base_version",
    "delta_version",
    "sequence",
    "min_client_version",
    "upserts",
    "tombstones",
  ] as const;
  comprobarRequeridos(d, campos, ruta, errores);
  comprobarExtra(d, campos, ruta, errores);
  for (const c of ["contract_version", "base_version", "delta_version", "min_client_version"]) {
    if (d[c] !== undefined) comprobarPatron(d[c], RE_SEMVER, `${ruta}/${c}`, errores, "una versión semántica (n.n.n)");
  }
  if (d.pack_id !== undefined) comprobarPatron(d.pack_id, RE_PACK_ID, `${ruta}/pack_id`, errores, "un ID kebab-case");
  if (d.sequence !== undefined) comprobarEnteroMin(d.sequence, 1, `${ruta}/sequence`, errores);
  const ups = d.upserts;
  if (ups !== undefined) {
    if (!Array.isArray(ups)) {
      errores.push(`${ruta}/upserts debe ser un array`);
    } else {
      ups.forEach((u, i) => validarUpsertLite(u, `${ruta}/upserts/${i}`, errores));
    }
  }
  const tombs = d.tombstones;
  if (tombs !== undefined) {
    if (!Array.isArray(tombs)) {
      errores.push(`${ruta}/tombstones debe ser un array`);
    } else {
      tombs.forEach((t, i) => validarTombstoneLite(t, `${ruta}/tombstones/${i}`, errores));
    }
  }
}

function validarUpsertLite(u: unknown, ruta: string, errores: Errores): void {
  if (!esObjeto(u)) {
    errores.push(`${ruta} debe ser un objeto`);
    return;
  }
  comprobarRequeridos(u, ["path", "sha256", "bytes", "content"], ruta, errores);
  comprobarExtra(u, ["path", "sha256", "bytes", "content"], ruta, errores);
  if (u.path !== undefined) comprobarPatron(u.path, RE_RUTA_DELTA, `${ruta}/path`, errores, "una ruta de archivo del pack");
  if (u.sha256 !== undefined) comprobarPatron(u.sha256, RE_HASH, `${ruta}/sha256`, errores, "un SHA-256 hex");
  if (u.bytes !== undefined) comprobarEnteroMin(u.bytes, 0, `${ruta}/bytes`, errores);
  if (u.content !== undefined && typeof u.content !== "string") errores.push(`${ruta}/content debe ser texto`);
}

function validarTombstoneLite(t: unknown, ruta: string, errores: Errores): void {
  if (!esObjeto(t)) {
    errores.push(`${ruta} debe ser un objeto`);
    return;
  }
  comprobarRequeridos(t, ["id", "revision", "deleted_at", "reason"], ruta, errores);
  comprobarExtra(t, ["id", "tipo", "revision", "deleted_at", "reason"], ruta, errores);
  if (t.id !== undefined) comprobarPatron(t.id, RE_ID_ITEM, `${ruta}/id`, errores, "un ID de ítem '<prefijo>:<slug>'");
  if (t.tipo !== undefined) comprobarPatron(t.tipo, /^[a-z_]+$/, `${ruta}/tipo`, errores, "un tipo snake_case");
  if (t.revision !== undefined) comprobarEnteroMin(t.revision, 1, `${ruta}/revision`, errores);
  if (t.deleted_at !== undefined) comprobarPatron(t.deleted_at, RE_FECHA, `${ruta}/deleted_at`, errores, "una fecha AAAA-MM-DD");
  if (t.reason !== undefined) comprobarTextoNoVacio(t.reason, `${ruta}/reason`, errores);
}

function validarBackupLite(b: unknown, ruta: string, errores: Errores): void {
  if (!esObjeto(b)) {
    errores.push(`${ruta} debe ser un objeto`);
    return;
  }
  const campos = [
    "format",
    "format_version",
    "app_min_version",
    "created",
    "source",
    "local_schema_version",
    "packs",
    "sync_state",
    "settings",
    "checksum",
  ] as const;
  comprobarRequeridos(b, campos, ruta, errores);
  comprobarExtra(b, campos, ruta, errores);
  if (b.format !== undefined && b.format !== "fv-backup") errores.push(`${ruta}/format debe ser 'fv-backup'`);
  if (b.format_version !== undefined) comprobarPatron(b.format_version, RE_SEMVER, `${ruta}/format_version`, errores, "una versión semántica (n.n.n)");
  if (b.app_min_version !== undefined) comprobarPatron(b.app_min_version, RE_SEMVER, `${ruta}/app_min_version`, errores, "una versión semántica (n.n.n)");
  if (b.created !== undefined) comprobarPatron(b.created, RE_FECHA_HORA, `${ruta}/created`, errores, "una fecha-hora AAAA-MM-DDTHH:MM:SSZ");
  if (b.source !== undefined && b.source !== "android" && b.source !== "web") errores.push(`${ruta}/source debe ser 'android' o 'web'`);
  if (b.local_schema_version !== undefined) comprobarEnteroMin(b.local_schema_version, 1, `${ruta}/local_schema_version`, errores);
  const packs = b.packs;
  if (packs !== undefined) {
    if (!Array.isArray(packs)) {
      errores.push(`${ruta}/packs debe ser un array`);
    } else {
      packs.forEach((p, i) => validarPackBackupLite(p, `${ruta}/packs/${i}`, errores));
    }
  }
  const syncState = b.sync_state;
  if (syncState !== undefined) {
    if (!Array.isArray(syncState)) {
      errores.push(`${ruta}/sync_state debe ser un array`);
    } else {
      syncState.forEach((s, i) => validarSyncStateLite(s, `${ruta}/sync_state/${i}`, errores));
    }
  }
  if (b.settings !== undefined) validarSettingsLite(b.settings, `${ruta}/settings`, errores);
  if (b.checksum !== undefined) comprobarPatron(b.checksum, RE_HASH, `${ruta}/checksum`, errores, "un SHA-256 hex");
}

function validarPackBackupLite(p: unknown, ruta: string, errores: Errores): void {
  if (!esObjeto(p)) {
    errores.push(`${ruta} debe ser un objeto`);
    return;
  }
  const campos = ["sync_manifest", "signature", "pack_manifest", "files"] as const;
  comprobarRequeridos(p, campos, ruta, errores);
  comprobarExtra(p, campos, ruta, errores);
  validarSyncManifiestoLite(p.sync_manifest, `${ruta}/sync_manifest`, errores);
  validarSignatureLite(p.signature, `${ruta}/signature`, errores);
  if (p.pack_manifest !== undefined && !esObjeto(p.pack_manifest)) errores.push(`${ruta}/pack_manifest debe ser un objeto`);
  const files = p.files;
  if (files !== undefined) {
    if (!esObjeto(files)) {
      errores.push(`${ruta}/files debe ser un objeto`);
    } else {
      for (const [k, v] of Object.entries(files)) {
        if (typeof v !== "string") errores.push(`${ruta}/files/${k} debe ser texto`);
      }
    }
  }
}

function validarSyncStateLite(s: unknown, ruta: string, errores: Errores): void {
  if (!esObjeto(s)) {
    errores.push(`${ruta} debe ser un objeto`);
    return;
  }
  const campos = ["pack_id", "pack_version", "last_applied_sequence"] as const;
  comprobarRequeridos(s, campos, ruta, errores);
  comprobarExtra(s, campos, ruta, errores);
  if (s.pack_id !== undefined) comprobarPatron(s.pack_id, RE_PACK_ID, `${ruta}/pack_id`, errores, "un ID kebab-case");
  if (s.pack_version !== undefined) comprobarPatron(s.pack_version, RE_SEMVER, `${ruta}/pack_version`, errores, "una versión semántica (n.n.n)");
  if (s.last_applied_sequence !== undefined) comprobarEnteroMin(s.last_applied_sequence, 0, `${ruta}/last_applied_sequence`, errores);
}

const CAMPOS_SETTINGS = [
  "language",
  "theme_mode",
  "dynamic_color",
  "festivities_enabled",
  "sober_mode",
  "festivity_override",
] as const;

function validarSettingsLite(s: unknown, ruta: string, errores: Errores): void {
  if (!esObjeto(s)) {
    errores.push(`${ruta} debe ser un objeto`);
    return;
  }
  comprobarRequeridos(s, ["language", "theme_mode"], ruta, errores);
  // Privacidad: SIN datos personales. Solo el catálogo de preferencias permitido.
  comprobarExtra(s, CAMPOS_SETTINGS, ruta, errores);
  if (s.language !== undefined && typeof s.language !== "string") errores.push(`${ruta}/language debe ser texto`);
  if (s.theme_mode !== undefined && s.theme_mode !== "system" && s.theme_mode !== "light" && s.theme_mode !== "dark") {
    errores.push(`${ruta}/theme_mode debe ser 'system', 'light' o 'dark'`);
  }
  for (const c of ["dynamic_color", "festivities_enabled", "sober_mode"]) {
    if (s[c] !== undefined && typeof s[c] !== "boolean") errores.push(`${ruta}/${c} debe ser booleano`);
  }
  if (s.festivity_override !== undefined && typeof s.festivity_override !== "string") errores.push(`${ruta}/festivity_override debe ser texto`);
}

export interface ResultadoEsquema {
  ok: boolean;
  errores: string[];
}

/** Comprobaciones manuales equivalentes a los esquemas JSON del contrato. */
export function validarConEsquemaLite(
  nombre: "sync-manifest" | "signature" | "delta" | "backup",
  datos: unknown,
): ResultadoEsquema {
  const errores: Errores = [];
  switch (nombre) {
    case "sync-manifest":
      validarSyncManifiestoLite(datos, "", errores);
      break;
    case "signature":
      validarSignatureLite(datos, "", errores);
      break;
    case "delta":
      validarDeltaLite(datos, "", errores);
      break;
    case "backup":
      validarBackupLite(datos, "", errores);
      break;
  }
  return { ok: errores.length === 0, errores };
}

// ---------------------------------------------------------------------------
// Instalación (staging lógico).
// ---------------------------------------------------------------------------

export interface ErrorInfo {
  codigo: string;
  mensaje: string;
}

export interface ResultadoBundle {
  valido: boolean;
  errores: ErrorInfo[];
  motivo?: string;
  codigo?: string;
}

export interface OpcionesBundle {
  truststore: Truststore | null | undefined;
  clientVersion: string;
  /** PackState del pack ya instalado (para detectar downgrade / no-op). */
  instalado?: PackState | null;
  tamanoBytes?: number | null;
  /** false solo para restaurar packs ya sincronizados con deltas (sus cambios ya se verificaron por hash). */
  verificarArchivos?: boolean;
}

function err(codigo: string, mensaje: string, lista: ErrorInfo[]): void {
  lista.push({ codigo, mensaje });
}

const byteLength = (s: string): number => new TextEncoder().encode(s).length;

/**
 * Valida un bundle de instalación completo contra el contrato.
 * Orden de comprobaciones idéntico a installer.mjs (referencia paritaria).
 */
export async function validarBundle(
  bundle: BundleDoc | null | undefined,
  { truststore, clientVersion, instalado = null, tamanoBytes: tam = null, verificarArchivos = true }: OpcionesBundle,
): Promise<ResultadoBundle> {
  const errores: ErrorInfo[] = [];

  // 0) Corrupción estructural básica.
  if (!bundle || typeof bundle !== "object") {
    err(ERRORES.PACK_CORRUPTO, "el bundle no es un objeto JSON", errores);
    return { valido: false, errores };
  }
  if (tam !== null && tam > BUNDLE_MAX_BYTES) {
    err(ERRORES.BUNDLE_INVALIDO, `el bundle supera el límite de ${BUNDLE_MAX_BYTES} bytes`, errores);
    return { valido: false, errores };
  }
  if (bundle.bundle_format !== BUNDLE_FORMAT) {
    err(ERRORES.BUNDLE_INVALIDO, `bundle_format '${bundle.bundle_format}' no soportado (esperado '${BUNDLE_FORMAT}')`, errores);
    return { valido: false, errores };
  }

  // 1) Esquemas del contrato.
  const vMan = validarConEsquemaLite("sync-manifest", bundle.sync_manifest);
  if (!vMan.ok) err(ERRORES.MANIFIESTO_INVALIDO, `sync-manifest inválido: ${vMan.errores.join("; ")}`, errores);
  const vSig = validarConEsquemaLite("signature", bundle.signature);
  if (!vSig.ok) err(ERRORES.FIRMA_INVALIDA, `bloque de firma inválido: ${vSig.errores.join("; ")}`, errores);

  const man = bundle.sync_manifest;
  if (!man || !vMan.ok) return { valido: false, errores };

  // 2) Versión del contrato.
  const major = parseInt(String(man.contract_version ?? "0").split(".")[0], 10);
  if (major !== SUPPORTED_CONTRACT_MAJOR) {
    err(ERRORES.CONTRATO_VERSION, `contract_version '${man.contract_version}' fuera del rango soportado (mayor ${SUPPORTED_CONTRACT_MAJOR})`, errores);
  }

  // 3) Versión mínima de cliente.
  if (cmpSemver(clientVersion, man.min_client_version) < 0) {
    err(ERRORES.VERSION_CLIENTE, `el pack exige cliente >= ${man.min_client_version}; este cliente es ${clientVersion}`, errores);
  }

  // 4) Versión futura del esquema de contenido (nunca se adivina).
  if (cmpSemver(man.schema_version, CONTENT_SCHEMA_VERSION) > 0) {
    err(ERRORES.VERSION_FUTURA, `schema_version '${man.schema_version}' es futura (soportada: ${CONTENT_SCHEMA_VERSION})`, errores);
  }

  // 5) Downgrade / no-op respecto a lo instalado.
  if (instalado && instalado.packId === man.pack_id) {
    const cmp = cmpSemver(man.pack_version, instalado.packVersion);
    if (cmp < 0) {
      err(ERRORES.DOWNGRADE, `pack_version '${man.pack_version}' es menor que la instalada '${instalado.packVersion}'`, errores);
    } else if (cmp === 0) {
      return { valido: true, errores: [], motivo: "ya-instalado" };
    }
  }

  // 6) Integridad: hash de cada archivo declarado + archivos presentes.
  if (verificarArchivos) {
    for (const f of man.files ?? []) {
      const content = bundle.files?.[f.path];
      if (typeof content !== "string") {
        err(ERRORES.PACK_CORRUPTO, `falta el archivo '${f.path}' en el bundle`, errores);
        continue;
      }
      const h = await sha256Hex(content);
      if (h !== f.sha256) {
        err(ERRORES.HASH_INVALIDO, `hash inválido en '${f.path}': declarado ${f.sha256}, calculado ${h}`, errores);
      }
      if (byteLength(content) !== f.bytes) {
        err(ERRORES.HASH_INVALIDO, `tamaño inválido en '${f.path}': declarado ${f.bytes}`, errores);
      }
    }
  }

  // 7) Firma digital sobre sync-manifest.json.
  const manifestText = bundle.files?.["sync-manifest.json"];
  if (typeof manifestText !== "string") {
    err(ERRORES.PACK_CORRUPTO, "falta sync-manifest.json dentro del bundle", errores);
  } else {
    const verif = await verificarManifiesto(manifestText, bundle.signature, truststore);
    if (!verif.ok) err(verif.codigo, `firma no verificada (${verif.codigo})`, errores);
  }

  if (errores.length > 0) return { valido: false, errores, codigo: errores[0].codigo };

  // 8) Validación de contenido (reglas semánticas de F1.1).
  const entries: Array<{ archivo: string; item: ContenidoItem }> = [];
  for (const [path, content] of Object.entries(bundle.files ?? {})) {
    if (!path.startsWith("items/")) continue;
    let arr: unknown;
    try {
      arr = JSON.parse(content);
    } catch {
      err(ERRORES.PACK_CORRUPTO, `'${path}' no es JSON válido`, errores);
      continue;
    }
    if (!Array.isArray(arr)) {
      err(ERRORES.PACK_CORRUPTO, `'${path}' no es un array de ítems`, errores);
      continue;
    }
    for (const item of arr) entries.push({ archivo: path, item: item as ContenidoItem });
  }
  if (errores.length > 0) return { valido: false, errores, codigo: errores[0].codigo };

  const contenido = validarContenido(bundle.pack_manifest, entries);
  if (!contenido.valido) {
    for (const e of contenido.errores) {
      err(ERRORES.CONTENIDO_INVALIDO, `[${e.regla}] ${e.id}: ${e.mensaje}`, errores);
    }
    return { valido: false, errores };
  }

  return { valido: true, errores: [] };
}

/**
 * Construye el PackState a partir de un bundle YA validado (operación pura).
 * @param isoNow marca de tiempo instalado/actualizado
 */
export function estadoDesdeBundle(bundle: BundleDoc, isoNow: string): PackState {
  const man = bundle.sync_manifest;
  return {
    packId: man.pack_id,
    packVersion: man.pack_version,
    schemaVersion: man.schema_version,
    minClientVersion: man.min_client_version,
    demo: man.demo,
    lastAppliedSequence: 0,
    files: { ...bundle.files },
    tombstones: {},
    syncManifest: { ...man },
    syncManifestText: bundle.files?.["sync-manifest.json"] ?? "",
    signature: bundle.signature ? { ...bundle.signature } : null,
    installedAt: isoNow,
    updatedAt: isoNow,
  };
}

export interface ResultadoInstalacion {
  ok: boolean;
  errores: ErrorInfo[];
  motivo?: string;
  estado?: PackState;
}

/**
 * Instalación completa (referencia): valida y produce el nuevo estado.
 */
export async function instalarBundle(
  bundle: BundleDoc | null | undefined,
  { truststore, clientVersion, instalado = null, isoNow, tamanoBytes: tam = null, verificarArchivos = true }: OpcionesBundle & { isoNow: string },
): Promise<ResultadoInstalacion> {
  const v = await validarBundle(bundle, { truststore, clientVersion, instalado, tamanoBytes: tam, verificarArchivos });
  if (!v.valido) return { ok: false, errores: v.errores };
  if (v.motivo === "ya-instalado") return { ok: true, errores: [], motivo: "ya-instalado", estado: instalado ?? undefined };
  return { ok: true, errores: [], estado: estadoDesdeBundle(bundle as BundleDoc, isoNow) };
}

/** Estado vacío (sin pack instalado): la app muestra estado vacío claro, sin inventar contenido. */
export function estadoVacio(): PackState {
  return {
    packId: null,
    packVersion: null,
    schemaVersion: null,
    minClientVersion: null,
    demo: false,
    lastAppliedSequence: 0,
    files: {},
    tombstones: {},
    installedAt: null,
    updatedAt: null,
  };
}

export type Resumen = { instalado: false } | {
  instalado: true;
  packId: string;
  packVersion: string | null;
  schemaVersion: string | null;
  demo: boolean;
  itemsTotal: number;
  tamanoBytes: number;
  installedAt: string | null;
  updatedAt: string | null;
  indices: { porId: number; porTipo: number; porTecnologia: number };
};

/** Resumen visible en Ajustes. */
export function resumenDe(estado: PackState | null | undefined): Resumen {
  if (!estado || !estado.packId) return { instalado: false };
  const items = entriesDe(estado);
  const idx = construirIndices(estado);
  return {
    instalado: true,
    packId: estado.packId,
    packVersion: estado.packVersion,
    schemaVersion: estado.schemaVersion,
    demo: estado.demo,
    itemsTotal: items.length,
    tamanoBytes: tamanoBytes(estado),
    installedAt: estado.installedAt,
    updatedAt: estado.updatedAt,
    indices: { porId: idx.porId.size, porTipo: idx.porTipo.size, porTecnologia: idx.porTecnologia.size },
  };
}

export { serializarArchivosItems };
