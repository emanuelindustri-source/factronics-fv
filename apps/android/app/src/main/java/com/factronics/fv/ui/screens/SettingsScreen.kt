package com.factronics.fv.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.factronics.fv.R
import com.factronics.fv.data.SettingsStore

@Composable
fun SettingsScreen(
    onThemeModeChange: (String) -> Unit,
    onDynamicColorChange: (Boolean) -> Unit,
    onLanguageChange: (String) -> Unit
) {
    val context = LocalContext.current
    val store = remember { SettingsStore(context) }

    var language by remember { mutableStateOf(store.language) }
    var themeMode by remember { mutableStateOf(store.themeMode) }
    var dynamicColor by remember { mutableStateOf(store.dynamicColor) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Text(
            text = stringResource(R.string.settings_title),
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.semantics { heading() }
        )
        Spacer(Modifier.height(16.dp))

        // --- Idioma ---
        Text(
            text = stringResource(R.string.settings_language),
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.semantics { heading() }
        )
        LanguageRow(
            label = stringResource(R.string.settings_lang_es),
            selected = language == "es",
            onSelect = { language = "es"; onLanguageChange("es") }
        )
        LanguageRow(
            label = stringResource(R.string.settings_lang_en),
            selected = language == "en",
            onSelect = { language = "en"; onLanguageChange("en") }
        )

        Spacer(Modifier.height(8.dp))
        HorizontalDivider()
        Spacer(Modifier.height(16.dp))

        // --- Tema ---
        Text(
            text = stringResource(R.string.settings_theme),
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.semantics { heading() }
        )
        ThemeRow(stringResource(R.string.settings_theme_system), themeMode == "system") {
            themeMode = "system"; onThemeModeChange("system")
        }
        ThemeRow(stringResource(R.string.settings_theme_light), themeMode == "light") {
            themeMode = "light"; onThemeModeChange("light")
        }
        ThemeRow(stringResource(R.string.settings_theme_dark), themeMode == "dark") {
            themeMode = "dark"; onThemeModeChange("dark")
        }

        Spacer(Modifier.height(8.dp))
        HorizontalDivider()
        Spacer(Modifier.height(16.dp))

        // --- Color dinámico ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(stringResource(R.string.settings_dynamic_color), style = MaterialTheme.typography.titleMedium)
                Text(
                    stringResource(R.string.settings_dynamic_note),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Switch(
                checked = dynamicColor,
                onCheckedChange = { dynamicColor = it; onDynamicColorChange(it) }
            )
        }

        // --- Festividades (próximamente) ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(stringResource(R.string.settings_festive), style = MaterialTheme.typography.titleMedium)
                Text(
                    stringResource(R.string.settings_festive_note),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Switch(checked = false, onCheckedChange = null, enabled = false)
        }

        // --- Movimiento reducido ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(stringResource(R.string.settings_reduced_motion), style = MaterialTheme.typography.titleMedium)
                Text(
                    stringResource(R.string.settings_reduced_motion_note),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Switch(checked = true, onCheckedChange = null, enabled = false)
        }

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun LanguageRow(label: String, selected: Boolean, onSelect: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(selected = selected, onClick = onSelect)
        Text(label, style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
private fun ThemeRow(label: String, selected: Boolean, onSelect: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(selected = selected, onClick = onSelect)
        Text(label, style = MaterialTheme.typography.bodyLarge)
    }
}
