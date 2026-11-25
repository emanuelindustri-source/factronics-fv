// F&V — Integridad (SHA-256) y firma digital (ECDSA P-256) del contrato de sincronización.
//
// - sha256Hex(data): hash sobre bytes UTF-8 (texto) o Buffer.
// - Firma: ECDSA P-256 + SHA-256 ("SHA256withECDSA"), firma DER en base64,
//   clave pública SPKI DER en base64 (sin PEM: el truststore es JSON).
//   El mensaje firmado es el hash 'signed' = sha256 de los bytes de sync-manifest.json.
// - Claves de prueba: generadas SIEMPRE en tiempo de ejecución (nunca en el repo).
//   La clave DEMO del pack demo se guarda solo en _private/ (gitignored); lo único
//   que se publica es la clave pública en truststore.json, etiquetada como DEMO.

import { createHash, generateKeyPairSync, sign as nodeSign, verify as nodeVerify, createPrivateKey, createPublicKey } from "node:crypto";

export function sha256Hex(data) {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return createHash("sha256").update(buf).digest("hex");
}

export const SIGN_ALG = "SHA256withECDSA";

/** Genera un par de claves EC P-256. Devuelve SPKI/PKCS8 DER en base64. */
export function generarParClaves() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  return {
    publicKeyB64: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    privateKeyB64: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
  };
}

/** Firma el hash 'signed' (hex) con la clave privada. Devuelve base64 DER. */
export function firmar(signedHex, privateKeyB64) {
  const key = createPrivateKey({ key: Buffer.from(privateKeyB64, "base64"), format: "der", type: "pkcs8" });
  return nodeSign("sha256", Buffer.from(signedHex, "hex"), key).toString("base64");
}

/** Verifica la firma sobre el hash 'signed' (hex) con la clave pública. */
export function verificarFirma(signedHex, sigB64, publicKeyB64) {
  try {
    const key = createPublicKey({ key: Buffer.from(publicKeyB64, "base64"), format: "der", type: "spki" });
    return nodeVerify("sha256", Buffer.from(signedHex, "hex"), key, Buffer.from(sigB64, "base64"));
  } catch {
    return false;
  }
}

/**
 * Firma completa de un manifiesto: devuelve el bloque signature.json.
 * @param {string} manifestText contenido EXACTO de sync-manifest.json
 */
export function firmarManifiesto(manifestText, { keyId, privateKeyB64 }) {
  const signed = sha256Hex(manifestText);
  return {
    alg: SIGN_ALG,
    key_id: keyId,
    signed,
    sig: firmar(signed, privateKeyB64),
  };
}

/**
 * Verifica un bloque de firma contra un truststore.
 * @returns {{ ok: boolean, codigo?: string }} codigo ∈ FIRMA-AUSENTE | CLAVE-DESCONOCIDA | FIRMA-INVALIDA
 */
export function verificarManifiesto(manifestText, signature, truststore) {
  if (!signature || typeof signature !== "object") {
    return { ok: false, codigo: "FIRMA-AUSENTE" };
  }
  const clave = (truststore?.keys ?? []).find((k) => k.key_id === signature.key_id);
  if (!clave) return { ok: false, codigo: "CLAVE-DESCONOCIDA" };
  const signed = sha256Hex(manifestText);
  if (signed !== signature.signed) return { ok: false, codigo: "FIRMA-INVALIDA" };
  if (!verificarFirma(signature.signed, signature.sig, clave.public_key)) {
    return { ok: false, codigo: "FIRMA-INVALIDA" };
  }
  return { ok: true };
}
