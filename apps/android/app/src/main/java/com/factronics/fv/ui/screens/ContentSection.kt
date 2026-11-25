// F&V — Sección "Contenido sin conexión" de Ajustes (F1.4).
// Estado del pack instalado (versión, tamaño, última actualización, ítems) y
// acciones: instalar pack demo, exportar/importar copia de seguridad y limpiar.
// Todo el texto viene del catálogo i18n (148 claves × 13 locales).

package com.factronics.fv.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.factronics.fv.R
import com.factronics.fv.data.FvFormatters
import com.factronics.fv.data.SupportedLocales
import com.factronics.fv.data.pack.ContentSummary

data class ContentActions(
    val summary: ContentSummary,
    val messageRes: Int? = null,
    val messageArg: String? = null,
    val onInstallDemo: () -> Unit,
    val onClear: () -> Unit,
    val onExport: () -> Unit,
    val onImport: () -> Unit
)

@Composable
fun ContentSection(content: ContentActions) {
    val localeTag = LocalConfiguration.current.locales[0].toLanguageTag()
    val locale = SupportedLocales.formattingLocale(localeTag)

    Text(
        text = stringResource(R.string.settings_content_title),
        style = MaterialTheme.typography.titleLarge,
        modifier = Modifier.semantics { heading() }
    )
    Text(
        text = stringResource(R.string.settings_content_note),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    Spacer(Modifier.height(8.dp))

    if (!content.summary.instalado) {
        Text(
            text = stringResource(R.string.packs_status_none_title),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.semantics { heading() }
        )
        Text(
            text = stringResource(R.string.packs_status_none_desc),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    } else {
        Text(
            text = stringResource(R.string.packs_status_installed),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.semantics { heading() }
        )
        ContentRow(stringResource(R.string.packs_version), content.summary.packVersion)
        ContentRow(stringResource(R.string.packs_items), FvFormatters.formatInteger(content.summary.itemsTotal.toLong(), locale))
        val kb = if (content.summary.tamanoBytes >= 1024) content.summary.tamanoBytes / 1024 else 1L
        ContentRow(
            stringResource(R.string.packs_size),
            stringResource(R.string.packs_size_value, FvFormatters.formatInteger(kb, locale))
        )
        ContentRow(stringResource(R.string.packs_updated), content.summary.updatedAt)
    }

    content.messageRes?.let { res ->
        Spacer(Modifier.height(4.dp))
        Text(
            text = if (content.messageArg != null) stringResource(res, content.messageArg) else stringResource(res),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.primary
        )
    }

    Spacer(Modifier.height(12.dp))
    if (!content.summary.instalado) {
        OutlinedButton(
            onClick = content.onInstallDemo,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
        ) {
            Text(stringResource(R.string.packs_install_demo))
        }
        Text(
            text = stringResource(R.string.packs_install_demo_note),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(8.dp))
    }
    OutlinedButton(
        onClick = content.onExport,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
    ) {
        Text(stringResource(R.string.packs_export))
    }
    Spacer(Modifier.height(8.dp))
    OutlinedButton(
        onClick = content.onImport,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
    ) {
        Text(stringResource(R.string.packs_import))
    }
    if (content.summary.instalado) {
        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = content.onClear,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
        ) {
            Text(stringResource(R.string.packs_clear))
        }
        Text(
            text = stringResource(R.string.packs_clear_confirm),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ContentRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
