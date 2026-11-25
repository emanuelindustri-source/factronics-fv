// F&V — Integridad (SHA-256) y firma digital (ECDSA P-256) del contrato de sincronización.
//
// - sha256Hex(data): hash sobre bytes UTF-8 (texto) o Uint8Array. Asíncrono: WebCrypto.
// - Firma: ECDSA P-256 + SHA-256 ("SHA256withECDSA"), firma DER en base64,
//   clave pública SPKI DER en base64 (sin PEM: el truststore es JSON).
//   El mensaje firmado es el hash 'signed' = sha256 de los bytes de sync-manifest.json.
// - Compatibilidad de plataforma: WebCrypto firma/verifica en formato IEEE P1363
//   (r||s), mientras que el contrato (y Node/Kotlin) usa DER. Este módulo convierte
//   entre ambos para que los bytes firmados sean interoperables (ver crypto-vectors.json).
// - Claves de prueba: generadas SIEMPRE en tiempo de ejecución (nunca en el repo).
//
// Paridad semántica con packages/sync-contracts/src/integrity.mjs (ADR-0009).

import { SIGN_ALG } from "./constants";
import type { SignatureBlock, Truststore } from "./types";

const encoder = new TextEncoder();

export { SIGN_ALG };

/** Puente de tipos Uint8Array → BufferSource (typed arrays genéricos de TS 5.7). */
const buf = (b: Uint8Array): BufferSource => b as unknown as BufferSource;

/** Hash SHA-256 en hex sobre UTF-8 (texto) o bytes. */
export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? encoder.encode(data) : data;
  const resumen = await crypto.subtle.digest("SHA-256", buf(bytes));
  return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("hex inválido");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error("hex inválido");
    out[i] = byte;
  }
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Convierte una firma ECDSA DER (SEQUENCE { INTEGER r, INTEGER s }) a IEEE P1363
 * (r||s, 32+32 bytes) que es lo que espera WebCrypto. Devuelve null si no es válida.
 */
function derToP1363(der: Uint8Array): Uint8Array | null {
  try {
    if (der.length < 8 || der[0] !== 0x30) return null;
    if ((der[1] & 0x80) !== 0) return null; // long-form: no aplica a P-256 (< 128 bytes)
    let i = 2;
    const leerEntero = (): Uint8Array | null => {
      if (der[i++] !== 0x02) return null;
      const len = der[i++];
      if (len === 0 || i + len > der.length) return null;
      const v = der.slice(i, i + len);
      i += len;
      return v;
    };
    const r = leerEntero();
    const s = leerEntero();
    if (!r || !s) return null;
    const crudo = new Uint8Array(64);
    if (!copiarEntero(r, crudo, 0) || !copiarEntero(s, crudo, 32)) return null;
    return crudo;
  } catch {
    return null;
  }
}

function copiarEntero(v: Uint8Array, destino: Uint8Array, despl: number): boolean {
  let inicio = 0;
  while (inicio < v.length - 1 && v[inicio] === 0) inicio++;
  const sinCeros = v.subarray(inicio);
  if (sinCeros.length > 32) return false;
  destino.set(sinCeros, despl + (32 - sinCeros.length));
  return true;
}

/** Convierte una firma IEEE P1363 (r||s) al DER canónico usado por el contrato. */
function p1363ToDer(crudo: Uint8Array): Uint8Array {
  const rEnc = enteroDer(recortarCeros(crudo.subarray(0, 32)));
  const sEnc = enteroDer(recortarCeros(crudo.subarray(32)));
  const total = rEnc.length + sEnc.length;
  const out = new Uint8Array(2 + total);
  out[0] = 0x30;
  out[1] = total;
  out.set(rEnc, 2);
  out.set(sEnc, 2 + rEnc.length);
  return out;
}

function recortarCeros(b: Uint8Array): Uint8Array {
  let i = 0;
  while (i < b.length - 1 && b[i] === 0) i++;
  return b.subarray(i);
}

function enteroDer(b: Uint8Array): Uint8Array {
  const relleno = (b[0] & 0x80) !== 0 ? 1 : 0;
  const out = new Uint8Array(2 + relleno + b.length);
  out[0] = 0x02;
  out[1] = b.length + relleno;
  if (relleno) out[2] = 0;
  out.set(b, 2 + relleno);
  return out;
}

/** Genera un par de claves EC P-256. Devuelve SPKI/PKCS8 DER en base64. */
export async function generarParClaves(): Promise<{ publicKeyB64: string; privateKeyB64: string }> {
  const par = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", par.publicKey));
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", par.privateKey));
  return { publicKeyB64: bytesToB64(spki), privateKeyB64: bytesToB64(pkcs8) };
}

/** Firma el hash 'signed' (hex) con la clave privada. Devuelve base64 DER. */
export async function firmar(signedHex: string, privateKeyB64: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    "pkcs8",
    buf(b64ToBytes(privateKeyB64)),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const cruda = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, clave, buf(hexToBytes(signedHex))),
  );
  return bytesToB64(p1363ToDer(cruda));
}

/** Verifica la firma sobre el hash 'signed' (hex) con la clave pública. */
export async function verificarFirma(signedHex: string, sigB64: string, publicKeyB64: string): Promise<boolean> {
  try {
    const clave = await crypto.subtle.importKey(
      "spki",
      buf(b64ToBytes(publicKeyB64)),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const firma = derToP1363(b64ToBytes(sigB64));
    if (!firma) return false;
    return await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      clave,
      buf(firma),
      buf(hexToBytes(signedHex)),
    );
  } catch {
    return false;
  }
}

/**
 * Firma completa de un manifiesto: devuelve el bloque signature.json.
 * @param manifestText contenido EXACTO de sync-manifest.json
 */
export async function firmarManifiesto(
  manifestText: string,
  { keyId, privateKeyB64 }: { keyId: string; privateKeyB64: string },
): Promise<SignatureBlock> {
  const signed = await sha256Hex(manifestText);
  return {
    alg: SIGN_ALG,
    key_id: keyId,
    signed,
    sig: await firmar(signed, privateKeyB64),
  };
}

export type ResultadoFirma =
  | { ok: true; codigo?: undefined }
  | { ok: false; codigo: "FIRMA-AUSENTE" | "CLAVE-DESCONOCIDA" | "FIRMA-INVALIDA" };

/**
 * Verifica un bloque de firma contra un truststore.
 * @returns codigo ∈ FIRMA-AUSENTE | CLAVE-DESCONOCIDA | FIRMA-INVALIDA
 */
export async function verificarManifiesto(
  manifestText: string,
  signature: SignatureBlock | null | undefined,
  truststore: Truststore | null | undefined,
): Promise<ResultadoFirma> {
  if (!signature || typeof signature !== "object") {
    return { ok: false, codigo: "FIRMA-AUSENTE" };
  }
  const clave = (truststore?.keys ?? []).find((k) => k.key_id === signature.key_id);
  if (!clave) return { ok: false, codigo: "CLAVE-DESCONOCIDA" };
  const signed = await sha256Hex(manifestText);
  if (signed !== signature.signed) return { ok: false, codigo: "FIRMA-INVALIDA" };
  if (!(await verificarFirma(signature.signed, signature.sig, clave.public_key))) {
    return { ok: false, codigo: "FIRMA-INVALIDA" };
  }
  return { ok: true };
}
