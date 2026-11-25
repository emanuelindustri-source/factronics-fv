// F&V — Constantes del contrato de sincronización (v1.0.0) — port Kotlin.
// PARIDAD: los códigos de error son contrato compartido con
// packages/sync-contracts/src/constants.mjs y apps/web/src/packs/constants.ts.

package com.factronics.fv.data.pack

object Contract {
    const val CONTRACT_VERSION = "1.0.0"
    const val SUPPORTED_CONTRACT_MAJOR = 1
    const val BUNDLE_FORMAT = "fvpack/1"
    const val BACKUP_FORMAT = "fv-backup"
    const val BACKUP_FORMAT_VERSION = "1.0.0"
    const val CONTENT_SCHEMA_VERSION = "1.0.0"
    const val LOCAL_SCHEMA_VERSION = 1
    const val SIGN_ALG = "SHA256withECDSA"
    const val BACKUP_MAX_BYTES = 50L * 1024 * 1024
    const val BUNDLE_MAX_BYTES = 20L * 1024 * 1024

    val PREFIJOS = mapOf(
        "tecnologia" to "tec", "familia" to "fam", "generacion" to "gen", "modelo" to "mod",
        "sistema" to "sis", "componente" to "cmp", "numero_parte" to "prt", "codigo_error" to "err",
        "tinta" to "ink", "documento" to "doc", "pagina" to "pag", "fragmento" to "frag",
        "pregunta" to "qst", "intento" to "att", "certificado" to "crt"
    )

    val CAMPOS_SOURCE_REF = listOf(
        "documento", "codigo_oficial", "revision", "pagina",
        "cita_textual", "confianza", "revisor", "fecha_revision"
    )

    object Reglas {
        const val FALTA_PROCEDENCIA = "FALTA-PROCEDENCIA"
        const val SOURCE_INCOMPLETO = "SOURCE-REF-INCOMPLETO"
        const val ID_FORMATO = "ID-FORMATO"
        const val ID_TIPO = "ID-TIPO"
        const val ID_DUPLICADO = "ID-DUPLICADO"
        const val SCHEMA_VERSION = "SCHEMA-VERSION"
        const val ARCHIVO_TIPO = "ARCHIVO-TIPO"
        const val DEMO_ETIQUETA = "DEMO-ETIQUETA"
        const val DEMO_CODIGO = "DEMO-CODIGO"
        const val CERTIFICADO_AVISO = "CERTIFICADO-AVISO"
        const val CERTIFICADO_PROGRAMA = "CERTIFICADO-PROGRAMA"
        const val PREGUNTA_RESPUESTA = "PREGUNTA-RESPUESTA"
    }

    object Errores {
        const val CONTRATO_VERSION = "CONTRATO-VERSION"
        const val MANIFIESTO_INVALIDO = "MANIFIESTO-INVALIDO"
        const val BUNDLE_INVALIDO = "BUNDLE-INVALIDO"
        const val HASH_INVALIDO = "HASH-INVALIDO"
        const val FIRMA_AUSENTE = "FIRMA-AUSENTE"
        const val FIRMA_INVALIDA = "FIRMA-INVALIDA"
        const val CLAVE_DESCONOCIDA = "CLAVE-DESCONOCIDA"
        const val VERSION_FUTURA = "VERSION-FUTURA"
        const val DOWNGRADE = "DOWNGRADE"
        const val VERSION_CLIENTE = "VERSION-CLIENTE"
        const val PACK_CORRUPTO = "PACK-CORRUPTO"
        const val CONTENIDO_INVALIDO = "CONTENIDO-INVALIDO"
        const val ORDEN_INVALIDO = "ORDEN-INVALIDO"
        const val BASE_DESCUADRE = "BASE-DESCUADRE"
        const val TOMBSTONE_CONFLICTO = "TOMBSTONE-CONFLICTO"
        const val RESPALDO_CORRUPTO = "RESPALDO-CORRUPTO"
        const val RESPALDO_GRANDE = "RESPALDO-DEMASIADO-GRANDE"
        const val RESPALDO_VERSION = "RESPALDO-VERSION"
        const val DISCO_LLENO = "DISCO-LLENO"
        const val ESCRITURA_INTERRUMPIDA = "ESCRITURA-INTERRUMPIDA"
        const val MIGRACION_FALLIDA = "MIGRACION-FALLIDA"
        const val PACK_NO_INSTALADO = "PACK-NO-INSTALADO"
    }

    val PREFIJO_CODIGO_DEMO = Regex("^DEMO[-_]", RegexOption.IGNORE_CASE)
    const val ETIQUETA_DEMO = "DEMO"

    /** Compara versiones semánticas: -1 si a < b, 0 si igual, 1 si a > b. */
    fun cmpSemver(a: String, b: String): Int {
        val pa = a.split(".").map { it.toIntOrNull() ?: 0 }
        val pb = b.split(".").map { it.toIntOrNull() ?: 0 }
        for (i in 0..2) {
            val x = pa.getOrElse(i) { 0 }
            val y = pb.getOrElse(i) { 0 }
            if (x != y) return if (x < y) -1 else 1
        }
        return 0
    }
}

/** Error tipado del contrato: lleva siempre un código de Contract.Errores. */
class ErrorContrato(val codigo: String, mensaje: String) : Exception("[$codigo] $mensaje")

/** Resultado de validación con errores con código. */
data class ErrorCod(val codigo: String, val mensaje: String)

data class Resultado(val ok: Boolean, val errores: List<ErrorCod>, val motivo: String? = null) {
    companion object {
        fun ok(motivo: String? = null) = Resultado(true, emptyList(), motivo)
        fun rechazo(codigo: String, mensaje: String) = Resultado(false, listOf(ErrorCod(codigo, mensaje)), null)
    }
}
