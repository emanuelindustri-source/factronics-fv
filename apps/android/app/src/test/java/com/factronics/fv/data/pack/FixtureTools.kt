// F&V — Herramientas de prueba: fixtures compartidos y construcción de bundles
// con mutación y firma efímera (nunca claves en el repo).
// PARIDAD: port de packages/sync-contracts/test/helpers.mjs.

package com.factronics.fv.data.pack

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.KeyPairGenerator
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64

object FixtureTools {

    private val DIR_FIXTURES = File("../../../packages/shared-fixtures/sync")

    val FIXTURES: JSONObject by lazy {
        JSONObject(File(DIR_FIXTURES, "sync-cases.json").readText(Charsets.UTF_8))
    }
    val VECTORS: JSONObject by lazy {
        JSONObject(File(DIR_FIXTURES, "crypto-vectors.json").readText(Charsets.UTF_8))
    }

    val CLIENT_VERSION: String get() = FIXTURES.getString("client_version")
    const val ISO_NOW = "2026-11-25T12:00:00Z"

    // ------------------------------------------------------------- claves efímeras

    data class ParClaves(val publicKeyB64: String, val privateKeyB64: String, val privateKey: PrivateKey)

    fun generarParClaves(): ParClaves {
        val kpg = KeyPairGenerator.getInstance("EC")
        kpg.initialize(ECGenParameterSpec("secp256r1"))
        val kp = kpg.generateKeyPair()
        return ParClaves(
            publicKeyB64 = Base64.getEncoder().encodeToString(kp.public.encoded),
            privateKeyB64 = Base64.getEncoder().encodeToString(kp.private.encoded),
            privateKey = kp.private
        )
    }

    fun firmar(signedHex: String, clave: ParClaves): String {
        val sig = Signature.getInstance(Contract.SIGN_ALG)
        sig.initSign(clave.privateKey)
        sig.update(Integrity.hexToBytes(signedHex))
        return Base64.getEncoder().encodeToString(sig.sign())
    }

    fun firmarManifiesto(manifestText: String, keyId: String, clave: ParClaves): JSONObject {
        val signed = Integrity.sha256Hex(manifestText)
        return JSONObject()
            .put("alg", Contract.SIGN_ALG)
            .put("key_id", keyId)
            .put("signed", signed)
            .put("sig", firmar(signed, clave))
    }

    // ------------------------------------------------------------- mini-pack

    private fun miniPack(): Pair<JSONObject, JSONObject> {
        val mp = FIXTURES.getJSONObject("mini_pack")
        return JSONObject(mp.getJSONObject("manifest").toString()) to JSONObject(mp.getJSONObject("items").toString())
    }

    private fun archivosDe(manifest: JSONObject, items: JSONObject): JSONObject {
        val files = JSONObject()
        files.put("pack.json", manifest.toString())
        for (tipo in items.keys()) {
            val arr = items.getJSONArray(tipo)
            if (arr.length() > 0) files.put("items/$tipo.json", arr.toString())
        }
        return files
    }

    private fun syncManifestDe(manifest: JSONObject, items: JSONObject, files: JSONObject, minClient: String, contractVersion: String): JSONObject {
        val entries = JSONArray()
        val paths = files.keys().asSequence().toList().sorted()
        for (path in paths) {
            val content = files.getString(path)
            entries.put(
                JSONObject()
                    .put("path", path)
                    .put("sha256", Integrity.sha256Hex(content))
                    .put("bytes", content.toByteArray(Charsets.UTF_8).size)
            )
        }
        var itemsTotal = 0
        for (tipo in items.keys()) itemsTotal += items.getJSONArray(tipo).length()
        return JSONObject()
            .put("contract_version", contractVersion)
            .put("pack_id", manifest.getString("id"))
            .put("pack_version", manifest.getString("version"))
            .put("schema_version", manifest.getString("schema_version"))
            .put("min_client_version", minClient)
            .put("demo", manifest.getBoolean("demo"))
            .put("creado", manifest.getString("creado"))
            .put("responsable", manifest.getString("responsable"))
            .put("items_total", itemsTotal)
            .put("files", entries)
    }

    data class BundlePrep(val bundle: JSONObject, val truststore: JSONObject, val keypair: ParClaves)

    /** Construye un bundle .fvpack a partir del mini-pack con la mutación indicada. */
    fun construirBundle(mutacion: String = "ninguna"): BundlePrep {
        val kp = generarParClaves()
        val (manifest, items) = miniPack()
        var minClient = "0.1.0"
        var contractVersion = "1.0.0"
        var forzarArchivos: JSONObject? = null

        val tec = items.getJSONArray("tecnologia").getJSONObject(0)
        val pre = items.getJSONArray("pregunta").getJSONObject(0)
        val crt = items.getJSONArray("certificado").getJSONObject(0)

        when (mutacion) {
            "ninguna", "hash-alterado", "firma-alterada", "clave-desconocida", "sin-firma", "downgrade" -> {}
            "item-sin-source-ref" -> tec.remove("source_ref")
            "source-ref-incompleto" -> tec.getJSONObject("source_ref").remove("cita_textual")
            "id-formato" -> tec.put("id", "TEC demo")
            "id-tipo" -> tec.put("id", "fam:demo-test")
            "id-duplicado" -> items.getJSONArray("pregunta").put(JSONObject(pre.toString()))
            "etiqueta-demo" -> tec.put("etiquetas", JSONArray())
            "codigo-no-demo" -> tec.getJSONObject("source_ref").put("codigo_oficial", "ABC-0001")
            "schema-version-dispar" -> tec.put("schema_version", "1.1.0")
            "archivo-tipo" -> items.getJSONArray("tecnologia").put(items.getJSONArray("pregunta").remove(0))
            "certificado-sin-aviso" -> crt.remove("aviso")
            "certificado-programa-oficial" -> crt.put("programa", "Programa oficial de certificación de Videojet Technologies")
            "pregunta-respuesta" -> pre.put("respuesta_correcta", "Opción imposible")
            "json-invalido" -> forzarArchivos = JSONObject().put("items/pregunta.json", "{esto no es json")
            "manifest-campo-faltante" -> {}
            "min-client-version" -> minClient = "99.0.0"
            "version-futura" -> {
                manifest.put("schema_version", "2.0.0")
                for (tipo in items.keys()) {
                    val arr = items.getJSONArray(tipo)
                    for (i in 0 until arr.length()) arr.getJSONObject(i).put("schema_version", "2.0.0")
                }
            }
            "contract-version-futura" -> contractVersion = "2.0.0"
            else -> throw IllegalArgumentException("mutación desconocida: $mutacion")
        }

        val files = archivosDe(manifest, items)
        forzarArchivos?.let { f ->
            for (k in f.keys()) files.put(k, f.getString(k))
        }
        val syncManifest = syncManifestDe(manifest, items, files, minClient, contractVersion)
        if (mutacion == "manifest-campo-faltante") syncManifest.remove("min_client_version")

        val manifestText = syncManifest.toString(2)
        files.put("sync-manifest.json", manifestText)
        val signature = firmarManifiesto(manifestText, "test-key", kp)
        val truststore = JSONObject().put(
            "keys", JSONArray().put(
                JSONObject()
                    .put("key_id", "test-key")
                    .put("alg", Contract.SIGN_ALG)
                    .put("demo", true)
                    .put("public_key", kp.publicKeyB64)
            )
        )

        val bundle = JSONObject()
            .put("bundle_format", Contract.BUNDLE_FORMAT)
            .put("sync_manifest", syncManifest)
            .put("signature", signature)
            .put("pack_manifest", manifest)
            .put("files", files)

        when (mutacion) {
            "hash-alterado" -> bundle.getJSONObject("files").put("pack.json", bundle.getJSONObject("files").getString("pack.json") + " ")
            "firma-alterada" -> bundle.getJSONObject("signature").put("sig", "AAAA")
            "clave-desconocida" -> bundle.getJSONObject("signature").put("key_id", "clave-desconocida")
            "sin-firma" -> bundle.put("signature", JSONObject.NULL)
            else -> {}
        }
        return BundlePrep(bundle, truststore, kp)
    }

    fun estadoInstalado(version: String): PackState = PackState(
        packId = "pack-fv-test", packVersion = version, schemaVersion = "1.0.0", minClientVersion = "0.1.0",
        demo = true, lastAppliedSequence = 0, files = emptyMap(), tombstones = emptyMap(),
        syncManifest = null, syncManifestText = "", signature = null, installedAt = null, updatedAt = null
    )

    // ------------------------------------------------------------- deltas

    private fun upsert(ruta: String, items: JSONArray): JSONObject {
        val content = items.toString()
        return JSONObject()
            .put("path", ruta)
            .put("sha256", Integrity.sha256Hex(content))
            .put("bytes", content.toByteArray(Charsets.UTF_8).size)
            .put("content", content)
    }

    private fun preguntaRev2(): JSONObject {
        val p = JSONObject(FIXTURES.getJSONObject("mini_pack").getJSONObject("items").getJSONArray("pregunta").getJSONObject(0).toString())
        p.put("revision", 2)
        p.put("enunciado", "¿Para qué sirve el mini-pack de fixtures? (revisión 2)")
        return p
    }

    private fun certificadoRev2(): JSONObject {
        val c = JSONObject(FIXTURES.getJSONObject("mini_pack").getJSONObject("items").getJSONArray("certificado").getJSONObject(0).toString())
        c.put("revision", 2)
        return c
    }

    private fun deltaBase(): JSONObject = JSONObject()
        .put("contract_version", "1.0.0")
        .put("pack_id", "pack-fv-test")
        .put("base_version", "1.0.0")
        .put("delta_version", "1.1.0")
        .put("sequence", 1)
        .put("min_client_version", "0.1.0")
        .put("upserts", JSONArray())
        .put("tombstones", JSONArray())

    private fun tombstone(id: String, tipo: String): JSONObject = JSONObject()
        .put("id", id)
        .put("tipo", tipo)
        .put("revision", 2)
        .put("deleted_at", "2026-11-26")
        .put("reason", "retirado en revisión demo")

    fun construirDeltas(kind: String): List<JSONObject> = when (kind) {
        "valido", "idempotencia" -> listOf(
            deltaBase()
                .put("upserts", JSONArray().put(upsert("items/pregunta.json", JSONArray().put(preguntaRev2()))))
                .put("tombstones", JSONArray().put(tombstone("tec:demo-test", "tecnologia")))
        )
        "orden-invalido" -> listOf(deltaBase().put("sequence", 5))
        "base-descuadre" -> listOf(deltaBase().put("base_version", "0.9.0"))
        "downgrade" -> listOf(deltaBase().put("delta_version", "1.0.0"))
        "tombstone-resurreccion" -> listOf(
            deltaBase().put("tombstones", JSONArray().put(tombstone("qst:demo-test-0001", "pregunta"))),
            deltaBase()
                .put("base_version", "1.1.0")
                .put("delta_version", "1.2.0")
                .put("sequence", 2)
                .put("upserts", JSONArray().put(upsert("items/pregunta.json", JSONArray().put(FIXTURES.getJSONObject("mini_pack").getJSONObject("items").getJSONArray("pregunta").getJSONObject(0)))))
        )
        "hash-malo" -> {
            val up = upsert("items/pregunta.json", JSONArray().put(preguntaRev2()))
            up.put("sha256", "0".repeat(64))
            listOf(deltaBase().put("upserts", JSONArray().put(up)))
        }
        "min-client" -> listOf(deltaBase().put("min_client_version", "99.0.0"))
        "cadena" -> listOf(
            deltaBase().put("upserts", JSONArray().put(upsert("items/pregunta.json", JSONArray().put(preguntaRev2())))),
            deltaBase()
                .put("base_version", "1.1.0").put("delta_version", "1.2.0").put("sequence", 2)
                .put("upserts", JSONArray().put(upsert("items/certificado.json", JSONArray().put(certificadoRev2())))),
            deltaBase()
                .put("base_version", "1.2.0").put("delta_version", "1.3.0").put("sequence", 3)
                .put("tombstones", JSONArray().put(tombstone("tec:demo-test", "tecnologia")))
        )
        else -> throw IllegalArgumentException("kind de delta desconocido: $kind")
    }

    /** Estado instalado completo a partir del mini-pack (para deltas/backup/búsqueda). */
    fun estadoMiniPack(): Pair<PackState, JSONObject> {
        val prep = construirBundle("ninguna")
        return Installer.estadoDesdeBundle(prep.bundle, ISO_NOW) to prep.truststore
    }

    // ------------------------------------------------------------- backups

    val SETTINGS_DEMO: JSONObject = JSONObject()
        .put("language", "es-VE")
        .put("theme_mode", "system")
        .put("dynamic_color", true)
        .put("festivities_enabled", true)
        .put("sober_mode", false)
        .put("festivity_override", "auto")

    data class BackupPrep(val backup: JSONObject?, val texto: String, val truststore: JSONObject)

    fun construirBackup(mutacion: String = "ninguna"): BackupPrep {
        val (estado, truststore) = estadoMiniPack()
        val backup = BackupManager.crearBackup(
            listOf(estado), JSONObject(SETTINGS_DEMO.toString()), "android", "2026-11-25T10:00:00Z", "0.1.0"
        )
        return when (mutacion) {
            "ninguna" -> BackupPrep(backup, backup.toString(), truststore)
            "checksum-alterado" -> {
                backup.getJSONObject("settings").put("language", "en")
                BackupPrep(backup, backup.toString(), truststore)
            }
            "formato-futuro" -> {
                backup.put("format_version", "2.0.0")
                BackupPrep(backup, backup.toString(), truststore)
            }
            "settings-con-nombre" -> {
                backup.getJSONObject("settings").put("name", "Khristyan Hidalgo")
                backup.put("checksum", BackupManager.payloadChecksum(backup))
                BackupPrep(backup, backup.toString(), truststore)
            }
            "json-invalido" -> BackupPrep(null, "esto no es un backup", truststore)
            else -> throw IllegalArgumentException("mutación de backup desconocida: $mutacion")
        }
    }
}
