// F&V — Tests de integridad (SHA-256) y firma (ECDSA P-256).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sha256Hex,
  generarParClaves,
  firmar,
  verificarFirma,
  firmarManifiesto,
  verificarManifiesto,
} from "../src/integrity.mjs";
import { VECTORS } from "./helpers.mjs";

test("sha256Hex calcula el hash esperado sobre UTF-8", () => {
  // Vector canónico compartido: el mismo hash se exige en TS y Kotlin.
  for (const v of VECTORS.canonical_vectors) {
    assert.equal(sha256Hex(v.canonical), v.sha256);
  }
});

test("round-trip de firma ECDSA con clave efímera", () => {
  const kp = generarParClaves();
  const signed = sha256Hex("mensaje de prueba");
  const sig = firmar(signed, kp.privateKeyB64);
  assert.equal(verificarFirma(signed, sig, kp.publicKeyB64), true);
});

test("una firma alterada no verifica", () => {
  const kp = generarParClaves();
  const signed = sha256Hex("mensaje de prueba");
  const sig = firmar(signed, kp.privateKeyB64);
  assert.equal(verificarFirma(signed, "AAAA", kp.publicKeyB64), false);
  assert.equal(verificarFirma(sha256Hex("otro mensaje"), sig, kp.publicKeyB64), false);
});

test("una clave ajena no verifica la firma", () => {
  const kp1 = generarParClaves();
  const kp2 = generarParClaves();
  const signed = sha256Hex("mensaje de prueba");
  const sig = firmar(signed, kp1.privateKeyB64);
  assert.equal(verificarFirma(signed, sig, kp2.publicKeyB64), false);
});

test("el vector de firma compartido verifica con su clave pública (compatibilidad de plataforma)", () => {
  const v = VECTORS.signature_vector;
  assert.equal(sha256Hex(v.message), v.signed);
  assert.equal(verificarFirma(v.signed, v.sig, v.public_key), true);
});

test("verificarManifiesto distingue firma ausente, clave desconocida e inválida", () => {
  const kp = generarParClaves();
  const truststore = { keys: [{ key_id: "test", public_key: kp.publicKeyB64 }] };
  const manifestText = '{"pack_id":"pack-fv-test"}';
  const signature = firmarManifiesto(manifestText, { keyId: "test", privateKeyB64: kp.privateKeyB64 });

  assert.deepEqual(verificarManifiesto(manifestText, signature, truststore), { ok: true });
  assert.equal(verificarManifiesto(manifestText, null, truststore).codigo, "FIRMA-AUSENTE");
  assert.equal(verificarManifiesto(manifestText, { ...signature, key_id: "otra" }, truststore).codigo, "CLAVE-DESCONOCIDA");
  assert.equal(verificarManifiesto(manifestText, { ...signature, sig: "AAAA" }, truststore).codigo, "FIRMA-INVALIDA");
  assert.equal(verificarManifiesto("{otro}", signature, truststore).codigo, "FIRMA-INVALIDA");
});
