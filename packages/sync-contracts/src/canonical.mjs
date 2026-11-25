// F&V — Serialización canónica JSON (claves ordenadas) para hashes y checksums.
//
// La forma canónica es CONTRATO entre plataformas: JavaScript (herramientas),
// TypeScript (PWA) y Kotlin (Android) deben producir bytes idénticos.
// Reglas:
//   - Objeto: claves ordenadas por punto de código Unicode (sort() UTF-16 en JS;
//     ver test de vector compartido: los datos del dominio son ASCII en claves).
//   - Arrays: orden preservado.
//   - Números: SOLO enteros (los datos firmados/hasheados no llevan decimales).
//   - Strings: se escapan solo '"', '\\', \n, \r, \t, \b, \f y controles < 0x20
//     (\u00XX). El resto de caracteres (incluido acentos y CJK) van en crudo UTF-8.
//   - null/true/false literales.

export function canonicalJson(value) {
  return serialize(value);
}

function serialize(v) {
  if (v === null) return "null";
  const t = typeof v;
  if (t === "boolean") return v ? "true" : "false";
  if (t === "number") {
    if (!Number.isInteger(v)) {
      throw new Error("canonicalJson: solo se permiten enteros en documentos hasheados");
    }
    return String(v);
  }
  if (t === "string") return quote(v);
  if (t === "object") {
    if (Array.isArray(v)) return "[" + v.map(serialize).join(",") + "]";
    const keys = Object.keys(v).sort();
    return "{" + keys.map((k) => quote(k) + ":" + serialize(v[k])).join(",") + "}";
  }
  throw new Error(`canonicalJson: tipo no soportado (${t})`);
}

function quote(s) {
  let out = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (ch === "\b") out += "\\b";
    else if (ch === "\f") out += "\\f";
    else if (c < 0x20) out += "\\u" + c.toString(16).padStart(4, "0");
    else out += ch;
  }
  return out + '"';
}
