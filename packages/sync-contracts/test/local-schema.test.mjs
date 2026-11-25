// F&V — Tests de las migraciones del almacén local (referencia paritaria).
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearMigradorLocal, MIGRACIONES_SINTETICAS } from "../src/localSchema.mjs";
import { FIXTURES } from "./helpers.mjs";

const migrarDefecto = crearMigradorLocal(Object.values(MIGRACIONES_SINTETICAS));

for (const caso of FIXTURES.local_store_cases) {
  test(`almacén local: ${caso.name}`, () => {
    const versionObjetivo = caso.migracion === "ninguna" ? 1 : 2;
    const registro =
      caso.migracion === "fallida"
        ? [MIGRACIONES_SINTETICAS.fallida]
        : caso.migracion === "sintetica-v1-v2"
          ? [MIGRACIONES_SINTETICAS["sintetica-v1-v2"]]
          : [];
    const migrar = crearMigradorLocal(registro);
    const r = migrar(caso.store_in, versionObjetivo);

    if (caso.expect_error) {
      assert.equal(r.ok, false);
      assert.equal(r.codigo, caso.expect_error);
      // ROLLBACK: el almacén queda exactamente como estaba.
      assert.deepEqual(r.store, caso.expect_store);
    } else {
      assert.equal(r.ok, true, r.mensaje ?? "");
      if (caso.expect_store) assert.deepEqual(r.store, caso.expect_store);
      if (caso.expect_local_schema_version !== undefined) {
        assert.equal(r.store.local_schema_version, caso.expect_local_schema_version);
      }
    }
  });
}

test("sin ruta declarada no hay migración (nunca se adivina)", () => {
  const r = migrarDefecto({ local_schema_version: 5, packs: {} }, 6);
  assert.equal(r.ok, false);
  assert.equal(r.codigo, "MIGRACION-FALLIDA");
  assert.deepEqual(r.store, { local_schema_version: 5, packs: {} });
});

test("una migración encadenada aplica todas las etapas en orden", () => {
  const dobles = crearMigradorLocal([
    MIGRACIONES_SINTETICAS["sintetica-v1-v2"],
    { desde: 2, hasta: 3, aplicar: (s) => ({ ...s, local_schema_version: 3, formato: "fv-store/3" }) },
  ]);
  const r = dobles({ local_schema_version: 1, packs: {} }, 3);
  assert.equal(r.ok, true);
  assert.equal(r.store.local_schema_version, 3);
  assert.equal(r.store.formato, "fv-store/3");
});
