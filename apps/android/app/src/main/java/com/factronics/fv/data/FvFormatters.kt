package com.factronics.fv.data

import java.text.DateFormat
import java.text.NumberFormat
import java.time.Instant
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Formatos sensibles al idioma (F1.2): números, porcentajes y fechas.
 * Los valores de ejemplo son fijos y visibles en Ajustes para comprobar el formato.
 */
object FvFormatters {

    const val SAMPLE_NUMBER = 1234.5
    const val SAMPLE_PERCENT = 0.25

    /** 2026-11-25 12:00 UTC — fecha de ejemplo, no dato técnico. */
    val SAMPLE_DATE: Long = Instant.parse("2026-11-25T12:00:00Z").toEpochMilli()

    fun formatNumber(value: Double, locale: Locale): String =
        NumberFormat.getNumberInstance(locale).apply {
            minimumFractionDigits = 1
            maximumFractionDigits = 1
        }.format(value)

    fun formatInteger(value: Long, locale: Locale): String =
        NumberFormat.getIntegerInstance(locale).format(value)

    fun formatPercent(fraction: Double, locale: Locale): String =
        NumberFormat.getPercentInstance(locale).apply {
            maximumFractionDigits = 0
        }.format(fraction)

    fun formatDate(epochMillis: Long, locale: Locale): String =
        DateFormat.getDateInstance(DateFormat.LONG, locale).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date(epochMillis))

    fun formatDate(epochMillis: Long, tag: String): String =
        formatDate(epochMillis, SupportedLocales.formattingLocale(tag))
}
