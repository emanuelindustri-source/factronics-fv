// F&V — Genera el vector criptográfico compartido (crypto-vectors.json).
//
// Fija bytes exactos para probar la PARIDAD de la serialización canónica y del
// SHA-256 entre JavaScript, TypeScript y Kotlin, y comprueba que una firma ECDSA
// generada por Node es verificable por las tres plataformas.
//
// La clave del vector se genera aquí de forma efímera y se DESCARTA: solo se
// guarda la clave pública. No es un secreto (es un vector de prueba público).
//
// Uso: node tools/gen-sync-vectors.mjs

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../packages/sync-contracts/src/canonical.mjs";
import { sha256Hex, generarParClaves, firmar } from "../packages/sync-contracts/src/integrity.mjs";

const destino = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "shared-fixtures", "sync", "crypto-vectors.json");

const payloads = [
  {
    name: "objeto plano con claves desordenadas",
    payload: { b: 2, a: "hola", c: true, d: null },
  },
  {
    name: "anidado con arrays, acentos y CJK",
    payload: { zeta: [{ n: 1, s: "impresión ñandú" }, { s: "日本語テキスト", n: -3 }], alfa: { y: false, x: "tab\tnew\nline" } },
  },
  {
    name: "estructura de manifiesto de sincronización",
    payload: {
      pack_id: "pack-fv-test",
      contract_version: "1.0.0",
      demo: true,
      items_total: 3,
      files: [{ path: "pack.json", sha256: "0000", bytes: 12 }],
    },
  },
];

const canonicalVectors = payloads.map(({ name, payload }) => {
  const canonical = canonicalJson(payload);
  return { name, payload, canonical, sha256: sha256Hex(canonical) };
});

// Firma efímera: se descarta la clave privada; solo se publica la clave pública.
const { publicKeyB64, privateKeyB64 } = generarParClaves();
const mensaje = "F&V — vector de firma del contrato de sincronización v1";
const signed = sha256Hex(mensaje);
const sig = firmar(signed, privateKeyB64);

const salida = {
  nota: "Vector de prueba generado por tools/gen-sync-vectors.mjs. La clave privada se descartó al generarlo: NO es un secreto, es un vector público de compatibilidad. Verificado por JavaScript, TypeScript (PWA) y Kotlin (Android).",
  canonical_vectors: canonicalVectors,
  signature_vector: {
    alg: "SHA256withECDSA",
    key_id: "vector-pruebas",
    message: mensaje,
    signed,
    public_key: publicKeyB64,
    sig,
  },
};

writeFileSync(destino, JSON.stringify(salida, null, 2) + "\n", "utf8");
console.log(`crypto-vectors.json escrito en ${destino}`);
