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
import com.factronics.fv.ui.FVApp
import com.factronics.fv.ui.theme.FVTheme
import kotlinx.coroutines.delay
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

            LaunchedEffect(Unit) {
                while (true) {
                    delay(60_000)
                    now = Instant.now()
                }
            }

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
