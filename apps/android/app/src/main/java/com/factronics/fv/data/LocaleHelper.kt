package com.factronics.fv.data

import android.app.LocaleManager
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.os.LocaleList

/**
 * Aplica el idioma elegido al contexto de la actividad.
 *
 * En Android 13+ se integra con el selector de idioma por aplicación del sistema
 * (locales_config). En versiones anteriores se usa SharedPreferences.
 */
object LocaleHelper {

    fun wrap(context: Context): Context {
        val tag = currentTag(context)
        val locale = SupportedLocales.resourceLocale(tag)
        val config = Configuration(context.resources.configuration)
        config.setLocale(locale)
        config.setLayoutDirection(locale)
        return context.createConfigurationContext(config)
    }

    /** Etiqueta efectiva: la del sistema (API 33+) o la guardada por la app. */
    fun currentTag(context: Context): String {
        val store = SettingsStore(context)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val systemLocales = context.getSystemService(LocaleManager::class.java).applicationLocales
            if (!systemLocales.isEmpty) {
                val tag = systemLocales[0].toLanguageTag()
                if (SupportedLocales.all.any { it.tag == tag }) {
                    if (store.language != tag) store.language = tag
                    return tag
                }
            }
        }
        return store.language
    }

    /**
     * Sincroniza el idioma con el sistema cuando es un idioma real.
     * El latín y el pseudo-local no se anuncian al sistema: se aplican solo
     * dentro de la app mediante SharedPreferences y recreate().
     *
     * @return true si el cambio lo aplicará el sistema (recreación automática)
     */
    fun applyToSystem(context: Context, tag: String): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return false
        val manager = context.getSystemService(LocaleManager::class.java)
        val target = if (tag in SupportedLocales.realTags) {
            LocaleList.forLanguageTags(tag)
        } else {
            LocaleList.getEmptyLocaleList()
        }
        if (manager.applicationLocales == target) return false
        manager.applicationLocales = target
        return true
    }
}
