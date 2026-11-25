// F&V — Tests del mecanismo de migraciones de esquema.
// El registro real está vacío en v1.0.0; el mecanismo se prueba con migraciones sintéticas.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createMigrador, migrar, CURRENT_SCHEMA_VERSION, MIGRATIONS, cmpSemver } from "../src/migrate.mjs";
import { loadPack } from "../src/load.mjs";

const FIXTURES = fileURLToPath(new URL("../../shared-fixtures/content/", import.meta.url));
const PACK_DEMO = fileURLToPath(new URL("../../content-packs-demo/", import.meta.url));

function fixture(ruta) {
  return JSON.parse(readFileSync(`${FIXTURES}${ruta}`, "utf8"));
}

function packMini(schemaVersion) {
  return {
    manifest: { ...fixture("manifestos/pack-demo-valido.json"), schema_version: schemaVersion },
    entries: [],
  };
}

describe("migraciones: mecanismo declarado", () => {
  test("un pack ya en la versión vigente no se toca", () => {
    const r = migrar(packMini(CURRENT_SCHEMA_VERSION));
    assert.equal(r.ok, true);
    assert.deepEqual(r.aplicadas, []);
  });

  test("un pack más nuevo que la herramienta se rechaza (no se adivina)", () => {
    const r = migrar(packMini("2.0.0"));
    assert.equal(r.ok, false);
    assert.match(r.errores[0], /MÁS NUEVA/);
  });

  test("sin ruta de migración declarada, un pack viejo no se inventa: se rechaza", () => {
    const r = migrar(packMini("0.9.0"));
    assert.equal(r.ok, false);
    assert.match(r.errores[0], /sin ruta de migración declarada/);
  });

  test("una migración sintética declarada transforma y normaliza el pack", () => {
    const migrador = createMigrador([
      {
        desde: "0.9.0",
        hasta: "1.0.0",
        descripcion: "migración de prueba",
        aplicar(pack) {
          const p = structuredClone(pack);
          for (const e of p.entries) e.item.revision = (e.item.revision ?? 1) + 1;
          return p;
        },
      },
    ]);
    const pack = packMini("0.9.0");
    pack.entries = [
      {
        archivo: "items/tecnologia.json",
        item: { ...fixture("validos/tecnologia-demo.json"), schema_version: "0.9.0" },
      },
    ];
    const r = migrador(pack);
    assert.equal(r.ok, true);
    assert.equal(r.aplicadas.length, 1);
    assert.match(r.aplicadas[0], /0\.9\.0 → 1\.0\.0/);
    assert.equal(r.pack.manifest.schema_version, CURRENT_SCHEMA_VERSION);
    assert.equal(r.pack.entries[0].item.schema_version, CURRENT_SCHEMA_VERSION);
    assert.equal(r.pack.entries[0].item.revision, 2);
  });

  test("una migración que no avanza de versión se rechaza", () => {
    const migrador = createMigrador([
      {
        desde: "0.9.0",
        hasta: "0.9.0",
        aplicar: (p) => p,
      },
    ]);
    const r = migrador(packMini("0.9.0"));
    assert.equal(r.ok, false);
    assert.match(r.errores[0], /debe avanzar/);
  });

  test("el registro real MIGRATIONS existe (vacío en v1) y el comparador semver funciona", () => {
    assert.ok(Array.isArray(MIGRATIONS));
    assert.equal(cmpSemver("1.0.0", "1.0.0"), 0);
    assert.equal(cmpSemver("1.0.0", "1.0.1"), -1);
    assert.equal(cmpSemver("2.0.0", "1.9.9"), 1);
  });
});

describe("migraciones: pack demo real", () => {
  test("el pack del repositorio ya está en la versión vigente", () => {
    const r = migrar(loadPack(PACK_DEMO));
    assert.equal(r.ok, true);
    assert.deepEqual(r.aplicadas, []);
  });
});
