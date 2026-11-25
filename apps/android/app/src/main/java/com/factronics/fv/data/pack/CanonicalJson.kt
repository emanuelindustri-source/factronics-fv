// F&V — Serialización canónica JSON (claves ordenadas) para hashes y checksums.
// PARIDAD: debe producir los mismos bytes que packages/sync-contracts/src/canonical.mjs
// y apps/web/src/packs/canonical.ts. Los vectores compartidos en
// packages/shared-fixtures/sync/crypto-vectors.json lo comprueban en las 3 plataformas.
//
// Reglas: objeto → claves ordenadas (orden UTF-16, igual que JS Array.sort);
// arrays → orden preservado; números → SOLO enteros; strings → se escapan solo
// '"', '\', \n, \r, \t, \b, \f y controles < 0x20 (\u00XX); el resto en crudo UTF-8.

package com.factronics.fv.data.pack

import org.json.JSONArray
import org.json.JSONObject

object CanonicalJson {

    fun serialize(value: Any?): String = when (value) {
        null, JSONObject.NULL -> "null"
        is Boolean -> if (value) "true" else "false"
        is Int -> value.toString()
        is Long -> value.toString()
        is String -> quote(value)
        is JSONObject -> {
            val keys = value.keys().asSequence().toList().sorted()
            keys.joinToString(",", "{", "}") { k -> quote(k) + ":" + serialize(value.get(k)) }
        }
        is JSONArray -> (0 until value.length()).joinToString(",", "[", "]") { i -> serialize(value.get(i)) }
        else -> throw IllegalArgumentException("canonicalJson: tipo no soportado (${value::class.java.name})")
    }

    private fun quote(s: String): String {
        val out = StringBuilder("\"")
        for (ch in s) {
            when (ch) {
                '"' -> out.append("\\\"")
                '\\' -> out.append("\\\\")
                '\n' -> out.append("\\n")
                '\r' -> out.append("\\r")
                '\t' -> out.append("\\t")
                '\b' -> out.append("\\b")
                '\u000C' -> out.append("\\f")
                else -> if (ch.code < 0x20) {
                    out.append("\\u").append(ch.code.toString(16).padStart(4, '0'))
                } else {
                    out.append(ch)
                }
            }
        }
        return out.append("\"").toString()
    }
}
