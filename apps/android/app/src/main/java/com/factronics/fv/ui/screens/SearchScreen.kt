// F&V — Búsqueda offline de contenido (F1.4).
// Funciona sin red con el pack instalado; si no hay pack muestra estado vacío
// claro (sin contenido inventado). Índices por ID/tipo/tecnología.

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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.factronics.fv.R
import com.factronics.fv.data.pack.ContentSummary
import com.factronics.fv.data.pack.SearchItem

@Composable
fun SearchScreen(
    summary: ContentSummary,
    tipos: List<String>,
    tecnologias: List<String>,
    onSearch: (String, String?, String?) -> List<SearchItem>
) {
    var query by remember { mutableStateOf("") }
    var tipoFiltro by remember { mutableStateOf<String?>(null) }
    var tecFiltro by remember { mutableStateOf<String?>(null) }
    var tipoMenu by remember { mutableStateOf(false) }
    var tecMenu by remember { mutableStateOf(false) }
    var fuenteAbierta by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Text(
            text = stringResource(R.string.search_title),
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.semantics { heading() }
        )
        Spacer(Modifier.height(12.dp))

        if (!summary.instalado) {
            Text(
                text = stringResource(R.string.packs_status_none_title),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.semantics { heading() }
            )
            Text(
                text = stringResource(R.string.packs_status_none_desc),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            return@Column
        }

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text(stringResource(R.string.search_placeholder)) },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
        )
        Spacer(Modifier.height(8.dp))

        Row {
            FilterMenu(
                label = stringResource(R.string.search_filter_type),
                valor = tipoFiltro?.let { tipoLabel(it) } ?: stringResource(R.string.search_filter_all),
                expanded = tipoMenu,
                onExpanded = { tipoMenu = it },
                opciones = listOf(null to stringResource(R.string.search_filter_all)) +
                    tipos.map { it to tipoLabel(it) },
                onSelect = { tipoFiltro = it }
            )
            Spacer(Modifier.padding(4.dp))
            FilterMenu(
                label = stringResource(R.string.search_filter_tech),
                valor = tecFiltro ?: stringResource(R.string.search_filter_all),
                expanded = tecMenu,
                onExpanded = { tecMenu = it },
                opciones = listOf(null to stringResource(R.string.search_filter_all)) +
                    tecnologias.map { it to it },
                onSelect = { tecFiltro = it }
            )
        }
        Spacer(Modifier.height(8.dp))

        val resultados = remember(query, tipoFiltro, tecFiltro, summary) {
            onSearch(query.trim(), tipoFiltro, tecFiltro)
        }

        if (resultados.isEmpty()) {
            Text(
                text = stringResource(R.string.search_empty_title),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.semantics { heading() }
            )
            Text(
                text = stringResource(R.string.search_empty_desc),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        } else {
            Text(
                text = stringResource(R.string.search_results, resultados.size),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.semantics { heading() }
            )
            Spacer(Modifier.height(4.dp))
            resultados.forEach { item ->
                SearchResultCard(
                    item = item,
                    fuenteAbierta = fuenteAbierta == item.id,
                    onToggleFuente = {
                        fuenteAbierta = if (fuenteAbierta == item.id) null else item.id
                    }
                )
            }
        }
    }
}

@Composable
private fun SearchResultCard(item: SearchItem, fuenteAbierta: Boolean, onToggleFuente: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
    ) {
        Text(
            text = item.titulo,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Medium
        )
        Text(
            text = item.id,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = tipoLabel(item.tipo),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.primary
        )
        TextButton(
            onClick = onToggleFuente,
            modifier = Modifier.heightIn(min = 48.dp)
        ) {
            Text(stringResource(R.string.search_item_source))
        }
        if (fuenteAbierta) {
            Text(
                text = item.sourceDoc,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (item.sourceCodigo.isNotEmpty()) {
                Text(
                    text = item.sourceCodigo,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            // Etiquetas traducidas + datos de procedencia (sin literales).
            val revisionLabel = stringResource(R.string.search_item_revision)
            val paginaLabel = stringResource(R.string.search_type_pagina)
            val revisionTexto = "$revisionLabel: ${item.sourceRevision}"
            val paginaTexto = "$paginaLabel: ${item.sourcePagina}"
            Text(
                text = revisionTexto,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = paginaTexto,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = item.sourceCita,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun FilterMenu(
    label: String,
    valor: String,
    expanded: Boolean,
    onExpanded: (Boolean) -> Unit,
    opciones: List<Pair<String?, String>>,
    onSelect: (String?) -> Unit
) {
    Column {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        OutlinedButton(
            onClick = { onExpanded(true) },
            modifier = Modifier.heightIn(min = 48.dp)
        ) {
            Text(valor)
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { onExpanded(false) }
        ) {
            opciones.forEach { (clave, etiqueta) ->
                DropdownMenuItem(
                    text = { Text(etiqueta) },
                    onClick = {
                        onSelect(clave)
                        onExpanded(false)
                    }
                )
            }
        }
    }
}

@Composable
private fun tipoLabel(tipo: String): String = when (tipo) {
    "tecnologia" -> stringResource(R.string.search_type_tecnologia)
    "familia" -> stringResource(R.string.search_type_familia)
    "generacion" -> stringResource(R.string.search_type_generacion)
    "modelo" -> stringResource(R.string.search_type_modelo)
    "sistema" -> stringResource(R.string.search_type_sistema)
    "componente" -> stringResource(R.string.search_type_componente)
    "numero_parte" -> stringResource(R.string.search_type_numero_parte)
    "codigo_error" -> stringResource(R.string.search_type_codigo_error)
    "tinta" -> stringResource(R.string.search_type_tinta)
    "documento" -> stringResource(R.string.search_type_documento)
    "pagina" -> stringResource(R.string.search_type_pagina)
    "fragmento" -> stringResource(R.string.search_type_fragmento)
    "pregunta" -> stringResource(R.string.search_type_pregunta)
    "intento" -> stringResource(R.string.search_type_intento)
    "certificado" -> stringResource(R.string.search_type_certificado)
    else -> tipo
}
