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

    /**
     * SOLO DEBUG — escritura síncrona para el smoke test por ADB.
     * El receptor de debug se ejecuta en un proceso que se detiene enseguida;
     * apply() podría no alcanzar a escribir en disco.
     */
    fun persistForTest(language: String, specialUnlocked: Boolean): Boolean =
        prefs.edit()
            .putString(KEY_LANGUAGE, SupportedLocales.normalize(language))
            .putBoolean(KEY_SPECIAL_LOCALES, specialUnlocked)
            .commit()

    private companion object {
        const val KEY_LANGUAGE = "language"
        const val KEY_THEME = "theme_mode"
        const val KEY_DYNAMIC = "dynamic_color"
        const val KEY_SPECIAL_LOCALES = "special_locales_unlocked"
    }
}
