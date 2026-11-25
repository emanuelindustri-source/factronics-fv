// F&V — Aplicación de deltas de sincronización (orden estricto, idempotencia, tombstones).
//
// Reglas del contrato (ADR-0009):
//   - Orden: sequence debe ser exactamente lastAppliedSequence + 1. Un salto se
//     rechaza (ORDEN-INVALIDO) hasta que llegue el delta faltante.
//   - Idempotencia: un delta con sequence <= lastAppliedSequence es un no-op
//     (aplicar dos veces el mismo delta deja el mismo estado).
//   - Base: base_version debe coincidir con la versión instalada (BASE-DESCUADRE).
//   - Downgrade: delta_version <= packVersion instalada se rechaza (DOWNGRADE).
//   - Tombstones: el borrado es definitivo; un upsert posterior que resucite un ID
//     tombstoneado se rechaza (TOMBSTONE-CONFLICTO).
//   - Versión mínima de cliente igual que en la instalación.
//   - El resultado pasa las reglas de contenido de F1.1; si no pasan, NADA cambia.
//
// Paridad semántica con packages/sync-contracts/src/delta.mjs.

import { ERRORES, SUPPORTED_CONTRACT_MAJOR, cmpSemver } from "./constants";
import { sha256Hex } from "./integrity";
import { validarConEsquemaLite } from "./installer";
import { validarContenido } from "./contentRules";
import { entriesDe } from "./state";
import type { ContenidoItem, DeltaDoc, PackManifest, PackState, Tombstone } from "./types";
import type { ErrorInfo } from "./installer";

export interface ResultadoDelta {
  ok: boolean;
  codigo?: string;
  errores: ErrorInfo[];
  motivo?: string;
  estado: PackState | null;
}

const byteLength = (s: string): number => new TextEncoder().encode(s).length;

/**
 * Aplica un delta sobre un estado instalado (operación pura: el estado de entrada
 * no se modifica).
 */
export async function aplicarDelta(
  estado: PackState | null,
  delta: DeltaDoc,
  { clientVersion, isoNow }: { clientVersion: string; isoNow: string },
): Promise<ResultadoDelta> {
  const rechazar = (codigo: string, mensaje: string): ResultadoDelta => ({
    ok: false,
    codigo,
    errores: [{ codigo, mensaje }],
    estado,
  });

  if (!estado || !estado.packId) {
    return rechazar(ERRORES.PACK_NO_INSTALADO, "no hay pack instalado sobre el que aplicar el delta");
  }

  const v = validarConEsquemaLite("delta", delta);
  if (!v.ok) return rechazar(ERRORES.PACK_CORRUPTO, `delta inválido: ${v.errores.join("; ")}`);

  const major = parseInt(String(delta.contract_version).split(".")[0], 10);
  if (major !== SUPPORTED_CONTRACT_MAJOR) {
    return rechazar(ERRORES.CONTRATO_VERSION, `contract_version '${delta.contract_version}' fuera de rango`);
  }

  if (delta.pack_id !== estado.packId) {
    return rechazar(ERRORES.BASE_DESCUADRE, `el delta es del pack '${delta.pack_id}' y el instalado es '${estado.packId}'`);
  }

  if (cmpSemver(clientVersion, delta.min_client_version) < 0) {
    return rechazar(ERRORES.VERSION_CLIENTE, `el delta exige cliente >= ${delta.min_client_version}; este es ${clientVersion}`);
  }

  // Idempotencia: ya aplicado ⇒ no-op con éxito.
  if (delta.sequence <= estado.lastAppliedSequence) {
    return { ok: true, errores: [], motivo: "ya-aplicado", estado };
  }

  // Orden estricto: sin saltos.
  if (delta.sequence !== estado.lastAppliedSequence + 1) {
    return rechazar(ERRORES.ORDEN_INVALIDO, `sequence ${delta.sequence} fuera de orden (esperada ${estado.lastAppliedSequence + 1})`);
  }

  if (delta.base_version !== estado.packVersion) {
    return rechazar(ERRORES.BASE_DESCUADRE, `base_version '${delta.base_version}' ≠ versión instalada '${estado.packVersion}'`);
  }

  if (cmpSemver(delta.delta_version, estado.packVersion) <= 0) {
    return rechazar(ERRORES.DOWNGRADE, `delta_version '${delta.delta_version}' no supera la instalada '${estado.packVersion}'`);
  }

  // Integridad de los upserts.
  for (const up of delta.upserts ?? []) {
    const h = await sha256Hex(up.content);
    if (h !== up.sha256 || byteLength(up.content) !== up.bytes) {
      return rechazar(ERRORES.HASH_INVALIDO, `hash/tamaño inválido en upsert '${up.path}'`);
    }
  }

  // Tombstones previos: nada resucita.
  const tombstones: Record<string, Tombstone> = { ...(estado.tombstones ?? {}) };
  const idsUp = new Set<string>();
  for (const up of delta.upserts ?? []) {
    if (!up.path.startsWith("items/")) continue;
    let arr: unknown;
    try {
      arr = JSON.parse(up.content);
    } catch {
      return rechazar(ERRORES.PACK_CORRUPTO, `'${up.path}' no es JSON válido`);
    }
    for (const item of Array.isArray(arr) ? arr : []) {
      const it = item as ContenidoItem;
      if (typeof it?.id === "string") idsUp.add(it.id);
      if (String(it?.id) in tombstones) {
        return rechazar(ERRORES.TOMBSTONE_CONFLICTO, `el ítem '${it?.id}' fue eliminado (tombstone) y no puede resucitar`);
      }
    }
  }
  for (const t of delta.tombstones ?? []) {
    if (idsUp.has(t.id)) {
      return rechazar(ERRORES.TOMBSTONE_CONFLICTO, `'${t.id}' aparece en upserts y en tombstones del mismo delta`);
    }
    tombstones[t.id] = t;
  }

  // Aplicar sobre copia.
  const files: Record<string, string> = { ...estado.files };
  for (const up of delta.upserts ?? []) files[up.path] = up.content;

  // Quitar los ítems tombstoneados de todos los archivos items/*.json.
  const idsTomb = new Set(Object.keys(tombstones));
  if (idsTomb.size > 0) {
    for (const path of Object.keys(files)) {
      if (!path.startsWith("items/")) continue;
      let arr: unknown;
      try {
        arr = JSON.parse(files[path]);
      } catch {
        return rechazar(ERRORES.PACK_CORRUPTO, `'${path}' no es JSON válido`);
      }
      const lista = Array.isArray(arr) ? (arr as ContenidoItem[]) : [];
      const quedan = lista.filter((item) => !idsTomb.has(String(item?.id)));
      if (quedan.length !== lista.length) {
        if (quedan.length === 0) delete files[path];
        else files[path] = JSON.stringify(quedan);
      }
    }
  }

  // El resultado debe seguir siendo contenido válido de F1.1.
  const packManifest = (JSON.parse(estado.files["pack.json"] ?? "null") ?? {}) as PackManifest;
  const entries = entriesDe({ ...estado, files, tombstones: {} });
  const contenido = validarContenido(packManifest, entries);
  if (!contenido.valido) {
    return {
      ok: false,
      codigo: ERRORES.CONTENIDO_INVALIDO,
      errores: contenido.errores.map((e) => ({ codigo: ERRORES.CONTENIDO_INVALIDO, mensaje: `[${e.regla}] ${e.id}: ${e.mensaje}` })),
      estado,
    };
  }

  return {
    ok: true,
    errores: [],
    motivo: "aplicado",
    estado: {
      ...estado,
      packVersion: delta.delta_version,
      lastAppliedSequence: delta.sequence,
      files,
      tombstones,
      updatedAt: isoNow,
    },
  };
}
