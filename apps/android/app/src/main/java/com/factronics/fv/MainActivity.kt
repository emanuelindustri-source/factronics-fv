package com.factronics.fv

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.factronics.fv.data.FestivityEngine
import com.factronics.fv.data.LocaleHelper
import com.factronics.fv.data.SettingsStore
import com.factronics.fv.data.SupportedLocales
import com.factronics.fv.data.pack.ContentManager
import com.factronics.fv.data.pack.ContentSummary
import com.factronics.fv.ui.FVApp
import com.factronics.fv.ui.screens.ContentActions
import com.factronics.fv.ui.theme.FVTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.ZoneId

class MainActivity : ComponentActivity() {

    override fun attachBaseContext(newBase: Context) {
        super.attachBaseContext(LocaleHelper.wrap(newBase))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        val settings = SettingsStore(this)
        setContent {
            var themeMode by remember { mutableStateOf(settings.themeMode) }
            var dynamicColor by remember { mutableStateOf(settings.dynamicColor) }
            var festivitiesEnabled by remember { mutableStateOf(settings.festivitiesEnabled) }
            var soberMode by remember { mutableStateOf(settings.soberMode) }
            var festivityOverride by remember { mutableStateOf(settings.festivityOverride) }
            var now by remember { mutableStateOf(Instant.now()) }

            // --- Contenido offline (F1.4): packs, búsqueda y backup ---
            val contentManager = remember { ContentManager(applicationContext) }
            var contentVersion by remember { mutableStateOf(0) }
            var contentMessage by remember { mutableStateOf<Pair<Int, String?>?>(null) }

            LaunchedEffect(Unit) {
                withContext(Dispatchers.IO) { contentManager.open() }
                contentVersion++
            }

            LaunchedEffect(Unit) {
                while (true) {
                    delay(60_000)
                    now = Instant.now()
                }
            }

            val contentSummary = remember(contentVersion) {
                runCatching { contentManager.summary() }.getOrDefault(ContentSummary(instalado = false))
            }
            val contentActions = ContentActions(
                summary = contentSummary,
                messageRes = contentMessage?.first,
                messageArg = contentMessage?.second,
                onInstallDemo = {
                    val r = runCatching { contentManager.installDemo() }
                        .getOrElse { com.factronics.fv.data.pack.Resultado.rechazo(com.factronics.fv.data.pack.Contract.Errores.PACK_CORRUPTO, it.message ?: "") }
                    contentMessage = if (r.ok) {
                        R.string.packs_installed_ok to null
                    } else {
                        contentManager.claveError(r.errores.first().codigo) to null
                    }
                    contentVersion++
                },
                onClear = {
                    val r = runCatching { contentManager.clear() }.getOrDefault(com.factronics.fv.data.pack.Resultado.ok())
                    contentMessage = if (r.ok) R.string.packs_removed to null else contentManager.claveError(r.errores.first().codigo) to null
                    contentVersion++
                },
                onExport = {
                    runCatching { contentManager.exportBackup() }
                        .onSuccess { nombre -> contentMessage = R.string.packs_exported to nombre }
                        .onFailure { contentMessage = contentManager.claveError(com.factronics.fv.data.pack.Contract.Errores.DISCO_LLENO) to null }
                    contentVersion++
                },
                onImport = {
                    val r = runCatching { contentManager.importBackup() }
                        .getOrElse { com.factronics.fv.data.pack.Resultado.rechazo(com.factronics.fv.data.pack.Contract.Errores.RESPALDO_CORRUPTO, it.message ?: "") }
                    contentMessage = when {
                        r.ok -> R.string.packs_imported to null
                        r.errores.first().mensaje == "sin copias disponibles" -> R.string.packs_no_backup to null
                        else -> contentManager.claveError(r.errores.first().codigo) to null
                    }
                    contentVersion++
                }
            )

            val festivityId = FestivityEngine.resolve(
                instant = now,
                zoneId = ZoneId.systemDefault(),
                country = "VE",
                enabled = festivitiesEnabled,
                sober = soberMode,
                override = festivityOverride
            )

            FVTheme(
                themeMode = themeMode,
                dynamicColor = dynamicColor,
                festivityId = festivityId
            ) {
                FVApp(
                    festivityId = festivityId,
                    content = contentActions,
                    contentTipos = runCatching { contentManager.tiposPresentes() }.getOrDefault(emptyList()),
                    contentTecnologias = runCatching { contentManager.tecnologiasPresentes() }.getOrDefault(emptyList()),
                    onContentSearch = { texto, tipo, tec ->
                        runCatching { contentManager.search(texto, tipo, tec) }.getOrDefault(emptyList())
                    },
                    onThemeModeChange = { mode ->
                        themeMode = mode
                        settings.themeMode = mode
                    },
                    onDynamicColorChange = { enabled ->
                        dynamicColor = enabled
                        settings.dynamicColor = enabled
                    },
                    onFestivitiesEnabledChange = { enabled ->
                        festivitiesEnabled = enabled
                        settings.festivitiesEnabled = enabled
                    },
                    onSoberModeChange = { enabled ->
                        soberMode = enabled
                        settings.soberMode = enabled
                    },
                    onFestivityOverrideChange = { value ->
                        festivityOverride = value
                        settings.festivityOverride = value
                    },
                    onLanguageChange = { lang ->
                        val normalized = SupportedLocales.normalize(lang)
                        settings.language = normalized
                        // Android 13+ recrea la actividad al cambiar el idioma de la app.
                        val appliedBySystem = LocaleHelper.applyToSystem(this, normalized)
                        if (!appliedBySystem) recreate()
                    }
                )
            }
        }
    }
}
