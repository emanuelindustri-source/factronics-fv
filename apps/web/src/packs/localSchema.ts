// F&V — Migraciones del almacén local de packs (implementación de referencia).
//
// Cada plataforma persiste el almacén como quiere (archivos en Android, Dexie en
// PWA), pero el REGISTRO de migraciones locales es el mismo concepto en las tres:
// entradas declarativas {desde, hasta, aplicar(store)} encadenadas, igual que las
// migraciones de contenido de F1.1 (ADR-0006). Reglas (ADR-0009):
//   - El almacén declara 'local_schema_version'.
//   - Al abrir: se aplican las migraciones encadenadas hasta la versión actual.
//   - Si una migración falla, el almacén NO se toca (rollback) y se reporta
//     MIGRACION-FALLIDA; el contenido de los packs sigue siendo legible porque
//     vive en archivos/items independientes de los metadatos.
//   - Una migración nunca se adivina: sin ruta declarada no hay actualización.
//
// Paridad semántica con packages/sync-contracts/src/localSchema.mjs.

import { ERRORES, LOCAL_SCHEMA_VERSION } from "./constants";
import type { AlmacenLocal, MigracionLocal, ResultadoMigracion } from "./types";

/**
 * Crea un migrador encadenado a partir del registro de migraciones declaradas.
 * @returns (store, versionObjetivo) => resultado con rollback en fallo
 */
export function crearMigradorLocal(
  migraciones: MigracionLocal[],
): (store: AlmacenLocal | null | undefined, versionObjetivo?: number) => ResultadoMigracion {
  return function migrarAlmacen(store, versionObjetivo = LOCAL_SCHEMA_VERSION): ResultadoMigracion {
    // Base vacía → v1: creación desde cero.
    if (store === null || store === undefined) {
      return { ok: true, store: { local_schema_version: 1, packs: {} } };
    }
    let actual = store;
    while ((actual.local_schema_version ?? 1) < versionObjetivo) {
      const v = actual.local_schema_version ?? 1;
      const paso = migraciones.find((m) => m.desde === v);
      if (!paso) {
        return { ok: false, store, codigo: ERRORES.MIGRACION_FALLIDA, mensaje: `sin ruta de migración declarada desde v${v}` };
      }
      try {
        const siguiente = paso.aplicar(structuredClone(actual));
        if (!siguiente || typeof siguiente !== "object" || siguiente.local_schema_version !== paso.hasta) {
          throw new Error(`la migración v${paso.desde}→v${paso.hasta} no fija local_schema_version=${paso.hasta}`);
        }
        actual = siguiente;
      } catch {
        // ROLLBACK: el almacén original queda intacto.
        return { ok: false, store, codigo: ERRORES.MIGRACION_FALLIDA, mensaje: `migración v${paso.desde}→v${paso.hasta} falló` };
      }
    }
    return { ok: true, store: actual };
  };
}

/** Migraciones sintéticas de prueba (los fixtures de sync-cases.json las referencian por nombre). */
export const MIGRACIONES_SINTETICAS: Record<string, MigracionLocal> = {
  "sintetica-v1-v2": {
    desde: 1,
    hasta: 2,
    aplicar: (s) => ({ ...s, local_schema_version: 2, formato: "fv-store/2" }),
  },
  fallida: {
    desde: 1,
    hasta: 2,
    aplicar: () => {
      throw new Error("fallo inyectado para pruebas");
    },
  },
};
