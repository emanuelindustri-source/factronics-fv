// F&V — Almacén local de packs en Android: escritura atómica con journal.
//
// Diseño (ADR-0009): "equivalente" a Room para el alcance F1.4 — versión de esquema
// local + migraciones declarativas + índices + transacciones con rollback. La
// atomicidad se logra con staging + journal + rename: una interrupción (caída,
// batería, disco lleno) NUNCA deja un pack a medias; la recuperación revierte al
// estado anterior consistente. Room/FTS queda para F4.4 con esta interfaz preparada.
//
// Estructura bajo filesDir/packs/:
//   store.json                  metadatos (local_schema_version, packs, tombstones)
//   files/<packId>/pack.json, items/<tipo>.json, sync-manifest.json, signature.json
//   journal.json                presente SOLO durante una transacción
//   staging/<txId>/files|old    área de montaje
//
// Pasos de la transacción (commitState):
//   1 stage: escribir archivos nuevos en staging/<txId>/files
//   2 journal "staged"
//   3 mover files/<packId> → staging/<txId>/old (si existía)
//   4 mover staging/<txId>/files → files/<packId>
//   5 journal "swapped"
//   6 store.json (tmp + rename)
//   7 journal "committed"
//   8 limpieza
// Recuperación (rollback): "staged" ⇒ restaurar old si hiciera falta y limpiar;
// "swapped" ⇒ si store.json ya refleja newMeta se completa, si no se revierte;
// "committed" ⇒ solo limpieza.

package com.factronics.fv.data.pack

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.IOException

open class FileOps {
    open fun hook(paso: String) {}
    open fun writeText(file: File, text: String) {
        file.parentFile?.mkdirs()
        val tmp = File(file.parentFile, file.name + ".tmp")
        tmp.writeText(text, Charsets.UTF_8)
        if (!tmp.renameTo(file)) {
            file.delete()
            if (!tmp.renameTo(file)) throw IOException("no se pudo renombrar ${tmp.name}")
        }
    }

    open fun readText(file: File): String? = if (file.isFile) file.readText(Charsets.UTF_8) else null
    open fun exists(file: File): Boolean = file.exists()
    open fun deleteRecursively(file: File): Boolean = !file.exists() || file.deleteRecursively()
    open fun moveDir(from: File, to: File) {
        to.parentFile?.mkdirs()
        if (!from.renameTo(to)) throw IOException("no se pudo mover ${from.name}")
    }

    fun listFiles(dir: File): List<File> = dir.listFiles()?.sortedBy { it.name } ?: emptyList()
}

class FilePackStore(private val root: File, private val ops: FileOps = FileOps()) {

    private val storeFile = File(root, "store.json")
    private val journalFile = File(root, "journal.json")
    private val filesDir = File(root, "files")
    private val stagingDir = File(root, "staging")

    /** Errores de apertura recuperables (migración fallida, store.json corrupto). */
    data class Apertura(val migracionFallida: Boolean = false, val storeCorrupto: Boolean = false)

    // ------------------------------------------------------------------ apertura

    fun openStore(): Apertura {
        root.mkdirs()
        filesDir.mkdirs()
        stagingDir.mkdirs()
        var apertura = Apertura()

        // 1) Recuperar transacciones interrumpidas (rollback) y limpiar staging huérfano.
        recuperar()
        for (stale in ops.listFiles(stagingDir)) ops.deleteRecursively(stale)

        // 2) Migraciones del almacén local (registro declarativo; v1 es la actual).
        val migrador = MigradorLocal(emptyList())
        val texto = ops.readText(storeFile)
        if (texto == null) {
            val r = migrador.migrarAlmacen(null)
            ops.writeText(storeFile, r.store.toString(2))
            return apertura
        }
        val store = try {
            JSONObject(texto)
        } catch (_: Exception) {
            // store.json ilegible: se conserva como .corrupto y se crea metadatos
            // limpios; los archivos de contenido NO se tocan (nunca se pierde contenido).
            ops.writeText(File(root, "store.json.corrupto"), texto)
            val r = migrador.migrarAlmacen(null)
            ops.writeText(storeFile, r.store.toString(2))
            return apertura.copy(storeCorrupto = true)
        }
        val r = migrador.migrarAlmacen(store)
        return if (r.ok) {
            if (r.store.toString() != store.toString()) {
                ops.writeText(storeFile, r.store.toString(2))
            }
            apertura
        } else {
            // ROLLBACK: el almacén queda intacto y se reporta.
            apertura.copy(migracionFallida = true)
        }
    }

    private fun recuperar() {
        val texto = ops.readText(journalFile) ?: return
        val journal = try {
            JSONObject(texto)
        } catch (_: Exception) {
            ops.deleteRecursively(journalFile)
            return
        }
        val txId = journal.optString("txId")
        val packId = journal.optString("packId")
        val prevExisted = journal.optBoolean("prevExisted", false)
        val stagingTx = File(stagingDir, txId)
        val live = File(filesDir, packId)
        val old = File(stagingTx, "old")

        when (journal.optString("state")) {
            "staged" -> {
                // ROLLBACK completo: si 'old' existe, se restaura SIEMPRE (cubre también
                // la ventana en la que el nuevo ya se montó pero el journal aún decía
                // "staged"). Nunca queda una mezcla de archivos y metadatos.
                if (ops.exists(old)) {
                    ops.deleteRecursively(live)
                    ops.moveDir(old, live)
                } else if (!prevExisted) {
                    ops.deleteRecursively(live)
                }
                ops.deleteRecursively(stagingTx)
            }
            "swapped" -> {
                val newMeta = journal.optJSONObject("newMeta")
                val storeMeta = metaDe(packId)
                val yaCommit = newMeta != null && storeMeta != null &&
                    storeMeta.optString("pack_version") == newMeta.optString("pack_version") &&
                    storeMeta.optString("installed_at") == newMeta.optString("installed_at")
                if (yaCommit) {
                    ops.deleteRecursively(stagingTx)
                } else {
                    // ROLLBACK: volver al estado anterior consistente.
                    ops.deleteRecursively(live)
                    if (prevExisted && ops.exists(old)) ops.moveDir(old, live)
                    ops.deleteRecursively(stagingTx)
                }
            }
            else -> {
                // "committed": solo limpieza.
                ops.deleteRecursively(stagingTx)
            }
        }
        ops.deleteRecursively(journalFile)
    }

    // ------------------------------------------------------------------ store.json

    private fun leerStore(): JSONObject {
        val texto = ops.readText(storeFile) ?: return JSONObject().put("local_schema_version", 1).put("packs", JSONObject())
        return try {
            JSONObject(texto)
        } catch (_: Exception) {
            JSONObject().put("local_schema_version", 1).put("packs", JSONObject())
        }
    }

    private fun metaDe(packId: String): JSONObject? =
        leerStore().optJSONObject("packs")?.optJSONObject(packId)

    // ------------------------------------------------------------------ lectura

    /** Reconstruye el PackState completo de un pack (o el primero instalado). */
    fun readState(packId: String? = null): PackState? {
        val store = leerStore()
        val packs = store.optJSONObject("packs") ?: return null
        val id = packId ?: packs.keys().asSequence().firstOrNull() ?: return null
        val meta = packs.optJSONObject(id) ?: return null

        val dir = File(filesDir, id)
        val files = mutableMapOf<String, String>()
        var signature: JSONObject? = null
        fun walk(d: File, prefijo: String) {
            for (f in ops.listFiles(d)) {
                val rel = if (prefijo.isEmpty()) f.name else "$prefijo/${f.name}"
                if (f.isDirectory) walk(f, rel)
                else {
                    val contenido = ops.readText(f) ?: continue
                    if (rel == "signature.json") signature = try {
                        JSONObject(contenido)
                    } catch (_: Exception) {
                        null
                    }
                    else files[rel] = contenido
                }
            }
        }
        walk(dir, "")

        val tombstones = mutableMapOf<String, JSONObject>()
        val tsArr = store.optJSONObject("tombstones")?.optJSONArray(id)
        if (tsArr != null) {
            for (i in 0 until tsArr.length()) {
                val t = tsArr.opt(i) as? JSONObject ?: continue
                tombstones[t.optString("id", "")] = t
            }
        }

        val syncText = files["sync-manifest.json"] ?: ""
        val syncManifest = try {
            JSONObject(syncText)
        } catch (_: Exception) {
            null
        }
        return PackState(
            packId = id,
            packVersion = meta.optString("pack_version"),
            schemaVersion = meta.optString("schema_version"),
            minClientVersion = meta.optString("min_client_version"),
            demo = meta.optBoolean("demo", false),
            lastAppliedSequence = meta.optInt("last_applied_sequence", 0),
            files = files,
            tombstones = tombstones,
            syncManifest = syncManifest,
            syncManifestText = syncText,
            signature = signature,
            installedAt = meta.optString("installed_at"),
            updatedAt = meta.optString("updated_at")
        )
    }

    fun readAllStates(): List<PackState> {
        val packs = leerStore().optJSONObject("packs") ?: return emptyList()
        return packs.keys().asSequence().mapNotNull { readState(it) }.toList()
    }

    // ------------------------------------------------------------------ escritura transaccional

    private fun commitState(estado: PackState): Resultado {
        val txId = "tx-${System.nanoTime()}"
        val stagingTx = File(stagingDir, txId)
        val live = File(filesDir, estado.packId ?: return Resultado.rechazo(Contract.Errores.PACK_CORRUPTO, "estado sin packId"))
        val old = File(stagingTx, "old")

        val meta = JSONObject()
            .put("pack_id", estado.packId)
            .put("pack_version", estado.packVersion)
            .put("schema_version", estado.schemaVersion)
            .put("min_client_version", estado.minClientVersion)
            .put("demo", estado.demo)
            .put("items_total", PackStoreOps.entriesDe(estado).size)
            .put("installed_at", estado.installedAt)
            .put("updated_at", estado.updatedAt)
            .put("last_applied_sequence", estado.lastAppliedSequence)
            .put("size_bytes", PackStoreOps.tamanoBytes(estado))

        val prevExisted = ops.exists(live)
        return try {
            // 1) stage
            ops.hook("stage")
            val stagedFiles = File(stagingTx, "files")
            for ((path, content) in estado.files) {
                ops.writeText(File(stagedFiles, path), content)
            }
            estado.signature?.let { ops.writeText(File(stagedFiles, "signature.json"), it.toString(2)) }

            // 2) journal "staged"
            ops.hook("journal-staged")
            val journal = JSONObject()
                .put("op", "commit")
                .put("txId", txId)
                .put("packId", estado.packId)
                .put("prevExisted", prevExisted)
                .put("newMeta", meta)
                .put("state", "staged")
            ops.writeText(journalFile, journal.toString(2))

            // 3) mover el anterior a un lado
            ops.hook("move-old")
            if (prevExisted) ops.moveDir(live, old)

            // 4) montar el nuevo
            ops.hook("move-new")
            ops.moveDir(stagedFiles, live)

            // 5) journal "swapped"
            ops.hook("journal-swapped")
            journal.put("state", "swapped")
            ops.writeText(journalFile, journal.toString(2))

            // 6) store.json (tmp + rename atómico)
            ops.hook("store")
            val store = leerStore()
            val packs = store.optJSONObject("packs") ?: JSONObject().also { store.put("packs", it) }
            packs.put(estado.packId, meta)
            val tsObj = store.optJSONObject("tombstones") ?: JSONObject().also { store.put("tombstones", it) }
            val tsArr = JSONArray()
            for (t in estado.tombstones.values) tsArr.put(t)
            tsObj.put(estado.packId, tsArr)
            store.put("local_schema_version", Contract.LOCAL_SCHEMA_VERSION)
            ops.writeText(storeFile, store.toString(2))

            // 7) journal "committed" + 8) limpieza
            ops.hook("journal-committed")
            journal.put("state", "committed")
            ops.writeText(journalFile, journal.toString(2))
            ops.deleteRecursively(stagingTx)
            ops.deleteRecursively(journalFile)
            Resultado.ok()
        } catch (e: IOException) {
            // Escritura interrumpida: rollback inmediato y error honesto.
            recuperar()
            val disco = e.message?.contains("ENOSPC") == true || e.message?.contains("No space") == true
            if (disco) Resultado.rechazo(Contract.Errores.DISCO_LLENO, "no hay espacio suficiente en el dispositivo")
            else Resultado.rechazo(Contract.Errores.ESCRITURA_INTERRUMPIDA, "la escritura se interrumpió: se revirtió al estado anterior")
        } catch (e: Exception) {
            recuperar()
            Resultado.rechazo(Contract.Errores.ESCRITURA_INTERRUMPIDA, "la escritura se interrumpió: se revirtió al estado anterior (${e.message})")
        }
    }

    // ------------------------------------------------------------------ API pública

    /** Instala/actualiza un pack desde el texto JSON de un bundle .fvpack. */
    fun installBundle(bundleText: String, truststore: JSONObject, clientVersion: String, isoNow: String): Resultado {
        val bundle = try {
            JSONObject(bundleText)
        } catch (_: Exception) {
            return Resultado.rechazo(Contract.Errores.PACK_CORRUPTO, "el bundle no es JSON válido")
        }
        val packId = bundle.optJSONObject("sync_manifest")?.optString("pack_id")
        val instalado = if (packId.isNullOrEmpty()) null else readState(packId)
        val (resultado, estado) = Installer.instalarBundle(
            bundle, truststore, clientVersion, instalado, isoNow,
            tamanoBytes = bundleText.toByteArray(Charsets.UTF_8).size.toLong()
        )
        if (!resultado.ok || estado == null) return resultado
        if (resultado.motivo == "ya-instalado") return resultado
        return commitState(estado)
    }

    /** Aplica un delta de sincronización (orden e idempotencia ver DeltaEngine). */
    fun applyDelta(deltaText: String, clientVersion: String, isoNow: String): Resultado {
        val delta = try {
            JSONObject(deltaText)
        } catch (_: Exception) {
            return Resultado.rechazo(Contract.Errores.PACK_CORRUPTO, "el delta no es JSON válido")
        }
        val packId = delta.optString("pack_id")
        val estado = readState(packId)
            ?: return Resultado.rechazo(Contract.Errores.PACK_NO_INSTALADO, "no hay pack '$packId' instalado")
        val (resultado, nuevo) = DeltaEngine.aplicarDelta(estado, delta, clientVersion, isoNow)
        if (!resultado.ok || resultado.motivo == "ya-aplicado") return resultado
        return commitState(nuevo)
    }

    /** Desinstala un pack (metadatos primero; los archivos huérfanos se limpian al abrir). */
    fun uninstall(packId: String): Resultado {
        val store = leerStore()
        val packs = store.optJSONObject("packs") ?: return Resultado.rechazo(Contract.Errores.PACK_NO_INSTALADO, "no hay packs instalados")
        if (!packs.has(packId)) return Resultado.rechazo(Contract.Errores.PACK_NO_INSTALADO, "el pack '$packId' no está instalado")
        packs.remove(packId)
        store.optJSONObject("tombstones")?.remove(packId)
        ops.writeText(storeFile, store.toString(2))
        ops.deleteRecursively(File(filesDir, packId))
        return Resultado.ok()
    }

    fun uninstallAll(): Resultado {
        val store = leerStore()
        val packs = store.optJSONObject("packs") ?: return Resultado.ok()
        for (id in packs.keys().asSequence().toList()) {
            uninstall(id)
        }
        return Resultado.ok()
    }

    /** Exporta una copia de seguridad (solo packs + preferencias no personales). */
    fun exportBackup(settings: JSONObject, created: String, appMinVersion: String, source: String = "android"): String {
        val estados = readAllStates()
        val backup = BackupManager.crearBackup(estados, settings, source, created, appMinVersion)
        return backup.toString(2)
    }

    /** Importa/restaura una copia de seguridad en este dispositivo. */
    fun importBackup(texto: String, clientVersion: String, truststore: JSONObject, isoNow: String): Resultado {
        val r = BackupManager.restablecerBackup(texto, clientVersion, truststore, isoNow)
        if (!r.ok) return Resultado(false, r.errores)
        for (estado in r.estados) {
            val commit = commitState(estado)
            if (!commit.ok) return commit
        }
        return Resultado.ok()
    }
}
