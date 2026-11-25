// F&V — Tests del bundle DEMO real (packages/content-packs-demo/bundle) contra el
// almacén de Android: instalación verificada, búsqueda offline y estado de Ajustes.
// El bundle lo genera tools/pack-bundle.mjs y su integridad la comprueba también
// packages/content-packs-demo/test/bundle.test.mjs.

package com.factronics.fv.data.pack

import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.File
import kotlin.io.path.createTempDirectory

class DemoBundleTest {

    private lateinit var tempDir: File
    private val bundleFile = File("../../../packages/content-packs-demo/bundle/pack-fv-demo.fvpack")
    private val truststoreFile = File("../../../packages/content-packs-demo/bundle/truststore.json")

    @Before
    fun setUp() {
        tempDir = createTempDirectory("fv-demo-store").toFile()
    }

    @After
    fun tearDown() {
        tempDir.deleteRecursively()
    }

    @Test
    fun `el bundle demo real pasa la validacion del contrato con su truststore DEMO`() {
        assertTrue("falta el bundle demo (ejecuta node tools/pack-bundle.mjs)", bundleFile.isFile)
        val bundle = JSONObject(bundleFile.readText(Charsets.UTF_8))
        val truststore = JSONObject(truststoreFile.readText(Charsets.UTF_8))
        val r = Installer.validarBundle(bundle, truststore, "0.5.0", null)
        assertTrue(r.errores.joinToString { it.mensaje }, r.valido)
    }

    @Test
    fun `el truststore DEMO solo contiene la clave publica`() {
        val truststore = JSONObject(truststoreFile.readText(Charsets.UTF_8))
        val keys = truststore.getJSONArray("keys")
        for (i in 0 until keys.length()) {
            val k = keys.getJSONObject(i)
            assertTrue(k.getBoolean("demo"))
            assertTrue(k.getString("public_key").isNotEmpty())
            assertTrue("PROHIBIDO: la clave privada jamás se publica", !k.has("private_key"))
        }
    }

    @Test
    fun `instalar el pack demo offline deja 25 items buscables y resumen de Ajustes`() {
        val store = FilePackStore(tempDir)
        store.openStore()
        val bundleText = bundleFile.readText(Charsets.UTF_8)
        val truststore = JSONObject(truststoreFile.readText(Charsets.UTF_8))
        val r = store.installBundle(bundleText, truststore, "0.5.0", "2026-11-25T12:00:00Z")
        assertTrue(r.errores.joinToString { it.mensaje }, r.ok)

        val estado = store.readState()
        assertNotNull(estado)
        assertEquals("pack-fv-demo", estado!!.packId)
        assertEquals(25, PackStoreOps.entriesDe(estado).size)

        val resumen = Installer.resumenDe(estado)
        assertEquals("1.0.0", resumen.getString("packVersion"))
        assertTrue(resumen.getBoolean("demo"))
        assertTrue(resumen.getLong("tamanoBytes") > 0)

        // Búsqueda offline por tipo, tecnología y texto.
        assertEquals(3, PackStoreOps.buscar(estado, tipo = "pregunta").size)
        assertTrue(PackStoreOps.buscar(estado, texto = "DEMO-DOC").isNotEmpty())
        val idx = PackStoreOps.construirIndices(estado)
        assertEquals(25, idx.porId.size)
        assertEquals(15, idx.porTipo.size)
    }
}
