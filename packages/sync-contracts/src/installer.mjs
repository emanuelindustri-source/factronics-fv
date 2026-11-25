// F&V — Instalación de packs desde bundle .fvpack (validación completa, sin escritura).
//
// Este módulo es la referencia paritaria de la instalación ATÓMICA: todo se valida
// antes de tocar el almacén (staging lógico). Las apps añaden la capa de escritura
// (transacción Dexie en PWA; staging + journal + rename en Android) de modo que una
// interrupción nunca deja un pack a medias. Ver ADR-0009.

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ERRORES,
  BUNDLE_FORMAT,
  BUNDLE_MAX_BYTES,
  SUPPORTED_CONTRACT_MAJOR,
  CONTENT_SCHEMA_VERSION,
  cmpSemver,
} from "./constants.mjs";
import { sha256Hex, verificarManifiesto } from "./integrity.mjs";
import { validarContenido } from "./contentRules.mjs";
import { entriesDe, construirIndices, tamanoBytes, serializarArchivosItems } from "./state.mjs";

const DIR_SCHEMAS = join(dirname(fileURLToPath(import.meta.url)), "..", "schemas");
let ajvCache = null;

function crearAjv() {
  if (ajvCache) return ajvCache;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const f of readdirSync(DIR_SCHEMAS).filter((x) => x.endsWith(".schema.json"))) {
    ajv.addSchema(JSON.parse(readFileSync(join(DIR_SCHEMAS, f), "utf8")));
  }
  ajvCache = ajv;
  return ajv;
}

export function validarConEsquema(nombre, datos) {
  const ajv = crearAjv();
  const v = ajv.getSchema(`https://factronics-fv.github.io/schemas/sync/1.0.0/${nombre}.schema.json`);
  const ok = v(datos);
  return {
    ok,
    errores: ok ? [] : (v.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message}`.trim()),
  };
}

function err(codigo, mensaje, lista) {
  lista.push({ codigo, mensaje });
}

/**
 * Valida un bundle de instalación completo contra el contrato.
 * @param {object} bundle contenido JSON de un .fvpack
 * @param {{ truststore: object, clientVersion: string, instalado?: object|null, tamanoBytes?: number, verificarArchivos?: boolean }} opts
 *   instalado = PackState del pack ya instalado (para detectar downgrade / no-op)
 *   verificarArchivos = false solo para restaurar packs ya sincronizados con deltas
 *   (los deltas llevan sus propios hashes; la firma sigue verificando el origen).
 * @returns {{ valido: boolean, errores: Array<{codigo:string, mensaje:string}>, motivo?: string }}
 */
export function validarBundle(bundle, { truststore, clientVersion, instalado = null, tamanoBytes: tam = null, verificarArchivos = true } = {}) {
  const errores = [];
  const codigoDe = (e) => e.codigo;

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
  const vMan = validarConEsquema("sync-manifest", bundle.sync_manifest);
  if (!vMan.ok) err(ERRORES.MANIFIESTO_INVALIDO, `sync-manifest inválido: ${vMan.errores.join("; ")}`, errores);
  const vSig = validarConEsquema("signature", bundle.signature);
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
      const h = sha256Hex(content);
      if (h !== f.sha256) {
        err(ERRORES.HASH_INVALIDO, `hash inválido en '${f.path}': declarado ${f.sha256}, calculado ${h}`, errores);
      }
      if (Buffer.byteLength(content, "utf8") !== f.bytes) {
        err(ERRORES.HASH_INVALIDO, `tamaño inválido en '${f.path}': declarado ${f.bytes}`, errores);
      }
    }
  }

  // 7) Firma digital sobre sync-manifest.json.
  const manifestText = bundle.files?.["sync-manifest.json"];
  if (typeof manifestText !== "string") {
    err(ERRORES.PACK_CORRUPTO, "falta sync-manifest.json dentro del bundle", errores);
  } else {
    const verif = verificarManifiesto(manifestText, bundle.signature, truststore);
    if (!verif.ok) err(verif.codigo, `firma no verificada (${verif.codigo})`, errores);
  }

  if (errores.length > 0) return { valido: false, errores, codigo: codigoDe(errores[0]) };

  // 8) Validación de contenido (reglas semánticas de F1.1).
  const entries = [];
  for (const [path, content] of Object.entries(bundle.files ?? {})) {
    if (!path.startsWith("items/")) continue;
    let arr;
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
    for (const item of arr) entries.push({ archivo: path, item });
  }
  if (errores.length > 0) return { valido: false, errores, codigo: codigoDe(errores[0]) };

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
 * @param {string} isoNow marca de tiempo instalado/actualizado
 */
export function estadoDesdeBundle(bundle, isoNow) {
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

/**
 * Instalación completa (referencia): valida y produce el nuevo estado.
 * @returns {{ ok: boolean, errores: object[], motivo?: string, estado?: object }}
 */
export function instalarBundle(bundle, { truststore, clientVersion, instalado = null, isoNow, tamanoBytes: tam = null, verificarArchivos = true }) {
  const v = validarBundle(bundle, { truststore, clientVersion, instalado, tamanoBytes: tam, verificarArchivos });
  if (!v.valido) return { ok: false, errores: v.errores };
  if (v.motivo === "ya-instalado") return { ok: true, errores: [], motivo: "ya-instalado", estado: instalado };
  return { ok: true, errores: [], estado: estadoDesdeBundle(bundle, isoNow) };
}

/** Estado vacío (sin pack instalado): la app muestra estado vacío claro, sin inventar contenido. */
export function estadoVacio() {
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

/** Resumen visible en Ajustes. */
export function resumenDe(estado) {
  if (!estado || !estado.packId) return { instalado: false };
  const items = entriesDe(estado);
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
    indices: (() => {
      const i = construirIndices(estado);
      return { porId: i.porId.size, porTipo: i.porTipo.size, porTecnologia: i.porTecnologia.size };
    })(),
  };
}

export { serializarArchivosItems };
