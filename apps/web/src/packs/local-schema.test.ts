// F&V — Tests de las migraciones del almacén local (referencia paritaria).
// Paridad con packages/sync-contracts/test/local-schema.test.mjs (ADR-0009).
import { describe, it, expect } from "vitest";
import { crearMigradorLocal, MIGRACIONES_SINTETICAS } from "./localSchema";
import { FIXTURES } from "./testkit";
import type { AlmacenLocal, MigracionLocal } from "./types";

const migrarDefecto = crearMigradorLocal(Object.values(MIGRACIONES_SINTETICAS));

describe("almacén local (fixtures compartidos)", () => {
  for (const caso of FIXTURES.local_store_cases) {
    it(`almacén local: ${caso.name}`, () => {
      const versionObjetivo = caso.migracion === "ninguna" ? 1 : 2;
      const registro: MigracionLocal[] =
        caso.migracion === "fallida"
          ? [MIGRACIONES_SINTETICAS.fallida]
          : caso.migracion === "sintetica-v1-v2"
            ? [MIGRACIONES_SINTETICAS["sintetica-v1-v2"]]
            : [];
      const migrar = crearMigradorLocal(registro);
      const r = migrar(caso.store_in as AlmacenLocal | null, versionObjetivo);

      if (caso.expect_error) {
        expect(r.ok).toBe(false);
        expect(r.codigo).toBe(caso.expect_error);
        // ROLLBACK: el almacén queda exactamente como estaba.
        expect(r.store).toEqual(caso.expect_store);
      } else {
        expect(r.ok, r.mensaje ?? "").toBe(true);
        if (caso.expect_store) expect(r.store).toEqual(caso.expect_store);
        if (caso.expect_local_schema_version !== undefined) {
          expect(r.store.local_schema_version).toBe(caso.expect_local_schema_version);
        }
      }
    });
  }
});

it("sin ruta declarada no hay migración (nunca se adivina)", () => {
  const r = migrarDefecto({ local_schema_version: 5, packs: {} }, 6);
  expect(r.ok).toBe(false);
  expect(r.codigo).toBe("MIGRACION-FALLIDA");
  expect(r.store).toEqual({ local_schema_version: 5, packs: {} });
});

it("una migración encadenada aplica todas las etapas en orden", () => {
  const dobles = crearMigradorLocal([
    MIGRACIONES_SINTETICAS["sintetica-v1-v2"],
    { desde: 2, hasta: 3, aplicar: (s) => ({ ...s, local_schema_version: 3, formato: "fv-store/3" }) },
  ]);
  const r = dobles({ local_schema_version: 1, packs: {} }, 3);
  expect(r.ok).toBe(true);
  expect(r.store.local_schema_version).toBe(3);
  expect(r.store.formato).toBe("fv-store/3");
});
