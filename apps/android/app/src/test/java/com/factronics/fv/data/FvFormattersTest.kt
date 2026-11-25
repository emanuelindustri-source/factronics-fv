package com.factronics.fv.data

import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.Locale
import java.util.TimeZone

/**
 * Gate F1.2: formato de números, porcentajes y fechas en al menos
 * es-VE, en-US, de-DE y ja-JP.
 */
class FvFormattersTest {

    private val esVe = Locale.forLanguageTag("es-VE")
    private val enUs = Locale.forLanguageTag("en-US")
    private val deDe = Locale.forLanguageTag("de-DE")
    private val jaJp = Locale.forLanguageTag("ja-JP")

    @Test
    fun `número con separadores por locale`() {
        assertEquals("1.234,5", FvFormatters.formatNumber(1234.5, esVe))
        assertEquals("1,234.5", FvFormatters.formatNumber(1234.5, enUs))
        assertEquals("1.234,5", FvFormatters.formatNumber(1234.5, deDe))
        assertEquals("1,234.5", FvFormatters.formatNumber(1234.5, jaJp))
    }

    @Test
    fun `porcentaje por locale`() {
        assertEquals("25\u00A0%", FvFormatters.formatPercent(0.25, esVe))
        assertEquals("25%", FvFormatters.formatPercent(0.25, enUs))
        assertEquals("25\u00A0%", FvFormatters.formatPercent(0.25, deDe))
        assertEquals("25%", FvFormatters.formatPercent(0.25, jaJp))
    }

    @Test
    fun `fecha larga por locale en UTC`() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"))
        assertEquals("25 de noviembre de 2026", FvFormatters.formatDate(FvFormatters.SAMPLE_DATE, esVe))
        assertEquals("November 25, 2026", FvFormatters.formatDate(FvFormatters.SAMPLE_DATE, enUs))
        assertEquals("25. November 2026", FvFormatters.formatDate(FvFormatters.SAMPLE_DATE, deDe))
        assertEquals("2026年11月25日", FvFormatters.formatDate(FvFormatters.SAMPLE_DATE, jaJp))
    }

    @Test
    fun `el español de Venezuela es el idioma por defecto y migra desde es`() {
        assertEquals("es-VE", SupportedLocales.normalize("es"))
        assertEquals("es-VE", SupportedLocales.normalize("es-VE"))
        assertEquals("ja", SupportedLocales.normalize("ja"))
        assertEquals("es-VE", SupportedLocales.normalize("xx"))
        assertEquals("en-US", SupportedLocales.formattingLocale("en").toLanguageTag())
        assertEquals("ja-JP", SupportedLocales.formattingLocale("ja").toLanguageTag())
    }

    @Test
    fun `hay 11 idiomas reales y 2 especiales`() {
        assertEquals(11, SupportedLocales.real.size)
        assertEquals(2, SupportedLocales.special.size)
        assertEquals(
            13,
            SupportedLocales.all.map { it.tag }.distinct().size
        )
    }
}
