// F&V — Genera apps/web/src/generated/demo-pack.ts con el pack demo embebido.
//
// Lee el bundle .fvpack y el truststore publicados en packages/content-packs-demo
// (SOLO contenido demo autorizado, ADR-0003) y escribe literales TypeScript
// tipados. El archivo generado se commitea y se regenera automáticamente antes
// del build con el hook "prebuild" de npm. NO editar a mano.
//
// Uso: node scripts/gen-demo-pack.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dirScripts = dirname(fileURLToPath(import.meta.url));
const dirWeb = join(dirScripts, "..");
const dirRepo = join(dirWeb, "..", "..");

const rutaBundle = join(dirRepo, "packages", "content-packs-demo", "bundle", "pack-fv-demo.fvpack");
const rutaTruststore = join(dirRepo, "packages", "content-packs-demo", "bundle", "truststore.json");
const rutaSalida = join(dirWeb, "src", "generated", "demo-pack.ts");

const bundle = JSON.parse(readFileSync(rutaBundle, "utf8"));
const truststore = JSON.parse(readFileSync(rutaTruststore, "utf8"));

const cabecera = `// F&V — GENERADO por apps/web/scripts/gen-demo-pack.mjs. NO EDITAR A MANO.
// Pack demo F&V (contenido DEMO autorizado, ADR-0003): datos ficticios de
// práctica que no describen equipos reales. Se regenera con "npm run prebuild".
import type { BundleDoc, Truststore } from "../packs/types";

`;

const codigo =
  cabecera +
  `export const DEMO_BUNDLE: BundleDoc = ` +
  JSON.stringify(bundle, null, 2) +
  ";\n\n" +
  `export const DEMO_TRUSTSTORE: Truststore = ` +
  JSON.stringify(truststore, null, 2) +
  ";\n";

mkdirSync(dirname(rutaSalida), { recursive: true });
writeFileSync(rutaSalida, codigo, "utf8");
console.log(`demo-pack.ts generado (${codigo.length} bytes) en ${rutaSalida}`);
