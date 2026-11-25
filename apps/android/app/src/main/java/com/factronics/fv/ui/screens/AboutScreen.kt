package com.factronics.fv.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.factronics.fv.R

@Composable
fun AboutScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Text(
            text = stringResource(R.string.about_title),
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.semantics { heading() }
        )
        Spacer(Modifier.height(16.dp))

        Text(
            text = stringResource(R.string.about_app_desc),
            style = MaterialTheme.typography.bodyLarge
        )
        Spacer(Modifier.height(12.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = androidx.compose.material3.CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.secondaryContainer
            )
        ) {
            Text(
                text = stringResource(R.string.about_disclaimer),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSecondaryContainer,
                modifier = Modifier.padding(16.dp)
            )
        }

        Spacer(Modifier.height(16.dp))
        Text(
            text = stringResource(R.string.about_version),
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.semantics { heading() }
        )
        Text("F&V 0.1.0 (Fase 0 · walking skeleton)", style = MaterialTheme.typography.bodyLarge)

        Spacer(Modifier.height(16.dp))
        Text(
            text = stringResource(R.string.about_team),
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.semantics { heading() }
        )
        Text(
            text = "Eduardo Rodríguez · Luis Iungano · José Tovar · José Gabriel Ríos · Elián Inojosa · Mariana Cerdeño",
            style = MaterialTheme.typography.bodyMedium
        )

        Spacer(Modifier.height(16.dp))
        Text(
            text = stringResource(R.string.about_sources),
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.semantics { heading() }
        )
        Text("factronics.com.ve", style = MaterialTheme.typography.bodyMedium)
        Text("videojet.com", style = MaterialTheme.typography.bodyMedium)

        Spacer(Modifier.height(16.dp))
        Text(stringResource(R.string.about_licenses), style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(8.dp))
        Text(stringResource(R.string.about_privacy), style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(24.dp))
    }
}
