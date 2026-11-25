package com.factronics.fv.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.w3c.dom.Element
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/**
 * Gate F1.2: todos los locales Android tienen exactamente las mismas claves
 * que el idioma base, sin valores vacíos y con los mismos marcadores.
 */
class StringResourcesTest {

    private val resDir = File("src/main/res")

    private fun stringsFile(folder: String) = File(resDir, "$folder/strings.xml")

    private fun locales(): List<String> =
        resDir.listFiles()
            ?.filter { it.isDirectory && stringsFile(it.name).exists() }
            ?.map { it.name }
            ?.sorted()
            ?: emptyList()

    private fun readStrings(file: File): Map<String, String> {
        val document = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file)
        val nodes = document.getElementsByTagName("string")
        val result = mutableMapOf<String, String>()
        for (index in 0 until nodes.length) {
            val element = nodes.item(index) as Element
            result[element.getAttribute("name")] = element.textContent
        }
        return result
    }

    private fun placeholders(value: String): List<String> =
        Regex("%[0-9]+\\\$[sd]").findAll(value).map { it.value }.sorted().toList()

    @Test
    fun `todos los locales tienen las mismas claves que la base`() {
        val base = readStrings(stringsFile("values"))
        assertTrue(base.isNotEmpty())
        val allLocales = locales()
        assertTrue("Se esperaban al menos 12 carpetas de idioma", allLocales.size >= 12)

        for (folder in allLocales) {
            val current = readStrings(stringsFile(folder))
            assertEquals("$folder: número de claves", base.keys.size, current.keys.size)
            assertEquals("$folder: claves distintas", base.keys.sorted(), current.keys.sorted())
            for ((name, value) in current) {
                assertTrue("$folder/$name vacío", value.trim().isNotEmpty())
                assertEquals("$folder/$name: marcadores", placeholders(base.getValue(name)), placeholders(value))
            }
        }
    }

    @Test
    fun `espanol de Venezuela es la carpeta base`() {
        val es = readStrings(stringsFile("values"))
        assertEquals("Hola, F&V", es["home_greeting"])
        assertEquals("es-VE no debe tener carpeta propia; values ya es es-VE", "F&V", es["app_name"])
    }
}
