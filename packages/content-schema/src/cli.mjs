#!/usr/bin/env node
// F&V — CLI del esquema de contenido.
//   node cli.mjs validate <packDir> [--json]   → valida estructura + procedencia
//   node cli.mjs migrate  <packDir> [--write]  → migra el pack a la versión vigente
//   node cli.mjs version                       → versión del esquema soportada

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadPack, ErrorCarga } from "./load.mjs";
import { validatePack } from "./validate.mjs";
import { migrar, CURRENT_SCHEMA_VERSION } from "./migrate.mjs";

const [, , comando, destino, ...flags] = process.argv;

function imprimirErrores(errores) {
  for (const e of errores) {
    console.error(`  ✗ [${e.regla}] ${e.id}: ${e.mensaje}`);
  }
}

function cmdValidate() {
  if (!destino) {
    console.error("Uso: node cli.mjs validate <packDir> [--json]");
    return 2;
  }
  let pack;
  try {
    pack = loadPack(destino);
  } catch (e) {
    if (e instanceof ErrorCarga) {
      console.error(`✗ Error de carga: ${e.message}`);
      return 1;
    }
    throw e;
  }

  const resultado = validatePack(pack);

  if (flags.includes("--json")) {
    console.log(JSON.stringify(resultado, null, 2));
    return resultado.valido ? 0 : 1;
  }

  console.log(`F&V — validación de contenido · esquema v${CURRENT_SCHEMA_VERSION}`);
  console.log(`Pack: ${destino} (demo: ${resultado.stats.demo ? "sí" : "no"})`);
  console.log(`Ítems: ${resultado.stats.total} · con source_ref: ${resultado.stats.conSourceRef} (${resultado.stats.pctSourceRef}%) · sin fuente: ${resultado.stats.sinSourceRef}`);
  console.log(`Por tipo: ${JSON.stringify(resultado.stats.porTipo)}`);

  if (resultado.avisos.length > 0) {
    console.log(`Avisos (${resultado.avisos.length}):`);
    for (const a of resultado.avisos) console.log(`  ! [${a.regla}] ${a.id}: ${a.mensaje}`);
  }

  if (resultado.valido) {
    console.log("✓ VALIDACIÓN CORRECTA: 0 errores. Todo dato técnico tiene fuente completa.");
    return 0;
  }
  console.error(`✗ VALIDACIÓN FALLIDA: ${resultado.errores.length} error(es).`);
  imprimirErrores(resultado.errores);
  return 1;
}

function cmdMigrate() {
  if (!destino) {
    console.error("Uso: node cli.mjs migrate <packDir> [--write]");
    return 2;
  }
  const pack = loadPack(destino);
  const resultado = migrar(pack);

  if (!resultado.ok) {
    console.error("✗ No se pudo migrar el pack:");
    for (const e of resultado.errores) console.error(`  ✗ ${e}`);
    return 1;
  }

  if (resultado.aplicadas.length === 0) {
    console.log(`✓ El pack ya está en schema_version ${CURRENT_SCHEMA_VERSION}: sin cambios.`);
    return 0;
  }

  console.log(`Migraciones aplicadas (${resultado.aplicadas.length}):`);
  for (const m of resultado.aplicadas) console.log(`  → ${m}`);

  if (flags.includes("--write")) {
    const { manifest, entries } = resultado.pack;
    writeFileSync(join(destino, "pack.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
    const porArchivo = new Map();
    for (const { archivo, item } of entries) {
      if (!porArchivo.has(archivo)) porArchivo.set(archivo, []);
      porArchivo.get(archivo).push(item);
    }
    for (const [archivo, items] of porArchivo) {
      writeFileSync(join(destino, archivo), JSON.stringify(items, null, 2) + "\n", "utf8");
    }
    console.log(`✓ Pack migrado y escrito en ${destino}.`);
  } else {
    console.log("(sin --write: no se escribió nada; ejecute con --write para guardar)");
  }
  return 0;
}

let codigo = 0;
switch (comando) {
  case "validate":
    codigo = cmdValidate();
    break;
  case "migrate":
    codigo = cmdMigrate();
    break;
  case "version":
    console.log(`@factronics-fv/content-schema · schema_version soportada: ${CURRENT_SCHEMA_VERSION}`);
    break;
  default:
    console.error("Uso: node cli.mjs <validate|migrate|version> [packDir] [--json|--write]");
    codigo = 2;
}
process.exit(codigo);
