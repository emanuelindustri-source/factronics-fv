// F&V — Tests del contrato de sincronización en Android contra los fixtures
// compartidos (paridad con JS/TS). Si estos tests cambian de resultado respecto a
// packages/sync-contracts, algo se desincronizó entre plataformas.

package com.factronics.fv.data.pack

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assert.assertFalse
import org.junit.Test

class ContractFixturesTest {

    // ------------------------------------------------------------- criptografía

    @Test
    fun `los vectores canonicos compartidos se reproducen byte a byte`() {
        val vectors = FixtureTools.VECTORS.getJSONArray("canonical_vectors")
        for (i in 0 until vectors.length()) {
            val v = vectors.getJSONObject(i)
            val canonical = CanonicalJson.serialize(v.getJSONObject("payload"))
            assertEquals("canonical distinto para '${v.getString("name")}'", v.getString("canonical"), canonical)
            assertEquals("sha256 distinto para '${v.getString("name")}'", v.getString("sha256"), Integrity.sha256Hex(canonical))
        }
    }

    @Test
    fun `el vector de firma compartido verifica (compatibilidad Node-Kotlin)`() {
        val v = FixtureTools.VECTORS.getJSONObject("signature_vector")
        assertEquals(v.getString("signed"), Integrity.sha256Hex(v.getString("message")))
        assertTrue(Integrity.verificarFirma(v.getString("signed"), v.getString("sig"), v.getString("public_key")))
    }

    @Test
    fun `round-trip de firma ECDSA con clave efimera y rechazo de alteraciones`() {
        val kp = FixtureTools.generarParClaves()
        val signed = Integrity.sha256Hex("mensaje de prueba")
        val sig = FixtureTools.firmar(signed, kp)
        assertTrue(Integrity.verificarFirma(signed, sig, kp.publicKeyB64))
        assertFalse(Integrity.verificarFirma(signed, "AAAA", kp.publicKeyB64))
        val otra = FixtureTools.generarParClaves()
        assertFalse(Integrity.verificarFirma(signed, sig, otra.publicKeyB64))
    }

    // ------------------------------------------------------------- bundles

    private fun assertRechazo(r: Installer.Validacion, caso: JSONObject) {
        assertFalse("esperaba rechazo y fue aceptado: ${caso.getString("name")}", r.valido)
        val codigos = r.errores.map { it.codigo }
        val alguno = caso.optJSONArray("codes_any")?.let { arr ->
            (0 until arr.length()).any { codigos.contains(arr.getString(it)) }
        } ?: true
        assertTrue("esperaba alguno de ${caso.optJSONArray("codes_any")} y llegó $codigos", alguno)
        caso.optJSONArray("rules_any")?.let { arr ->
            val mensajes = r.errores.joinToString(" | ") { it.mensaje }
            for (i in 0 until arr.length()) {
                val regla = arr.getString(i)
                assertTrue("esperaba la regla $regla en: $mensajes", mensajes.contains(regla))
            }
        }
    }

    @Test
    fun `todos los casos de bundle dan el resultado esperado`() {
        val cases = FixtureTools.FIXTURES.getJSONArray("bundle_cases")
        for (i in 0 until cases.length()) {
            val caso = cases.getJSONObject(i)
            val prep = FixtureTools.construirBundle(caso.getString("mutacion"))
            val instalado = if (caso.has("instalado_version")) FixtureTools.estadoInstalado(caso.getString("instalado_version")) else null
            val r = Installer.validarBundle(
                prep.bundle, prep.truststore, FixtureTools.CLIENT_VERSION, instalado,
                tamanoBytes = if (caso.has("tamano_simulado")) caso.getLong("tamano_simulado") else null
            )
            if (caso.getString("expect") == "accept") {
                assertTrue("esperaba aceptar y rechazó (${caso.getString("name")}): ${r.errores}", r.valido)
                if (caso.has("motivo")) assertEquals(caso.getString("motivo"), r.motivo)
            } else {
                assertRechazo(r, caso)
            }
        }
    }

    @Test
    fun `instalar un bundle valido produce el estado completo y resumen de Ajustes`() {
        val prep = FixtureTools.construirBundle("ninguna")
        val (resultado, estado) = Installer.instalarBundle(prep.bundle, prep.truststore, FixtureTools.CLIENT_VERSION, null, FixtureTools.ISO_NOW)
        assertTrue(resultado.ok)
        assertNotNull(estado)
        assertEquals("pack-fv-test", estado!!.packId)
        assertEquals("1.0.0", estado.packVersion)
        val resumen = Installer.resumenDe(estado)
        assertEquals(true, resumen.getBoolean("instalado"))
        assertEquals(3, resumen.getInt("itemsTotal"))
        assertEquals(3, resumen.getInt("indicesPorId"))
        assertEquals(1, resumen.getInt("indicesPorTecnologia"))
    }

    @Test
    fun `un bundle invalido jamas produce estado`() {
        val prep = FixtureTools.construirBundle("hash-alterado")
        val (resultado, estado) = Installer.instalarBundle(prep.bundle, prep.truststore, FixtureTools.CLIENT_VERSION, null, FixtureTools.ISO_NOW)
        assertFalse(resultado.ok)
        assertEquals(null, estado)
    }

    // ------------------------------------------------------------- deltas

    @Test
    fun `todos los casos de delta dan el resultado esperado`() {
        val cases = FixtureTools.FIXTURES.getJSONArray("delta_cases")
        for (i in 0 until cases.length()) {
            val caso = cases.getJSONObject(i)
            val kind = caso.getString("kind")
            val (estadoInicial, _) = FixtureTools.estadoMiniPack()
            val deltas = FixtureTools.construirDeltas(kind)

            if (kind == "idempotencia") {
                val (r1, e1) = DeltaEngine.aplicarDelta(estadoInicial, deltas[0], FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW)
                assertTrue(r1.ok)
                val (r2, e2) = DeltaEngine.aplicarDelta(e1, deltas[0], FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW)
                assertTrue(r2.ok)
                assertEquals(caso.getString("motivo_segunda"), r2.motivo)
                assertEquals(caso.getString("expect_version"), e2.packVersion)
                assertEquals(e1.lastAppliedSequence, e2.lastAppliedSequence)
                continue
            }

            var actual = estadoInicial
            var ultima = Resultado.ok()
            for (d in deltas) {
                val (r, nuevo) = DeltaEngine.aplicarDelta(actual, d, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW)
                ultima = r
                if (!r.ok) break
                actual = nuevo
            }
            if (caso.getString("expect") == "accept") {
                assertTrue("esperaba aplicar (${caso.getString("name")}): ${ultima.errores}", ultima.ok)
                if (caso.has("expect_version")) assertEquals(caso.getString("expect_version"), actual.packVersion)
                if (caso.has("expect_items")) assertEquals(caso.getInt("expect_items"), PackStoreOps.entriesDe(actual).size)
                caso.optJSONArray("expect_tombstones")?.let { arr ->
                    for (j in 0 until arr.length()) {
                        assertTrue("falta tombstone de ${arr.getString(j)}", actual.tombstones.containsKey(arr.getString(j)))
                    }
                }
            } else {
                assertRechazo(Installer.Validacion(false, ultima.errores), caso)
            }
        }
    }

    @Test
    fun `un delta rechazado no modifica el estado`() {
        val (estado, _) = FixtureTools.estadoMiniPack()
        val malo = FixtureTools.construirDeltas("orden-invalido")[0]
        val (r, nuevo) = DeltaEngine.aplicarDelta(estado, malo, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW)
        assertFalse(r.ok)
        assertEquals(estado.packVersion, nuevo.packVersion)
        assertEquals(estado.lastAppliedSequence, nuevo.lastAppliedSequence)
    }

    // ------------------------------------------------------------- backups

    @Test
    fun `todos los casos de backup dan el resultado esperado`() {
        val cases = FixtureTools.FIXTURES.getJSONArray("backup_cases")
        for (i in 0 until cases.length()) {
            val caso = cases.getJSONObject(i)
            val prep = FixtureTools.construirBackup(caso.getString("mutacion"))
            val v = BackupManager.validarBackup(
                prep.texto, FixtureTools.CLIENT_VERSION,
                tamanoBytes = if (caso.has("tamano_simulado")) caso.getLong("tamano_simulado") else null
            )
            if (caso.getString("expect") == "accept") {
                assertTrue("esperaba aceptar (${caso.getString("name")}): ${v.mensaje}", v.ok)
                // Round-trip completo sobre almacenamiento limpio.
                val r = BackupManager.restablecerBackup(prep.texto, FixtureTools.CLIENT_VERSION, prep.truststore, FixtureTools.ISO_NOW)
                assertTrue("restauración falló: ${r.errores}", r.ok)
                assertEquals(1, r.estados.size)
                assertEquals(3, PackStoreOps.entriesDe(r.estados[0]).size)
                assertEquals("es-VE", r.settings!!.getString("language"))
                assertEquals("pack-fv-test", r.syncState!!.getJSONObject(0).getString("pack_id"))
            } else {
                assertFalse("esperaba rechazo y fue aceptado (${caso.getString("name")})", v.ok)
                val codigos = listOf(v.codigo)
                val alguno = caso.optJSONArray("codes_any")?.let { arr ->
                    (0 until arr.length()).any { codigos.contains(arr.getString(it)) }
                } ?: true
                assertTrue("esperaba alguno de ${caso.optJSONArray("codes_any")} y llegó $codigos", alguno)
            }
        }
    }

    @Test
    fun `restaurar conserva el estado de sincronizacion`() {
        val (estado, truststore) = FixtureTools.estadoMiniPack()
        val conSecuencia = estado.copy(lastAppliedSequence = 3, packVersion = "1.3.0")
        val backup = BackupManager.crearBackup(
            listOf(conSecuencia), JSONObject().put("language", "es-VE").put("theme_mode", "dark"),
            "web", "2026-11-25T10:00:00Z", "0.1.0"
        )
        val r = BackupManager.restablecerBackup(backup.toString(), FixtureTools.CLIENT_VERSION, truststore, FixtureTools.ISO_NOW)
        assertTrue(r.ok)
        assertEquals(3, r.estados[0].lastAppliedSequence)
        assertEquals("1.3.0", r.estados[0].packVersion)
    }

    @Test
    fun `el backup jamas contiene datos personales`() {
        val prep = FixtureTools.construirBackup("ninguna")
        val claves = prep.backup!!.getJSONObject("settings").keys().asSequence().toList().sorted()
        assertEquals(listOf("dynamic_color", "festivities_enabled", "festivity_override", "language", "sober_mode", "theme_mode"), claves)
    }

    // ------------------------------------------------------------- búsqueda

    @Test
    fun `los indices cubren ID, tipo y tecnologia`() {
        val (estado, _) = FixtureTools.estadoMiniPack()
        val idx = PackStoreOps.construirIndices(estado)
        assertEquals(3, idx.porId.size)
        assertEquals(listOf("certificado", "pregunta", "tecnologia"), idx.porTipo.keys.sorted())
        assertEquals(listOf("qst:demo-test-0001"), idx.porTecnologia["tec:demo-test"])
    }

    @Test
    fun `todos los casos de busqueda dan los IDs esperados`() {
        val cases = FixtureTools.FIXTURES.getJSONArray("search_cases")
        for (i in 0 until cases.length()) {
            val caso = cases.getJSONObject(i)
            val q = caso.getJSONObject("query")
            val (estado, _) = FixtureTools.estadoMiniPack()
            val r = PackStoreOps.buscar(
                estado,
                texto = q.optString("texto", ""),
                tipo = if (q.has("tipo")) q.getString("tipo") else null,
                tecnologia = if (q.has("tecnologia")) q.getString("tecnologia") else null
            )
            val esperado = caso.getJSONArray("expect_ids")
            val ids = JSONArray()
            r.forEach { ids.put(it.getString("id")) }
            assertEquals("caso '${caso.getString("name")}'", esperado.length(), ids.length())
            for (j in 0 until esperado.length()) {
                assertTrue("caso '${caso.getString("name")}': falta ${esperado.getString(j)} en $ids", ids.toList().contains(esperado.getString(j)))
            }
        }
    }

    // ------------------------------------------------------------- almacén local

    @Test
    fun `los casos de migraciones del almacen local dan el resultado esperado`() {
        val cases = FixtureTools.FIXTURES.getJSONArray("local_store_cases")
        val sinteticas = MigradorLocal.sinteticas()
        for (i in 0 until cases.length()) {
            val caso = cases.getJSONObject(i)
            val migracion = caso.getString("migracion")
            val registro = when (migracion) {
                "fallida" -> listOf(sinteticas["fallida"]!!)
                "sintetica-v1-v2" -> listOf(sinteticas["sintetica-v1-v2"]!!)
                else -> emptyList()
            }
            val migrador = MigradorLocal(registro)
            val storeIn = if (caso.isNull("store_in")) null else JSONObject(caso.getJSONObject("store_in").toString())
            val objetivo = if (migracion == "ninguna") 1 else 2
            val r = migrador.migrarAlmacen(storeIn, objetivo)
            if (caso.has("expect_error")) {
                assertFalse(r.ok)
                assertEquals(caso.getString("expect_error"), r.codigo)
                // ROLLBACK: el almacén queda exactamente como estaba.
                assertEquals(CanonicalJson.serialize(caso.getJSONObject("expect_store")), CanonicalJson.serialize(r.store))
            } else {
                assertTrue(r.ok)
                if (caso.has("expect_store")) {
                    assertEquals(CanonicalJson.serialize(caso.getJSONObject("expect_store")), CanonicalJson.serialize(r.store))
                }
                if (caso.has("expect_local_schema_version")) {
                    assertEquals(caso.getInt("expect_local_schema_version"), r.store.getInt("local_schema_version"))
                }
            }
        }
    }

    @Test
    fun `sin ruta declarada no hay migracion`() {
        val r = MigradorLocal(emptyList()).migrarAlmacen(JSONObject().put("local_schema_version", 5).put("packs", JSONObject()), 6)
        assertFalse(r.ok)
        assertEquals(Contract.Errores.MIGRACION_FALLIDA, r.codigo)
    }
}
