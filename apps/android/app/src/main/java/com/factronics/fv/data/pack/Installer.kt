// F&V — Instalación de packs desde bundle .fvpack (validación completa, sin escritura).
// PARIDAD: port de packages/sync-contracts/src/installer.mjs con el MISMO orden de
// comprobaciones y códigos de error. La escritura atómica vive en FilePackStore.kt.

package com.factronics.fv.data.pack

import org.json.JSONArray
import org.json.JSONObject

object Installer {

    data class Validacion(val valido: Boolean, val errores: List<ErrorCod>, val motivo: String? = null, val codigo: String? = null)

    private val RE_PATH = Regex("^(pack\\.json|items/[a-z_]+\\.json|signature\\.json|sync-manifest\\.json)$")
    private val RE_HEX64 = Regex("^[0-9a-f]{64}$")
    private val RE_SEMVER = Regex("^\\d+\\.\\d+\\.\\d+$")

    /** Validación manual equivalente al JSON Schema del contrato (sync-manifest). */
    private fun manifestValido(m: JSONObject?): Boolean {
        if (m == null) return false
        for (campo in listOf("contract_version", "pack_id", "pack_version", "schema_version", "min_client_version", "creado", "responsable")) {
            val v = m.opt(campo)
            if (v !is String || v.isEmpty()) return false
        }
        for (campo in listOf("contract_version", "pack_version", "schema_version", "min_client_version")) {
            if (!RE_SEMVER.matches(m.getString(campo))) return false
        }
        if (m.opt("demo") !is Boolean) return false
        if (m.opt("items_total") !is Int) return false
        val files = m.opt("files") as? JSONArray ?: return false
        if (files.length() < 1) return false
        for (i in 0 until files.length()) {
            val f = files.opt(i) as? JSONObject ?: return false
            val path = f.opt("path") as? String ?: return false
            val sha = f.opt("sha256") as? String ?: return false
            if (!RE_PATH.matches(path) || !RE_HEX64.matches(sha)) return false
            if (f.opt("bytes") !is Int) return false
        }
        return true
    }

    private fun signatureValida(s: JSONObject?): Boolean {
        if (s == null) return false
        if (s.optString("alg") != Contract.SIGN_ALG) return false
        if (s.optString("key_id").isEmpty()) return false
        if (!RE_HEX64.matches(s.optString("signed"))) return false
        return s.optString("sig").isNotEmpty()
    }

    /**
     * Valida un bundle completo contra el contrato.
     * @param verificarArchivos false SOLO al restaurar packs ya sincronizados con deltas.
     */
    fun validarBundle(
        bundle: JSONObject?,
        truststore: JSONObject,
        clientVersion: String,
        instalado: PackState? = null,
        tamanoBytes: Long? = null,
        verificarArchivos: Boolean = true
    ): Validacion {
        val errores = mutableListOf<ErrorCod>()
        fun err(codigo: String, mensaje: String) = errores.add(ErrorCod(codigo, mensaje))

        // 0) Corrupción estructural básica.
        if (bundle == null) return Validacion(false, listOf(ErrorCod(Contract.Errores.PACK_CORRUPTO, "el bundle no es un objeto JSON")))
        if (tamanoBytes != null && tamanoBytes > Contract.BUNDLE_MAX_BYTES) {
            return Validacion(false, listOf(ErrorCod(Contract.Errores.BUNDLE_INVALIDO, "el bundle supera el límite de ${Contract.BUNDLE_MAX_BYTES} bytes")))
        }
        if (bundle.optString("bundle_format") != Contract.BUNDLE_FORMAT) {
            return Validacion(false, listOf(ErrorCod(Contract.Errores.BUNDLE_INVALIDO, "bundle_format '${bundle.optString("bundle_format")}' no soportado (esperado '${Contract.BUNDLE_FORMAT}')")))
        }

        // 1) Esquemas del contrato.
        val man = (bundle.opt("sync_manifest") as? JSONObject)?.takeIf { manifestValido(it) }
        if (man == null) {
            err(Contract.Errores.MANIFIESTO_INVALIDO, "sync-manifest inválido: campos requeridos ausentes o mal formados")
            return Validacion(false, errores)
        }
        val sig = bundle.opt("signature") as? JSONObject
        if (!signatureValida(sig)) {
            err(Contract.Errores.FIRMA_INVALIDA, "bloque de firma inválido: campos requeridos ausentes o mal formados")
        }

        // 2) Versión del contrato.
        val major = man.getString("contract_version").split(".")[0].toIntOrNull() ?: 0
        if (major != Contract.SUPPORTED_CONTRACT_MAJOR) {
            err(Contract.Errores.CONTRATO_VERSION, "contract_version '${man.getString("contract_version")}' fuera del rango soportado (mayor ${Contract.SUPPORTED_CONTRACT_MAJOR})")
        }

        // 3) Versión mínima de cliente.
        if (Contract.cmpSemver(clientVersion, man.getString("min_client_version")) < 0) {
            err(Contract.Errores.VERSION_CLIENTE, "el pack exige cliente >= ${man.getString("min_client_version")}; este cliente es $clientVersion")
        }

        // 4) Versión futura del esquema de contenido (nunca se adivina).
        if (Contract.cmpSemver(man.getString("schema_version"), Contract.CONTENT_SCHEMA_VERSION) > 0) {
            err(Contract.Errores.VERSION_FUTURA, "schema_version '${man.getString("schema_version")}' es futura (soportada: ${Contract.CONTENT_SCHEMA_VERSION})")
        }

        // 5) Downgrade / no-op respecto a lo instalado.
        if (instalado != null && instalado.packId == man.getString("pack_id")) {
            val cmp = Contract.cmpSemver(man.getString("pack_version"), instalado.packVersion ?: "0.0.0")
            if (cmp < 0) {
                err(Contract.Errores.DOWNGRADE, "pack_version '${man.getString("pack_version")}' es menor que la instalada '${instalado.packVersion}'")
            } else if (cmp == 0) {
                return Validacion(true, emptyList(), motivo = "ya-instalado")
            }
        }

        // 6) Integridad: hash de cada archivo declarado.
        val filesObj = bundle.opt("files") as? JSONObject ?: JSONObject()
        if (verificarArchivos) {
            val decl = man.getJSONArray("files")
            for (i in 0 until decl.length()) {
                val f = decl.getJSONObject(i)
                val path = f.getString("path")
                val content = filesObj?.opt(path) as? String
                if (content == null) {
                    err(Contract.Errores.PACK_CORRUPTO, "falta el archivo '$path' en el bundle")
                    continue
                }
                val h = Integrity.sha256Hex(content)
                if (h != f.getString("sha256")) {
                    err(Contract.Errores.HASH_INVALIDO, "hash inválido en '$path': declarado ${f.getString("sha256")}, calculado $h")
                }
                if (content.toByteArray(Charsets.UTF_8).size != f.getInt("bytes")) {
                    err(Contract.Errores.HASH_INVALIDO, "tamaño inválido en '$path': declarado ${f.getInt("bytes")}")
                }
            }
        }

        // 7) Firma digital sobre sync-manifest.json.
        val manifestText = filesObj?.opt("sync-manifest.json") as? String
        if (manifestText == null) {
            err(Contract.Errores.PACK_CORRUPTO, "falta sync-manifest.json dentro del bundle")
        } else {
            val codigoFirma = Integrity.verificarManifiesto(manifestText, sig, truststore)
            if (codigoFirma != null) err(codigoFirma, "firma no verificada ($codigoFirma)")
        }

        if (errores.isNotEmpty()) return Validacion(false, errores, codigo = errores[0].codigo)

        // 8) Validación de contenido (reglas semánticas de F1.1).
        val entries = mutableListOf<Pair<String, JSONObject>>()
        val rutas = filesObj?.keys()?.asSequence()?.toList() ?: emptyList()
        for (path in rutas) {
            if (!path.startsWith("items/")) continue
            val content = filesObj.getString(path)
            val arr = try {
                JSONArray(content)
            } catch (_: Exception) {
                err(Contract.Errores.PACK_CORRUPTO, "'$path' no es JSON válido")
                continue
            }
            for (i in 0 until arr.length()) {
                val item = arr.opt(i)
                if (item is JSONObject) entries.add(Pair(path, item)) else err(Contract.Errores.PACK_CORRUPTO, "'$path' contiene un ítem no objeto")
            }
        }
        if (errores.isNotEmpty()) return Validacion(false, errores, codigo = errores[0].codigo)

        val packManifest = bundle.opt("pack_manifest") as? JSONObject
        val contenido = ContentRules.validarContenido(packManifest, entries)
        if (!contenido.valido) {
            for (e in contenido.errores) {
                err(Contract.Errores.CONTENIDO_INVALIDO, "[${e.regla}] ${e.id}: ${e.mensaje}")
            }
            return Validacion(false, errores)
        }

        return Validacion(true, emptyList())
    }

    /** Construye el PackState a partir de un bundle YA validado (operación pura). */
    fun estadoDesdeBundle(bundle: JSONObject, isoNow: String): PackState {
        val man = bundle.getJSONObject("sync_manifest")
        val filesObj = bundle.getJSONObject("files")
        val files = mutableMapOf<String, String>()
        for (k in filesObj.keys()) files[k] = filesObj.getString(k)
        return PackState(
            packId = man.getString("pack_id"),
            packVersion = man.getString("pack_version"),
            schemaVersion = man.getString("schema_version"),
            minClientVersion = man.getString("min_client_version"),
            demo = man.optBoolean("demo", false),
            lastAppliedSequence = 0,
            files = files,
            tombstones = emptyMap(),
            syncManifest = JSONObject(man.toString()),
            syncManifestText = filesObj.optString("sync-manifest.json", ""),
            signature = bundle.opt("signature") as? JSONObject,
            installedAt = isoNow,
            updatedAt = isoNow
        )
    }

    /** Instalación completa (referencia): valida y produce el nuevo estado. */
    fun instalarBundle(
        bundle: JSONObject?,
        truststore: JSONObject,
        clientVersion: String,
        instalado: PackState?,
        isoNow: String,
        tamanoBytes: Long? = null,
        verificarArchivos: Boolean = true
    ): Pair<Resultado, PackState?> {
        val v = validarBundle(bundle, truststore, clientVersion, instalado, tamanoBytes, verificarArchivos)
        if (!v.valido) return Resultado(false, v.errores) to null
        if (v.motivo == "ya-instalado") return Resultado(true, emptyList(), "ya-instalado") to instalado
        return Resultado(true, emptyList()) to estadoDesdeBundle(bundle!!, isoNow)
    }

    /** Resumen visible en Ajustes. */
    fun resumenDe(state: PackState): JSONObject {
        val out = JSONObject()
        if (state.packId == null) {
            out.put("instalado", false)
            return out
        }
        val indices = PackStoreOps.construirIndices(state)
        out.put("instalado", true)
        out.put("packId", state.packId)
        out.put("packVersion", state.packVersion ?: "")
        out.put("schemaVersion", state.schemaVersion ?: "")
        out.put("demo", state.demo)
        out.put("itemsTotal", PackStoreOps.entriesDe(state).size)
        out.put("tamanoBytes", PackStoreOps.tamanoBytes(state))
        out.put("installedAt", state.installedAt ?: "")
        out.put("updatedAt", state.updatedAt ?: "")
        out.put("indicesPorId", indices.porId.size)
        out.put("indicesPorTipo", indices.porTipo.size)
        out.put("indicesPorTecnologia", indices.porTecnologia.size)
        return out
    }
}
