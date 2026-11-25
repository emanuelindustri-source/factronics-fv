package com.factronics.fv

import android.content.Context
import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.factronics.fv.data.SettingsStore
import com.factronics.fv.ui.FVApp
import com.factronics.fv.ui.theme.FVTheme
import java.util.Locale

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

            FVTheme(themeMode = themeMode, dynamicColor = dynamicColor) {
                FVApp(
                    onThemeModeChange = { mode ->
                        themeMode = mode
                        settings.themeMode = mode
                    },
                    onDynamicColorChange = { enabled ->
                        dynamicColor = enabled
                        settings.dynamicColor = enabled
                    },
                    onLanguageChange = { lang ->
                        settings.language = lang
                        recreate()
                    }
                )
            }
        }
    }
}

/** Aplica el idioma elegido por el usuario al contexto de la actividad. */
object LocaleHelper {
    fun wrap(context: Context): Context {
        val lang = SettingsStore(context).language
        val locale = Locale(lang)
        val config = Configuration(context.resources.configuration)
        config.setLocale(locale)
        config.setLayoutDirection(locale)
        return context.createConfigurationContext(config)
    }
}
