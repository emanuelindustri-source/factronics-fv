// F&V — Backup local: export/import versionado con integridad y privacidad.
// PARIDAD: port de packages/sync-contracts/src/backup.mjs. Política de privacidad:
// SOLO packs, estado de sincronización y preferencias no personales. Nada de datos
// personales ni secretos (ADR-0009).

package com.factronics.fv.data.pack

import org.json.JSONArray
import org.json.JSONObject

object BackupManager {

    /** Serialización canónica del backup sin 'checksum'. */
    fun payloadChecksum(backup: JSONObject): String {
        val copia = JSONObject(backup.toString())
        copia.remove("checksum")
        return Integrity.sha256Hex(CanonicalJson.serialize(copia))
    }

    /**
     * Crea un archivo de backup a partir de los estados instalados.
     * @param settings preferencias NO personales (language, theme_mode, ...)
     */
    fun crearBackup(
        packs: List<PackState>,
        settings: JSONObject,
        source: String,
        created: String,
        appMinVersion: String
    ): JSONObject {
        val backup = JSONObject()
        backup.put("format", Contract.BACKUP_FORMAT)
        backup.put("format_version", Contract.BACKUP_FORMAT_VERSION)
        backup.put("app_min_version", appMinVersion)
        backup.put("created", created)
        backup.put("source", source)
        backup.put("local_schema_version", Contract.LOCAL_SCHEMA_VERSION)

        val packsArr = JSONArray()
        val syncArr = JSONArray()
        for (estado in packs) {
            val filesObj = JSONObject()
            for ((path, content) in estado.files) filesObj.put(path, content)
            if (!filesObj.has("sync-manifest.json")) {
                filesObj.put("sync-manifest.json", estado.syncManifestText)
            }
            val entry = JSONObject()
            entry.put("sync_manifest", estado.syncManifest)
            entry.put("signature", estado.signature ?: JSONObject.NULL)
            entry.put("pack_manifest", JSONObject(estado.files["pack.json"] ?: "{}"))
            entry.put("files", filesObj)
            packsArr.put(entry)

            val ss = JSONObject()
            ss.put("pack_id", estado.packId)
            ss.put("pack_version", estado.packVersion)
            ss.put("last_applied_sequence", estado.lastAppliedSequence)
            syncArr.put(ss)
        }
        backup.put("packs", packsArr)
        backup.put("sync_state", syncArr)
        backup.put("settings", JSONObject(settings.toString()))
        backup.put("checksum", "")
        backup.put("checksum", payloadChecksum(backup))
        return backup
    }

    data class BackupValido(val ok: Boolean, val codigo: String?, val mensaje: String?, val backup: JSONObject?)

    fun validarBackup(datos: String, clientVersion: String, tamanoBytes: Long? = null): BackupValido {
        fun rechazo(codigo: String, mensaje: String) = BackupValido(false, codigo, mensaje, null)

        val tamReal = datos.toByteArray(Charsets.UTF_8).size.toLong()
        if (tamReal > Contract.BACKUP_MAX_BYTES || (tamanoBytes != null && tamanoBytes > Contract.BACKUP_MAX_BYTES)) {
            return rechazo(Contract.Errores.RESPALDO_GRANDE, "el backup supera el límite de ${Contract.BACKUP_MAX_BYTES} bytes")
        }
        val backup = try {
            JSONObject(datos)
        } catch (_: Exception) {
            return rechazo(Contract.Errores.RESPALDO_CORRUPTO, "el backup no es JSON válido")
        }
        if (backup.optString("format") != Contract.BACKUP_FORMAT) {
            return rechazo(Contract.Errores.RESPALDO_CORRUPTO, "formato de backup desconocido")
        }
        val formatVersion = backup.optString("format_version", "0.0.0")
        if (Contract.cmpSemver(formatVersion, Contract.BACKUP_FORMAT_VERSION) > 0) {
            return rechazo(Contract.Errores.VERSION_FUTURA, "format_version '$formatVersion' es futura (soportada: ${Contract.BACKUP_FORMAT_VERSION})")
        }
        if (!formatVersion.startsWith("1.")) {
            return rechazo(Contract.Errores.RESPALDO_VERSION, "format_version '$formatVersion' no soportada")
        }
        if (Contract.cmpSemver(clientVersion, backup.optString("app_min_version", "0.0.0")) < 0) {
            return rechazo(Contract.Errores.VERSION_CLIENTE, "el backup exige app >= ${backup.optString("app_min_version")}; esta es $clientVersion")
        }

        // Esquema manual: campos requeridos y settings SIN propiedades extra (privacidad).
        for (campo in listOf("format", "format_version", "app_min_version", "created", "source", "checksum")) {
            if (backup.opt(campo) !is String) return rechazo(Contract.Errores.RESPALDO_CORRUPTO, "backup inválido: falta '$campo'")
        }
        if (backup.opt("source") !in listOf("android", "web")) {
            return rechazo(Contract.Errores.RESPALDO_CORRUPTO, "backup inválido: 'source' desconocido")
        }
        if (backup.opt("packs") !is JSONArray || backup.opt("sync_state") !is JSONArray) {
            return rechazo(Contract.Errores.RESPALDO_CORRUPTO, "backup inválido: faltan packs/sync_state")
        }
        val settings = backup.opt("settings") as? JSONObject
            ?: return rechazo(Contract.Errores.RESPALDO_CORRUPTO, "backup inválido: falta 'settings'")
        val settingsPermitidas = setOf("language", "theme_mode", "dynamic_color", "festivities_enabled", "sober_mode", "festivity_override")
        for (k in settings.keys()) {
            if (k !in settingsPermitidas) {
                return rechazo(Contract.Errores.RESPALDO_CORRUPTO, "backup inválido: propiedad prohibida en settings ('$k'); el backup no admite datos personales")
            }
        }

        val esperado = payloadChecksum(backup)
        if (esperado != backup.getString("checksum")) {
            return rechazo(Contract.Errores.RESPALDO_CORRUPTO, "checksum inválido: declarado ${backup.getString("checksum")}, calculado $esperado")
        }
        return BackupValido(true, null, null, backup)
    }

    data class Restauracion(val ok: Boolean, val codigo: String?, val errores: List<ErrorCod>, val estados: List<PackState>, val syncState: JSONArray?, val settings: JSONObject?)

    /**
     * Restaura un backup sobre almacenamiento limpio (referencia pura).
     * Cadena de verificación: firma del manifiesto de origen SIEMPRE; reglas de
     * contenido SIEMPRE; hashes de archivos solo si el pack nunca recibió deltas.
     */
    fun restablecerBackup(datos: String, clientVersion: String, truststore: JSONObject, isoNow: String, tamanoBytes: Long? = null): Restauracion {
        val v = validarBackup(datos, clientVersion, tamanoBytes)
        if (!v.ok) return Restauracion(false, v.codigo, listOf(ErrorCod(v.codigo!!, v.mensaje!!)), emptyList(), null, null)
        val backup = v.backup!!

        val estados = mutableListOf<PackState>()
        val packsArr = backup.getJSONArray("packs")
        val syncArr = backup.getJSONArray("sync_state")
        for (i in 0 until packsArr.length()) {
            val pack = packsArr.getJSONObject(i)
            val syncManifest = pack.getJSONObject("sync_manifest")
            val packId = syncManifest.optString("pack_id")
            var ss: JSONObject? = null
            for (j in 0 until syncArr.length()) {
                val s = syncArr.getJSONObject(j)
                if (s.optString("pack_id") == packId) ss = s
            }
            val sincronizado = (ss?.optInt("last_applied_sequence", 0) ?: 0) > 0

            val bundle = JSONObject()
            bundle.put("bundle_format", Contract.BUNDLE_FORMAT)
            bundle.put("sync_manifest", syncManifest)
            bundle.put("signature", pack.opt("signature") ?: JSONObject.NULL)
            bundle.put("pack_manifest", pack.getJSONObject("pack_manifest"))
            bundle.put("files", pack.getJSONObject("files"))

            val (resultado, estado) = Installer.instalarBundle(
                bundle, truststore, clientVersion, instalado = null, isoNow = isoNow,
                verificarArchivos = !sincronizado
            )
            if (!resultado.ok || estado == null) {
                val codigo = resultado.errores.firstOrNull()?.codigo ?: Contract.Errores.RESPALDO_CORRUPTO
                val msg = "pack '$packId' del backup no es válido: ${resultado.errores.joinToString("; ") { it.mensaje }}"
                return Restauracion(false, codigo, listOf(ErrorCod(codigo, msg)), emptyList(), null, null)
            }
            estados.add(
                estado.copy(
                    packVersion = ss?.optString("pack_version") ?: estado.packVersion,
                    lastAppliedSequence = ss?.optInt("last_applied_sequence", 0) ?: 0
                )
            )
        }

        return Restauracion(true, null, emptyList(), estados, syncArr, backup.getJSONObject("settings"))
    }
}
