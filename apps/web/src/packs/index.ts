// F&V — Fachada de packs de contenido para la UI (sin lógica de presentación).
//
// Envuelve el almacén Dexie y el contrato de sincronización en una API estable
// para los futuros componentes de Ajustes/Contenido: instalar el pack demo,
// buscar contenido, exportar/importar el backup local y vaciar el contenido.
// Los errores del contrato se devuelven como resultado tipado (ErrorContrato
// nunca cruza a la UI sin su código). Ver ADR-0009.

import { APP_VERSION } from "../constants";
import { getProfile } from "../db";
import { DEMO_BUNDLE, DEMO_TRUSTSTORE } from "../generated/demo-pack";
import { ErrorContrato, cmpSemver } from "./constants";
import type { ErrorInfo, Resumen } from "./installer";
import { construirIndices } from "./state";
import * as store from "./store";
import type { BackupSettings, ContenidoItem, Truststore } from "./types";
import type { OpcionesBusqueda } from "./state";

export type ResultadoFachada =
  | { ok: true; motivo?: string; resumen: Resumen }
  | { ok: false; codigo: string; mensaje: string; errores: ErrorInfo[] };

export type { Resumen, OpcionesBusqueda };

function ahoraIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function fallo(e: unknown): Extract<ResultadoFachada, { ok: false }> {
  if (e instanceof ErrorContrato) {
    return { ok: false, codigo: e.codigo, mensaje: e.message, errores: [{ codigo: e.codigo, mensaje: e.message }] };
  }
  const mensaje = e instanceof Error ? e.message : String(e);
  return { ok: false, codigo: "ESCRITURA-INTERRUMPIDA", mensaje, errores: [{ codigo: "ESCRITURA-INTERRUMPIDA", mensaje }] };
}

/** Resumen del contenido instalado para Ajustes. */
export async function getPackSummary(): Promise<Resumen> {
  return store.getPackSummary();
}

/**
 * Instala el pack demo (DEMO_BUNDLE verificado con DEMO_TRUSTSTORE).
 * Solo contenido DEMO autorizado; no describe equipos reales (ADR-0003).
 */
export async function installDemoPack(
  opts: { clientVersion?: string; isoNow?: string } = {},
): Promise<ResultadoFachada> {
  try {
    const r = await store.installBundle(DEMO_BUNDLE, {
      truststore: DEMO_TRUSTSTORE,
      clientVersion: opts.clientVersion ?? APP_VERSION,
      isoNow: opts.isoNow ?? ahoraIso(),
    });
    return { ok: true, motivo: r.motivo, resumen: await store.getPackSummary() };
  } catch (e) {
    return fallo(e);
  }
}

/** Vacía todo el contenido instalado (no toca el perfil). */
export async function clearContent(): Promise<void> {
  await store.uninstallAll();
}

/** Preferencias NO personales del backup (privacidad: jamás datos personales). */
async function ajustesBackup(): Promise<BackupSettings> {
  const p = await getProfile();
  const settings: BackupSettings = {
    language: p.language,
    theme_mode: p.theme === "light" || p.theme === "dark" ? p.theme : "system",
    dynamic_color: true,
    festivities_enabled: p.festivitiesEnabled ?? true,
    sober_mode: p.soberMode ?? false,
  };
  if (typeof p.festivityOverride === "string") settings.festivity_override = p.festivityOverride;
  return settings;
}

/**
 * Exporta el backup local (fv-backup) con todos los packs instalados.
 * @returns nombre sugerido del archivo y su texto JSON
 */
export async function exportBackupFile(
  opts: { settings?: BackupSettings; created?: string; appMinVersion?: string; clientVersion?: string } = {},
): Promise<{ filename: string; texto: string }> {
  const created = opts.created ?? ahoraIso();
  const { texto } = await store.exportBackup({
    settings: opts.settings ?? (await ajustesBackup()),
    source: "web",
    created,
    appMinVersion: opts.appMinVersion ?? opts.clientVersion ?? APP_VERSION,
  });
  return { filename: `fv-backup-${created.slice(0, 10)}.json`, texto };
}

/** Valida y restaura un backup local (todo o nada). */
export async function importBackupFile(
  texto: string,
  opts: { clientVersion?: string; isoNow?: string; truststore?: Truststore } = {},
): Promise<ResultadoFachada> {
  try {
    await store.importBackup(texto, {
      clientVersion: opts.clientVersion ?? APP_VERSION,
      truststore: opts.truststore ?? DEMO_TRUSTSTORE,
      isoNow: opts.isoNow ?? ahoraIso(),
    });
    return { ok: true, resumen: await store.getPackSummary() };
  } catch (e) {
    return fallo(e);
  }
}

/** Búsqueda offline sobre el contenido instalado. */
export async function searchContent(query: OpcionesBusqueda = {}): Promise<ContenidoItem[]> {
  return store.searchContent(query);
}

/** Lista de tecnologías presentes en el pack instalado (filtro de búsqueda). */
export async function listarTecnologias(): Promise<string[]> {
  const estado = await store.getInstalledState();
  if (!estado) return [];
  return [...construirIndices(estado).porTecnologia.keys()];
}

export { DEMO_BUNDLE, DEMO_TRUSTSTORE, ErrorContrato, cmpSemver };
export type { BackupSettings, ContenidoItem, ErrorInfo };
