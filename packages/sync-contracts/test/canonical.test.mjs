// F&V — Tests de la serialización canónica (paridad de bytes entre plataformas).
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalJson } from "../src/canonical.mjs";
import { sha256Hex } from "../src/integrity.mjs";
import { VECTORS } from "./helpers.mjs";

test("los vectores compartidos se reproducen byte a byte (JS = TS = Kotlin)", () => {
  for (const v of VECTORS.canonical_vectors) {
    const canonical = canonicalJson(v.payload);
    assert.equal(canonical, v.canonical, `canonical distinto para '${v.name}'`);
    assert.equal(sha256Hex(canonical), v.sha256, `sha256 distinto para '${v.name}'`);
  }
});

test("las claves de los objetos se ordenan y los arrays conservan el orden", () => {
  assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(canonicalJson([3, 1, 2]), "[3,1,2]");
});

test("el escape de strings es mínimo y fijo (acentos y CJK en crudo UTF-8)", () => {
  assert.equal(canonicalJson("a\"b\\c\nd\te"), '"a\\"b\\\\c\\nd\\te"');
  assert.equal(canonicalJson("ñandú 日本"), '"ñandú 日本"');
  assert.equal(canonicalJson("\u0001"), '"\\u0001"');
});

test("solo se permiten enteros en documentos hasheados", () => {
  assert.equal(canonicalJson({ x: -3 }), '{"x":-3}');
  assert.throws(() => canonicalJson({ x: 1.5 }), /enteros/);
});

test("null, booleanos y estructuras anidadas", () => {
  assert.equal(canonicalJson({ a: null, b: false, c: [{ d: true }] }), '{"a":null,"b":false,"c":[{"d":true}]}');
});
