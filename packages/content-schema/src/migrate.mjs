// F&V — Migraciones de esquema de contenido (mecanismo declarativo).
//
// Reglas de versionado (semver del esquema, campo 'schema_version'):
//   MAJOR → cambio incompatible: requiere migración declarada para leer packs viejos.
//   MINOR → adiciones compatibles: los packs viejos siguen siendo válidos.
//   PATCH → correcciones de documentación/esquema sin impacto en los datos.
//
// Cada migración es un objeto { desde, hasta, descripcion, aplicar(pack) } que
// transforma un pack completo (manifiesto + ítems) de una versión a otra.
// El validador rechaza packs con schema_version distinto a la vigente y ordena
// ejecutar 'npm run migrate:content'. Un pack MÁS NUEVO que el validador nunca
// se "adivina": se rechaza y se actualiza la herramienta.
//
// En v1.0.0 no hay migraciones (es la primera versión). El mecanismo queda
// probado con migraciones sintéticas en test/migrate.test.mjs.

export const CURRENT_SCHEMA_VERSION = "1.0.0";

/** Registro de migraciones declaradas. Agregue aquí las futuras, en orden. */
export const MIGRATIONS = [];

function cmpSemver(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0) ? -1 : 1;
  }
  return 0;
}

/**
 * Crea un migrador con una lista de migraciones dada.
 * @param {Array<{desde:string, hasta:string, descripcion?:string, aplicar:(p:object)=>object}>} migraciones
 */
export function createMigrador(migraciones) {
  return function migrar(pack) {
    const desde = pack?.manifest?.schema_version;
    if (typeof desde !== "string") {
      return { ok: false, errores: ["el manifiesto del pack no declara schema_version"], aplicadas: [] };
    }
    if (cmpSemver(desde, CURRENT_SCHEMA_VERSION) > 0) {
      return {
        ok: false,
        errores: [
          `el pack usa schema_version ${desde}, MÁS NUEVA que la soportada por esta herramienta (${CURRENT_SCHEMA_VERSION}); actualice @factronics-fv/content-schema antes de validar`,
        ],
        aplicadas: [],
      };
    }

    let actual = structuredClone(pack);
    const aplicadas = [];
    let v = desde;

    while (cmpSemver(v, CURRENT_SCHEMA_VERSION) < 0) {
      const m = migraciones.find((x) => cmpSemver(x.desde, v) === 0);
      if (!m) {
        return {
          ok: false,
          errores: [`sin ruta de migración declarada desde schema_version ${v} hacia ${CURRENT_SCHEMA_VERSION}`],
          aplicadas,
        };
      }
      if (cmpSemver(m.hasta, v) <= 0) {
        return {
          ok: false,
          errores: [`migración inválida ${m.desde} → ${m.hasta}: cada migración debe avanzar de versión`],
          aplicadas,
        };
      }
      actual = m.aplicar(actual);
      aplicadas.push(`${m.desde} → ${m.hasta}${m.descripcion ? ` (${m.descripcion})` : ""}`);
      v = m.hasta;
    }

    // Normaliza versiones al terminar.
    actual.manifest.schema_version = CURRENT_SCHEMA_VERSION;
    for (const e of actual.entries ?? []) e.item.schema_version = CURRENT_SCHEMA_VERSION;

    return { ok: true, pack: actual, errores: [], aplicadas };
  };
}

/** Migrador oficial con el registro de migraciones del proyecto (vacío en v1). */
export const migrar = createMigrador(MIGRATIONS);

export { cmpSemver };
