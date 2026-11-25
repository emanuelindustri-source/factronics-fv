package com.factronics.fv.data

import android.content.Context

/**
 * Preferencias locales del usuario (Fase 0).
 * En fases posteriores se migra a DataStore (ver PLAN_MAESTRO, F2.x).
 */
class SettingsStore(context: Context) {

    private val prefs = context.getSharedPreferences("fv_settings", Context.MODE_PRIVATE)

    /** "es" | "en" */
    var language: String
        get() = prefs.getString(KEY_LANGUAGE, "es") ?: "es"
        set(value) = prefs.edit().putString(KEY_LANGUAGE, value).apply()

    /** "system" | "light" | "dark" */
    var themeMode: String
        get() = prefs.getString(KEY_THEME, "system") ?: "system"
        set(value) = prefs.edit().putString(KEY_THEME, value).apply()

    /** Material You (Android 12+) */
    var dynamicColor: Boolean
        get() = prefs.getBoolean(KEY_DYNAMIC, true)
        set(value) = prefs.edit().putBoolean(KEY_DYNAMIC, value).apply()

    private companion object {
        const val KEY_LANGUAGE = "language"
        const val KEY_THEME = "theme_mode"
        const val KEY_DYNAMIC = "dynamic_color"
    }
}
