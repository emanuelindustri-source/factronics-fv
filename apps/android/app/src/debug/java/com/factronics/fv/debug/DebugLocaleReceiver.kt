package com.factronics.fv.debug

import android.app.LocaleManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.LocaleList
import com.factronics.fv.data.SettingsStore
import com.factronics.fv.data.SupportedLocales

/**
 * SOLO BUILDS DEBUG — hook de pruebas para el smoke test de 13 locales.
 *
 * Permite fijar el idioma desde ADB sin tocar la interfaz:
 *   adb shell am broadcast -a com.factronics.fv.DEBUG_SET_LANG --es lang ja
 *
 * El script de evidencia reinicia la app después (force-stop + start) para que
 * el nuevo contexto aplique el idioma. No existe en release (src/debug).
 * Ver ADR-0007.
 */
class DebugLocaleReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val tag = intent.getStringExtra(EXTRA_LANG) ?: return
        if (SupportedLocales.all.none { it.tag == tag }) return

        val store = SettingsStore(context)
        val isSpecial = SupportedLocales.all.first { it.tag == tag }.special
        if (!store.persistForTest(tag, isSpecial || store.specialLocalesUnlocked)) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.getSystemService(LocaleManager::class.java).applicationLocales =
                LocaleList.getEmptyLocaleList()
        }
    }

    private companion object {
        const val EXTRA_LANG = "lang"
    }
}
