// F&V — Integridad (SHA-256) y firma digital (ECDSA P-256) del contrato de sincronización.
// PARIDAD: mismo algoritmo que packages/sync-contracts/src/integrity.mjs (Node) y
// apps/web/src/packs/integrity.ts (WebCrypto). Mensaje firmado = bytes del hash 'signed'.
// Claves públicas: SPKI DER en base64 (truststore JSON). Firma: DER en base64.

package com.factronics.fv.data.pack

import org.json.JSONObject
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

object Integrity {

    fun sha256Hex(text: String): String = sha256Hex(text.toByteArray(Charsets.UTF_8))

    fun sha256Hex(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

    fun hexToBytes(hex: String): ByteArray {
        require(hex.length % 2 == 0) { "hex con longitud impar" }
        return ByteArray(hex.length / 2) { i ->
            ((hex[2 * i].digitToInt(16) shl 4) or hex[2 * i + 1].digitToInt(16)).toByte()
        }
    }

    /**
     * Verifica la firma ECDSA P-256 + SHA-256 sobre el hash 'signed' (hex).
     * Mismo esquema que node:crypto.sign("sha256", bytesDelHash).
     */
    fun verificarFirma(signedHex: String, sigB64: String, publicKeyB64: String): Boolean {
        return try {
            val pub = KeyFactory.getInstance("EC")
                .generatePublic(X509EncodedKeySpec(Base64.getDecoder().decode(publicKeyB64)))
            val sig = Signature.getInstance(Contract.SIGN_ALG)
            sig.initVerify(pub)
            sig.update(hexToBytes(signedHex))
            sig.verify(Base64.getDecoder().decode(sigB64))
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Verifica un bloque de firma contra un truststore.
     * @return null si es válida, o el código de error (FIRMA-AUSENTE / CLAVE-DESCONOCIDA / FIRMA-INVALIDA).
     */
    fun verificarManifiesto(manifestText: String, signature: JSONObject?, truststore: JSONObject): String? {
        if (signature == null) return Contract.Errores.FIRMA_AUSENTE
        val keyId = signature.optString("key_id", "")
        val clave = truststore.optJSONArray("keys")?.let { keys ->
            (0 until keys.length()).map { keys.getJSONObject(it) }.firstOrNull { it.optString("key_id") == keyId }
        } ?: return Contract.Errores.CLAVE_DESCONOCIDA
        val signed = sha256Hex(manifestText)
        if (signed != signature.optString("signed", "")) return Contract.Errores.FIRMA_INVALIDA
        if (!verificarFirma(signature.optString("signed", ""), signature.optString("sig", ""), clave.optString("public_key", ""))) {
            return Contract.Errores.FIRMA_INVALIDA
        }
        return null
    }
}
