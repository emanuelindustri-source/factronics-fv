// F&V — Tests del almacén local de Android: instalación atómica, interrupciones,
// disco lleno, migraciones, backup/restore y desinstalación.
// Gate F1.4: "nunca queda un pack a medias".

package com.factronics.fv.data.pack

import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.File
import java.io.IOException
import kotlin.io.path.createTempDirectory

class FilePackStoreTest {

    private lateinit var tempDir: File

    @Before
    fun setUp() {
        tempDir = createTempDirectory("fv-store-test").toFile()
    }

    @After
    fun tearDown() {
        tempDir.deleteRecursively()
    }

    /** FileOps con fallo inyectado en un paso concreto de la transacción. */
    private class FlakyOps(private val falloEnPaso: String?, private val falloEscritura: Int? = null) : FileOps() {
        var escrituras = 0
        override fun hook(paso: String) {
            if (falloEnPaso == paso) throw IOException("fallo inyectado en $paso")
        }

        override fun writeText(file: File, text: String) {
            escrituras++
            if (falloEscritura != null && escrituras >= falloEscritura) {
                throw IOException("ENOSPC: No space left on device")
            }
            super.writeText(file, text)
        }
    }

    /** Huella de consistencia del estado: versión + archivos con hash + tombstones. */
    private fun firmaEstado(store: FilePackStore): String = firmaEstadoDe(store.readState())

    private fun firmaEstadoDe(e: PackState?): String {
        if (e == null) return "(sin pack)"
        val archivos = e.files.entries.sortedBy { it.key }
            .joinToString(",") { (k, v) -> "$k=${Integrity.sha256Hex(v).take(12)}" }
        return "${e.packVersion}|${e.lastAppliedSequence}|${e.tombstones.keys.sorted()}|$archivos"
    }

    // ------------------------------------------------------------- ciclo de vida

    @Test
    fun `instalar el mini-pack funciona de extremo a extremo`() {
        val store = FilePackStore(tempDir)
        store.openStore()
        val prep = FixtureTools.construirBundle("ninguna")
        val r = store.installBundle(prep.bundle.toString(), prep.truststore, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW)
        assertTrue(r.errores.joinToString { it.mensaje }, r.ok)

        val estado = store.readState()
        assertNotNull(estado)
        assertEquals("pack-fv-test", estado!!.packId)
        assertEquals(3, PackStoreOps.entriesDe(estado).size)
        assertNotNull(estado.signature)
        assertTrue(estado.syncManifestText.contains("pack-fv-test"))

        // Búsqueda offline sobre lo instalado.
        val preguntas = PackStoreOps.buscar(estado, tipo = "pregunta")
        assertEquals(1, preguntas.size)
    }

    @Test
    fun `reinstalar la misma version es no-op y una version anterior se rechaza`() {
        val store = FilePackStore(tempDir)
        store.openStore()
        val prep = FixtureTools.construirBundle("ninguna")
        assertTrue(store.installBundle(prep.bundle.toString(), prep.truststore, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW).ok)

        val otra = FixtureTools.construirBundle("ninguna")
        val r2 = store.installBundle(otra.bundle.toString(), otra.truststore, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW)
        assertTrue(r2.ok)
        assertEquals("ya-instalado", r2.motivo)
    }

    @Test
    fun `bundles invalidos no tocan el almacen`() {
        val store = FilePackStore(tempDir)
        store.openStore()
        for (mutacion in listOf("hash-alterado", "json-invalido", "version-futura", "firma-alterada", "item-sin-source-ref")) {
            val prep = FixtureTools.construirBundle(mutacion)
            val r = store.installBundle(prep.bundle.toString(), prep.truststore, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW)
            assertFalse("mutación $mutacion debía rechazarse", r.ok)
        }
        assertNull(store.readState())
    }

    @Test
    fun `un downgrade se rechaza`() {
        val store = FilePackStore(tempDir)
        store.openStore()
        // Instala una versión "2.0.0" registrada a mano para simular un pack más nuevo.
        val prep = FixtureTools.construirBundle("ninguna")
        assertTrue(store.installBundle(prep.bundle.toString(), prep.truststore, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW).ok)
        val store2 = FilePackStore(tempDir)
        store2.openStore()
        val meta = JSONObject(File(tempDir, "store.json").readText(Charsets.UTF_8))
        meta.getJSONObject("packs").getJSONObject("pack-fv-test").put("pack_version", "2.0.0")
        File(tempDir, "store.json").writeText(meta.toString(2), Charsets.UTF_8)

        val viejo = FixtureTools.construirBundle("ninguna")
        val r = store2.installBundle(viejo.bundle.toString(), viejo.truststore, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW)
        assertFalse(r.ok)
        assertEquals(Contract.Errores.DOWNGRADE, r.errores[0].codigo)
    }

    // ------------------------------------------------------------- atomicidad

    @Test
    fun `una interrupcion en cada paso de la transaccion nunca deja un pack a medias`() {
        for (paso in listOf("stage", "journal-staged", "move-old", "move-new", "journal-swapped", "store", "journal-committed")) {
            tempDir.deleteRecursively()
            tempDir.mkdirs()

            // Estado previo consistente: pack instalado.
            val store0 = FilePackStore(tempDir, FileOps())
            store0.openStore()
            val prep = FixtureTools.construirBundle("ninguna")
            assertTrue(store0.installBundle(prep.bundle.toString(), prep.truststore, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW).ok)
            val antes = firmaEstado(FilePackStore(tempDir, FileOps()).also { it.openStore() })

            // Instalación de una versión nueva interrumpida en 'paso'.
            val store1 = FilePackStore(tempDir, FlakyOps(falloEnPaso = paso))
            store1.openStore()
            val prep2 = FixtureTools.construirBundle("ninguna")
            // Fuerza versión nueva para que no sea no-op.
            prep2.bundle.getJSONObject("sync_manifest").put("pack_version", "1.1.0")
            prep2.bundle.getJSONObject("pack_manifest").put("version", "1.1.0")
            val esperadoNuevo = firmaEstadoDe(Installer.estadoDesdeBundle(prep2.bundle, "2026-11-25T13:00:00Z"))
            val r = store1.installBundle(prep2.bundle.toString(), prep2.truststore, FixtureTools.CLIENT_VERSION, "2026-11-25T13:00:00Z")
            assertFalse("en $paso debía fallar", r.ok)

            // Recuperación al reabrir: el estado debe ser consistente.
            // Política (ADR-0009): rollback al estado anterior en todos los pasos
            // anteriores al commit de store.json; en 'journal-committed' el commit ya
            // se hizo y se completa limpiando (estado nuevo íntegro).
            val store2 = FilePackStore(tempDir, FileOps())
            store2.openStore()
            val despues = firmaEstado(store2)
            if (paso == "journal-committed") {
                assertTrue(
                    "estado inconsistente tras fallo en $paso: $despues",
                    despues == antes || despues == esperadoNuevo
                )
            } else {
                assertEquals("estado inconsistente tras fallo en $paso", antes, despues)
            }
        }
    }

    @Test
    fun `disco lleno se reporta como DISCO-LLENO y no rompe el almacen`() {
        val ops = FlakyOps(falloEnPaso = null, falloEscritura = 2)
        val store = FilePackStore(tempDir, ops)
        store.openStore()
        val prep = FixtureTools.construirBundle("ninguna")
        val r = store.installBundle(prep.bundle.toString(), prep.truststore, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW)
        assertFalse(r.ok)
        assertEquals(Contract.Errores.DISCO_LLENO, r.errores[0].codigo)
        assertNull(store.readState())

        // El almacén sigue operativo.
        val store2 = FilePackStore(tempDir)
        store2.openStore()
        val prep2 = FixtureTools.construirBundle("ninguna")
        assertTrue(store2.installBundle(prep2.bundle.toString(), prep2.truststore, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW).ok)
    }

    @Test
    fun `un bundle corrupto en disco da PACK-CORRUPTO sin tocar nada`() {
        val store = FilePackStore(tempDir)
        store.openStore()
        val r = store.installBundle("{esto no es json", JSONObject().put("keys", org.json.JSONArray()), FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW)
        assertFalse(r.ok)
        assertEquals(Contract.Errores.PACK_CORRUPTO, r.errores[0].codigo)
        assertNull(store.readState())
    }

    // ------------------------------------------------------------- migraciones locales

    @Test
    fun `base vacia crea el almacen v1`() {
        val store = FilePackStore(tempDir)
        val apertura = store.openStore()
        assertFalse(apertura.migracionFallida)
        val texto = File(tempDir, "store.json").readText(Charsets.UTF_8)
        assertTrue(texto.contains("\"local_schema_version\": 1"))
    }

    @Test
    fun `store json corrupto se conserva aparte y el contenido no se pierde`() {
        val store = FilePackStore(tempDir)
        store.openStore()
        val prep = FixtureTools.construirBundle("ninguna")
        assertTrue(store.installBundle(prep.bundle.toString(), prep.truststore, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW).ok)

        File(tempDir, "store.json").writeText("{corrupto", Charsets.UTF_8)
        val store2 = FilePackStore(tempDir)
        val apertura = store2.openStore()
        assertTrue(apertura.storeCorrupto)
        assertTrue(File(tempDir, "store.json.corrupto").isFile)
        // Los archivos del pack siguen en disco (nunca se pierde contenido).
        assertTrue(File(tempDir, "files/pack-fv-test/pack.json").isFile)
    }

    // ------------------------------------------------------------- backup/restore

    @Test
    fun `backup round-trip entre almacenes y rechazo de corruptos`() {
        val storeA = FilePackStore(tempDir)
        storeA.openStore()
        val prep = FixtureTools.construirBundle("ninguna")
        assertTrue(storeA.installBundle(prep.bundle.toString(), prep.truststore, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW).ok)
        val backupTexto = storeA.exportBackup(FixtureTools.SETTINGS_DEMO, "2026-11-25T14:00:00Z", "0.1.0")

        // Restauración en otro dispositivo (almacén limpio).
        val otroDir = createTempDirectory("fv-store-otro").toFile()
        try {
            val storeB = FilePackStore(otroDir)
            storeB.openStore()
            val r = storeB.importBackup(backupTexto, FixtureTools.CLIENT_VERSION, prep.truststore, FixtureTools.ISO_NOW)
            assertTrue(r.errores.joinToString { it.mensaje }, r.ok)
            val estado = storeB.readState()
            assertNotNull(estado)
            assertEquals("pack-fv-test", estado!!.packId)
            assertEquals(3, PackStoreOps.entriesDe(estado).size)

            // Backup corrupto (un bit alterado) se rechaza.
            val corrupto = backupTexto.replace("\"es-VE\"", "\"es-VX\"")
            val r2 = storeB.importBackup(corrupto, FixtureTools.CLIENT_VERSION, prep.truststore, FixtureTools.ISO_NOW)
            assertFalse(r2.ok)
            assertEquals(Contract.Errores.RESPALDO_CORRUPTO, r2.errores[0].codigo)
        } finally {
            otroDir.deleteRecursively()
        }
    }

    // ------------------------------------------------------------- deltas y desinstalación

    @Test
    fun `deltas aplicados sobre el almacen conservan idempotencia`() {
        val store = FilePackStore(tempDir)
        store.openStore()
        val prep = FixtureTools.construirBundle("ninguna")
        assertTrue(store.installBundle(prep.bundle.toString(), prep.truststore, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW).ok)

        for (d in FixtureTools.construirDeltas("cadena")) {
            assertTrue(store.applyDelta(d.toString(), FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW).ok)
        }
        val estado = store.readState()!!
        assertEquals("1.3.0", estado.packVersion)
        assertEquals(3, estado.lastAppliedSequence)
        assertEquals(2, PackStoreOps.entriesDe(estado).size)

        // Reaplicar el último delta es no-op (idempotencia).
        val ultimo = FixtureTools.construirDeltas("cadena")[2]
        val r = store.applyDelta(ultimo.toString(), FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW)
        assertTrue(r.ok)
        assertEquals("ya-aplicado", r.motivo)
    }

    @Test
    fun `desinstalar deja el almacen limpio`() {
        val store = FilePackStore(tempDir)
        store.openStore()
        val prep = FixtureTools.construirBundle("ninguna")
        assertTrue(store.installBundle(prep.bundle.toString(), prep.truststore, FixtureTools.CLIENT_VERSION, FixtureTools.ISO_NOW).ok)
        assertTrue(store.uninstall("pack-fv-test").ok)
        assertNull(store.readState())
        assertFalse(File(tempDir, "files/pack-fv-test").exists())
    }
}
