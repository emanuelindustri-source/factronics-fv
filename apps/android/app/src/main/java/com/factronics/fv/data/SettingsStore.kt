package com.factronics.fv.data

import android.content.Context

/**
 * Preferencias locales del usuario.
 * En fases posteriores se migra a DataStore (ver PLAN_MAESTRO, F2.x).
 */
class SettingsStore(context: Context) {

    private val prefs = context.getSharedPreferences("fv_settings", Context.MODE_PRIVATE)

    /** Etiqueta BCP-47 del idioma elegido; por defecto español de Venezuela. */
    var language: String
        get() = SupportedLocales.normalize(prefs.getString(KEY_LANGUAGE, SupportedLocales.DEFAULT) ?: SupportedLocales.DEFAULT)
        set(value) = prefs.edit().putString(KEY_LANGUAGE, SupportedLocales.normalize(value)).apply()

    /** "system" | "light" | "dark" */
    var themeMode: String
        get() = prefs.getString(KEY_THEME, "system") ?: "system"
        set(value) = prefs.edit().putString(KEY_THEME, value).apply()

    /** Material You (Android 12+) */
    var dynamicColor: Boolean
        get() = prefs.getBoolean(KEY_DYNAMIC, true)
        set(value) = prefs.edit().putBoolean(KEY_DYNAMIC, value).apply()

    /** Desbloquea latín y pseudo-local tras el easter egg de la versión. */
    var specialLocalesUnlocked: Boolean
        get() = prefs.getBoolean(KEY_SPECIAL_LOCALES, false)
        set(value) = prefs.edit().putBoolean(KEY_SPECIAL_LOCALES, value).apply()

    /** F1.3: capa de festividades y modo sobrio. */
    var festivitiesEnabled: Boolean
        get() = prefs.getBoolean(KEY_FESTIVITIES, true)
        set(value) = prefs.edit().putBoolean(KEY_FESTIVITIES, value).apply()

    var soberMode: Boolean
        get() = prefs.getBoolean(KEY_SOBER, false)
        set(value) = prefs.edit().putBoolean(KEY_SOBER, value).apply()

    /** "auto" | "none" | id de festividad */
    var festivityOverride: String
        get() = prefs.getString(KEY_FESTIVITY_OVERRIDE, "auto") ?: "auto"
        set(value) = prefs.edit().putString(KEY_FESTIVITY_OVERRIDE, value).apply()

    /**
     * SOLO DEBUG — escritura síncrona para el smoke test por ADB.
     * El receptor de debug se ejecuta en un proceso que se detiene enseguida;
     * apply() podría no alcanzar a escribir en disco.
     */
    fun persistForTest(
        language: String? = null,
        specialUnlocked: Boolean? = null,
        themeMode: String? = null,
        festivityOverride: String? = null,
        soberMode: Boolean? = null,
        festivitiesEnabled: Boolean? = null,
        dynamicColor: Boolean? = null
    ): Boolean {
        val editor = prefs.edit()
        language?.let { editor.putString(KEY_LANGUAGE, SupportedLocales.normalize(it)) }
        specialUnlocked?.let { editor.putBoolean(KEY_SPECIAL_LOCALES, it) }
        themeMode?.let { editor.putString(KEY_THEME, it) }
        festivityOverride?.let { editor.putString(KEY_FESTIVITY_OVERRIDE, it) }
        soberMode?.let { editor.putBoolean(KEY_SOBER, it) }
        festivitiesEnabled?.let { editor.putBoolean(KEY_FESTIVITIES, it) }
        dynamicColor?.let { editor.putBoolean(KEY_DYNAMIC, it) }
        return editor.commit()
    }

    private companion object {
        const val KEY_LANGUAGE = "language"
        const val KEY_THEME = "theme_mode"
        const val KEY_DYNAMIC = "dynamic_color"
        const val KEY_SPECIAL_LOCALES = "special_locales_unlocked"
        const val KEY_FESTIVITIES = "festivities_enabled"
        const val KEY_SOBER = "sober_mode"
        const val KEY_FESTIVITY_OVERRIDE = "festivity_override"
    }
}
