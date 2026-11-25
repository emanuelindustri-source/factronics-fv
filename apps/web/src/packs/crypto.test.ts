// F&V — Tests de serialización canónica e integridad/firma (paridad de bytes y
// compatibilidad de plataforma JS = TS = Kotlin). Oráculos: crypto-vectors.json.
// Paridad con packages/sync-contracts/test/canonical.test.mjs e integrity.test.mjs.
import { describe, it, expect } from "vitest";
import { canonicalJson } from "./canonical";
import {
  sha256Hex,
  generarParClaves,
  firmar,
  verificarFirma,
  firmarManifiesto,
  verificarManifiesto,
} from "./integrity";
import { VECTORS } from "./testkit";

describe("serialización canónica", () => {
  it("los vectores compartidos se reproducen byte a byte (JS = TS = Kotlin)", async () => {
    for (const v of VECTORS.canonical_vectors) {
      const canonical = canonicalJson(v.payload);
      expect(canonical, `canonical distinto para '${v.name}'`).toBe(v.canonical);
      expect(await sha256Hex(canonical), `sha256 distinto para '${v.name}'`).toBe(v.sha256);
    }
  });

  it("las claves de los objetos se ordenan y los arrays conservan el orden", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
  });

  it("el escape de strings es mínimo y fijo (acentos y CJK en crudo UTF-8)", () => {
    expect(canonicalJson("a\"b\\c\nd\te")).toBe('"a\\"b\\\\c\\nd\\te"');
    expect(canonicalJson("ñandú 日本")).toBe('"ñandú 日本"');
    expect(canonicalJson("\u0001")).toBe('"\\u0001"');
  });

  it("solo se permiten enteros en documentos hasheados", () => {
    expect(canonicalJson({ x: -3 })).toBe('{"x":-3}');
    expect(() => canonicalJson({ x: 1.5 })).toThrow(/enteros/);
  });

  it("null, booleanos y estructuras anidadas", () => {
    expect(canonicalJson({ a: null, b: false, c: [{ d: true }] })).toBe('{"a":null,"b":false,"c":[{"d":true}]}');
  });
});

describe("integridad y firma ECDSA P-256", () => {
  it("sha256Hex calcula el hash esperado sobre UTF-8", async () => {
    for (const v of VECTORS.canonical_vectors) {
      expect(await sha256Hex(v.canonical)).toBe(v.sha256);
    }
  });

  it("round-trip de firma ECDSA con clave efímera", async () => {
    const kp = await generarParClaves();
    const signed = await sha256Hex("mensaje de prueba");
    const sig = await firmar(signed, kp.privateKeyB64);
    expect(await verificarFirma(signed, sig, kp.publicKeyB64)).toBe(true);
  });

  it("una firma alterada no verifica", async () => {
    const kp = await generarParClaves();
    const signed = await sha256Hex("mensaje de prueba");
    const sig = await firmar(signed, kp.privateKeyB64);
    expect(await verificarFirma(signed, "AAAA", kp.publicKeyB64)).toBe(false);
    expect(await verificarFirma(await sha256Hex("otro mensaje"), sig, kp.publicKeyB64)).toBe(false);
  });

  it("una clave ajena no verifica la firma", async () => {
    const kp1 = await generarParClaves();
    const kp2 = await generarParClaves();
    const signed = await sha256Hex("mensaje de prueba");
    const sig = await firmar(signed, kp1.privateKeyB64);
    expect(await verificarFirma(signed, sig, kp2.publicKeyB64)).toBe(false);
  });

  it("el vector de firma compartido verifica con su clave pública (compatibilidad de plataforma)", async () => {
    const v = VECTORS.signature_vector;
    expect(await sha256Hex(v.message)).toBe(v.signed);
    expect(await verificarFirma(v.signed, v.sig, v.public_key)).toBe(true);
  });

  it("verificarManifiesto distingue firma ausente, clave desconocida e inválida", async () => {
    const kp = await generarParClaves();
    const truststore = { keys: [{ key_id: "test", public_key: kp.publicKeyB64 }] };
    const manifestText = '{"pack_id":"pack-fv-test"}';
    const signature = await firmarManifiesto(manifestText, { keyId: "test", privateKeyB64: kp.privateKeyB64 });

    expect(await verificarManifiesto(manifestText, signature, truststore)).toEqual({ ok: true });
    expect((await verificarManifiesto(manifestText, null, truststore)).codigo).toBe("FIRMA-AUSENTE");
    expect((await verificarManifiesto(manifestText, { ...signature, key_id: "otra" }, truststore)).codigo).toBe("CLAVE-DESCONOCIDA");
    expect((await verificarManifiesto(manifestText, { ...signature, sig: "AAAA" }, truststore)).codigo).toBe("FIRMA-INVALIDA");
    expect((await verificarManifiesto("{otro}", signature, truststore)).codigo).toBe("FIRMA-INVALIDA");
  });
});
