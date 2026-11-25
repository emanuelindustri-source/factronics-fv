// F&V — Aplicación de deltas de sincronización (orden estricto, idempotencia, tombstones).
// PARIDAD: port de packages/sync-contracts/src/delta.mjs. Reglas completas en ADR-0009.

package com.factronics.fv.data.pack

import org.json.JSONArray
import org.json.JSONObject

object DeltaEngine {

    private val RE_ID_TOMB =
        Regex("^(tec|fam|gen|mod|sis|cmp|prt|err|ink|doc|pag|frag|qst|att|crt):[a-z0-9]+(-[a-z0-9]+)*$")
    private val RE_HEX64 = Regex("^[0-9a-f]{64}$")

    /**
     * Aplica un delta sobre un estado instalado (operación pura: el estado de
     * entrada no se modifica). Resultado: (resultado, estadoFinal).
     */
    fun aplicarDelta(estado: PackState, delta: JSONObject, clientVersion: String, isoNow: String): Pair<Resultado, PackState> {
        fun rechazo(codigo: String, mensaje: String) = Resultado.rechazo(codigo, mensaje) to estado

        if (estado.packId == null) {
            return rechazo(Contract.Errores.PACK_NO_INSTALADO, "no hay pack instalado sobre el que aplicar el delta")
        }

        // Validación manual del esquema delta.
        for (campo in listOf("contract_version", "pack_id", "base_version", "delta_version", "min_client_version")) {
            if (delta.opt(campo) !is String) return rechazo(Contract.Errores.PACK_CORRUPTO, "delta inválido: falta '$campo'")
        }
        if (delta.opt("sequence") !is Int) return rechazo(Contract.Errores.PACK_CORRUPTO, "delta inválido: 'sequence' no es entero")
        if (delta.opt("upserts") !is JSONArray || delta.opt("tombstones") !is JSONArray) {
            return rechazo(Contract.Errores.PACK_CORRUPTO, "delta inválido: faltan upserts/tombstones")
        }

        val major = delta.getString("contract_version").split(".")[0].toIntOrNull() ?: 0
        if (major != Contract.SUPPORTED_CONTRACT_MAJOR) {
            return rechazo(Contract.Errores.CONTRATO_VERSION, "contract_version '${delta.getString("contract_version")}' fuera de rango")
        }
        if (delta.getString("pack_id") != estado.packId) {
            return rechazo(Contract.Errores.BASE_DESCUADRE, "el delta es del pack '${delta.getString("pack_id")}' y el instalado es '${estado.packId}'")
        }
        if (Contract.cmpSemver(clientVersion, delta.getString("min_client_version")) < 0) {
            return rechazo(Contract.Errores.VERSION_CLIENTE, "el delta exige cliente >= ${delta.getString("min_client_version")}; este es $clientVersion")
        }

        // Idempotencia: ya aplicado ⇒ no-op con éxito.
        val sequence = delta.getInt("sequence")
        if (sequence <= estado.lastAppliedSequence) {
            return Resultado(true, emptyList(), "ya-aplicado") to estado
        }
        // Orden estricto: sin saltos.
        if (sequence != estado.lastAppliedSequence + 1) {
            return rechazo(Contract.Errores.ORDEN_INVALIDO, "sequence $sequence fuera de orden (esperada ${estado.lastAppliedSequence + 1})")
        }
        if (delta.getString("base_version") != estado.packVersion) {
            return rechazo(Contract.Errores.BASE_DESCUADRE, "base_version '${delta.getString("base_version")}' ≠ versión instalada '${estado.packVersion}'")
        }
        if (Contract.cmpSemver(delta.getString("delta_version"), estado.packVersion ?: "0.0.0") <= 0) {
            return rechazo(Contract.Errores.DOWNGRADE, "delta_version '${delta.getString("delta_version")}' no supera la instalada '${estado.packVersion}'")
        }

        val upserts = delta.getJSONArray("upserts")
        val tombstonesArr = delta.getJSONArray("tombstones")

        // Integridad de los upserts.
        for (i in 0 until upserts.length()) {
            val up = upserts.getJSONObject(i)
            val content = up.optString("content", "")
            val h = Integrity.sha256Hex(content)
            if (h != up.optString("sha256", "") || content.toByteArray(Charsets.UTF_8).size != up.optInt("bytes", -1)) {
                return rechazo(Contract.Errores.HASH_INVALIDO, "hash/tamaño inválido en upsert '${up.optString("path")}'")
            }
        }

        // Tombstones previos: nada resucita.
        val tombstones = mutableMapOf<String, JSONObject>()
        tombstones.putAll(estado.tombstones)
        val idsUp = mutableSetOf<String>()
        for (i in 0 until upserts.length()) {
            val up = upserts.getJSONObject(i)
            if (!up.optString("path").startsWith("items/")) continue
            val arr = try {
                JSONArray(up.getString("content"))
            } catch (_: Exception) {
                return rechazo(Contract.Errores.PACK_CORRUPTO, "'${up.optString("path")}' no es JSON válido")
            }
            for (j in 0 until arr.length()) {
                val item = arr.opt(j) as? JSONObject ?: continue
                val id = item.optString("id", "")
                if (id.isNotEmpty()) {
                    idsUp.add(id)
                    if (tombstones.containsKey(id)) {
                        return rechazo(Contract.Errores.TOMBSTONE_CONFLICTO, "el ítem '$id' fue eliminado (tombstone) y no puede resucitar")
                    }
                }
            }
        }
        for (i in 0 until tombstonesArr.length()) {
            val t = tombstonesArr.getJSONObject(i)
            val id = t.optString("id", "")
            if (!RE_ID_TOMB.matches(id)) return rechazo(Contract.Errores.PACK_CORRUPTO, "tombstone con id inválido ('$id')")
            if (id in idsUp) {
                return rechazo(Contract.Errores.TOMBSTONE_CONFLICTO, "'$id' aparece en upserts y en tombstones del mismo delta")
            }
            tombstones[id] = JSONObject(t.toString())
        }

        // Aplicar sobre copia.
        val files = estado.files.toMutableMap()
        for (i in 0 until upserts.length()) {
            val up = upserts.getJSONObject(i)
            files[up.getString("path")] = up.getString("content")
        }

        // Quitar los ítems tombstoneados de todos los archivos items/*.json.
        val idsTomb = tombstones.keys
        if (idsTomb.isNotEmpty()) {
            for (path in files.keys.toList()) {
                if (!path.startsWith("items/")) continue
                val arr = try {
                    JSONArray(files[path])
                } catch (_: Exception) {
                    return rechazo(Contract.Errores.PACK_CORRUPTO, "'$path' no es JSON válido")
                }
                val quedan = JSONArray()
                var quitados = 0
                for (j in 0 until arr.length()) {
                    val item = arr.opt(j)
                    if (item is JSONObject && item.optString("id", "") in idsTomb) quitados++
                    else quedan.put(item)
                }
                if (quitados > 0) {
                    if (quedan.length() == 0) files.remove(path)
                    else files[path] = quedan.toString()
                }
            }
        }

        // El resultado debe seguir siendo contenido válido de F1.1.
        val packManifest = try {
            JSONObject(estado.files["pack.json"] ?: "null")
        } catch (_: Exception) {
            null
        }
        val estadoIntermedio = estado.copy(files = files, tombstones = emptyMap())
        val entries = PackStoreOps.entriesDe(estadoIntermedio)
        val contenido = ContentRules.validarContenido(packManifest, entries)
        if (!contenido.valido) {
            val errs = contenido.errores.map { ErrorCod(Contract.Errores.CONTENIDO_INVALIDO, "[${it.regla}] ${it.id}: ${it.mensaje}") }
            return Resultado(false, errs) to estado
        }

        return Resultado(true, emptyList(), "aplicado") to estado.copy(
            packVersion = delta.getString("delta_version"),
            lastAppliedSequence = sequence,
            files = files,
            tombstones = tombstones,
            updatedAt = isoNow
        )
    }
}
