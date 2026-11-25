// F&V — Carga de packs de contenido desde disco.
// Estructura de un pack:
//   <pack>/pack.json          → manifiesto (schemas/pack.schema.json)
//   <pack>/items/<tipo>.json  → array de ítems de ese tipo (uno por tipo en v1)

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

export class ErrorCarga extends Error {}

/**
 * Carga un pack completo.
 * @param {string} dir carpeta del pack (contiene pack.json y items/)
 * @returns {{ manifest: object, entries: Array<{archivo: string, item: object}> }}
 */
export function loadPack(dir) {
  const rutaManifest = join(dir, "pack.json");
  if (!existsSync(rutaManifest)) {
    throw new ErrorCarga(`No existe el manifiesto del pack: ${rutaManifest}`);
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(rutaManifest, "utf8"));
  } catch (e) {
    throw new ErrorCarga(`pack.json no es JSON válido: ${e.message}`);
  }

  const dirItems = join(dir, "items");
  if (!existsSync(dirItems)) {
    throw new ErrorCarga(`No existe la carpeta de ítems: ${dirItems}`);
  }

  const entries = [];
  const archivos = readdirSync(dirItems).filter((f) => f.endsWith(".json")).sort();
  if (archivos.length === 0) {
    throw new ErrorCarga(`La carpeta items/ no contiene archivos JSON: ${dirItems}`);
  }

  for (const archivo of archivos) {
    const ruta = join(dirItems, archivo);
    let datos;
    try {
      datos = JSON.parse(readFileSync(ruta, "utf8"));
    } catch (e) {
      throw new ErrorCarga(`${archivo} no es JSON válido: ${e.message}`);
    }
    if (!Array.isArray(datos)) {
      throw new ErrorCarga(`${archivo} debe contener un array de ítems`);
    }
    for (const item of datos) {
      entries.push({ archivo: `items/${basename(archivo)}`, item });
    }
  }

  return { manifest, entries };
}
