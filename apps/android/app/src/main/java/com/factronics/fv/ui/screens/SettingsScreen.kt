package com.factronics.fv.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
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
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.factronics.fv.R
import com.factronics.fv.data.FvFormatters
import com.factronics.fv.data.SettingsStore
import com.factronics.fv.data.SupportedLocales

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
    val specialUnlocked = store.specialLocalesUnlocked

    val localeTag = LocalConfiguration.current.locales[0].toLanguageTag()
    val locale = SupportedLocales.formattingLocale(localeTag)

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
        Text(
            text = stringResource(R.string.settings_language_note),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(4.dp))
        SupportedLocales.visible(specialUnlocked).forEach { localeOption ->
            ChoiceRow(
                label = localeOption.label,
                selected = language == localeOption.tag,
                onSelect = {
                    language = localeOption.tag
                    onLanguageChange(localeOption.tag)
                }
            )
        }
        if (specialUnlocked) {
            Text(
                text = stringResource(R.string.settings_special_unlocked),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp)
            )
        }

        Spacer(Modifier.height(8.dp))
        HorizontalDivider()
        Spacer(Modifier.height(16.dp))

        // --- Tema ---
        Text(
            text = stringResource(R.string.settings_theme),
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.semantics { heading() }
        )
        ChoiceRow(stringResource(R.string.settings_theme_system), themeMode == "system") {
            themeMode = "system"; onThemeModeChange("system")
        }
        ChoiceRow(stringResource(R.string.settings_theme_light), themeMode == "light") {
            themeMode = "light"; onThemeModeChange("light")
        }
        ChoiceRow(stringResource(R.string.settings_theme_dark), themeMode == "dark") {
            themeMode = "dark"; onThemeModeChange("dark")
        }

        Spacer(Modifier.height(8.dp))
        HorizontalDivider()
        Spacer(Modifier.height(16.dp))

        // --- Ejemplo de formato ---
        Text(
            text = stringResource(R.string.settings_formats),
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.semantics { heading() }
        )
        FormatRow(
            label = stringResource(R.string.settings_formats_number),
            value = FvFormatters.formatNumber(FvFormatters.SAMPLE_NUMBER, locale)
        )
        FormatRow(
            label = stringResource(R.string.settings_formats_percent),
            value = FvFormatters.formatPercent(FvFormatters.SAMPLE_PERCENT, locale)
        )
        FormatRow(
            label = stringResource(R.string.settings_formats_date),
            value = FvFormatters.formatDate(FvFormatters.SAMPLE_DATE, locale)
        )
        Text(
            text = stringResource(R.string.settings_formats_note),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

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
private fun ChoiceRow(label: String, selected: Boolean, onSelect: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .selectable(
                selected = selected,
                role = Role.RadioButton,
                onClick = onSelect
            )
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(selected = selected, onClick = null)
        Text(label, style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
private fun FormatRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodyLarge)
        Spacer(Modifier.weight(1f))
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.End
        )
    }
}
