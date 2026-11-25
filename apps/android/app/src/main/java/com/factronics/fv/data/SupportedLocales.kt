package com.factronics.fv.data

/**
 * Idiomas soportados por F&V (F1.2).
 *
 * Los nombres de los idiomas se muestran siempre en su propia lengua (endónimos),
 * por convención de localización; no se traducen y viven fuera del catálogo.
 * El latín y el pseudo-local solo aparecen tras el easter egg de la versión.
 */
object SupportedLocales {

    const val DEFAULT = "es-VE"

    data class FvLocale(
        val tag: String,
        val label: String,
        val formattingTag: String,
        val resourceTag: String = tag,
        val special: Boolean = false
    )

    val real = listOf(
        FvLocale("es-VE", "Español (Venezuela)", "es-VE"),
        FvLocale("en", "English", "en-US"),
        FvLocale("pt-BR", "Português (Brasil)", "pt-BR"),
        FvLocale("pt-PT", "Português (Portugal)", "pt-PT"),
        FvLocale("it", "Italiano", "it-IT"),
        FvLocale("de", "Deutsch", "de-DE"),
        FvLocale("fr", "Français", "fr-FR"),
        FvLocale("zh-Hans", "简体中文", "zh-Hans"),
        FvLocale("ja", "日本語", "ja-JP"),
        FvLocale("ko", "한국어", "ko-KR"),
        FvLocale("hi", "हिन्दी", "hi-IN")
    )

    val special = listOf(
        FvLocale("la", "Latina · easter egg", "la", "la", special = true),
        FvLocale("es-XA", "Pseudo-local · QA", "es-XA", "qps", special = true)
    )

    val all: List<FvLocale> = real + special

    val realTags: List<String> = real.map { it.tag }

    fun visible(specialUnlocked: Boolean): List<FvLocale> = if (specialUnlocked) all else real

    fun formattingLocale(tag: String): java.util.Locale =
        java.util.Locale.forLanguageTag(all.firstOrNull { it.tag == tag }?.formattingTag ?: tag)

    /** Locale usado para resolver recursos Android (el pseudo usa "qps"). */
    fun resourceLocale(tag: String): java.util.Locale =
        java.util.Locale.forLanguageTag(all.firstOrNull { it.tag == tag }?.resourceTag ?: tag)

    /** Compatibilidad con instalaciones F0/F1.1 que guardaban "es" | "en". */
    fun normalize(tag: String): String = when {
        tag == "es" -> DEFAULT
        all.any { it.tag == tag } -> tag
        else -> DEFAULT
    }
}
