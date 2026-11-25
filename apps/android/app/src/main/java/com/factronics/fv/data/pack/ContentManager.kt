// F&V — Gestor de contenido para la UI: packs instalados, búsqueda offline,
// instalación del pack demo, backup/export/import y borrado.
// La lógica pura del contrato vive en data/pack; aquí solo orquestación Android
// (assets, archivos, mapeo de errores a claves i18n). Sin textos hardcodeados.

package com.factronics.fv.data.pack

import android.content.Context
import com.factronics.fv.R
import org.json.JSONObject
import java.io.File
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

data class ContentSummary(
    val instalado: Boolean,
    val packId: String = "",
    val packVersion: String = "",
    val demo: Boolean = false,
    val itemsTotal: Int = 0,
    val tamanoBytes: Long = 0,
    val updatedAt: String = ""
)

data class SearchItem(
    val id: String,
    val tipo: String,
    val titulo: String,
    val sourceDoc: String,
    val sourceCodigo: String,
    val sourceRevision: String,
    val sourcePagina: String,
    val sourceCita: String
)

class ContentManager(private val context: Context) {

    private val store = FilePackStore(File(context.filesDir, "packs"))
    private val backupDir: File
        get() = File(context.getExternalFilesDir(null) ?: context.filesDir, "backups")

    fun open(): FilePackStore.Apertura = store.openStore()

    fun summary(): ContentSummary {
        val e = store.readState() ?: return ContentSummary(instalado = false)
        return ContentSummary(
            instalado = true,
            packId = e.packId ?: "",
            packVersion = e.packVersion ?: "",
            demo = e.demo,
            itemsTotal = PackStoreOps.entriesDe(e).size,
            tamanoBytes = PackStoreOps.tamanoBytes(e),
            updatedAt = e.updatedAt ?: ""
        )
    }

    fun search(texto: String, tipo: String?, tecnologia: String?): List<SearchItem> {
        val e = store.readState() ?: return emptyList()
        return PackStoreOps.buscar(e, texto = texto, tipo = tipo, tecnologia = tecnologia).map { item ->
            val sr = item.optJSONObject("source_ref")
            SearchItem(
                id = item.optString("id", ""),
                tipo = item.optString("tipo", ""),
                titulo = sequenceOf("nombre", "enunciado", "titulo", "programa", "descripcion", "documento")
                    .mapNotNull { campo -> item.opt(campo) as? String }
                    .firstOrNull { it.isNotBlank() } ?: item.optString("id", ""),
                sourceDoc = sr?.optString("documento", "") ?: "",
                sourceCodigo = sr?.optString("codigo_oficial", "") ?: "",
                sourceRevision = sr?.optString("revision", "") ?: "",
                sourcePagina = sr?.opt("pagina")?.toString() ?: "",
                sourceCita = sr?.optString("cita_textual", "") ?: ""
            )
        }
    }

    /** Tipos y tecnologías presentes (para los filtros de la búsqueda). */
    fun tiposPresentes(): List<String> {
        val e = store.readState() ?: return emptyList()
        return PackStoreOps.construirIndices(e).porTipo.keys.sorted()
    }

    fun tecnologiasPresentes(): List<String> {
        val e = store.readState() ?: return emptyList()
        return PackStoreOps.construirIndices(e).porTecnologia.keys.sorted()
    }

    /** Instala el bundle DEMO incluido en los assets (pack autorizado ADR-0003). */
    fun installDemo(): Resultado {
        val truststore = JSONObject(context.assets.open("truststore.json").readBytes().toString(Charsets.UTF_8))
        val bundleText = context.assets.open("pack-fv-demo.fvpack").readBytes().toString(Charsets.UTF_8)
        return store.installBundle(bundleText, truststore, BuildConfigCompat.VERSION, Instant.now().toString())
    }

    fun clear(): Resultado = store.uninstallAll()

    /** Exporta una copia de seguridad y devuelve el nombre del archivo creado. */
    fun exportBackup(): String {
        backupDir.mkdirs()
        val stamp = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").withZone(ZoneOffset.UTC).format(Instant.now())
        val nombre = "fv-backup-$stamp.json"
        val settings = JSONObject()
            .put("language", com.factronics.fv.data.SettingsStore(context).language)
            .put("theme_mode", com.factronics.fv.data.SettingsStore(context).themeMode)
            .put("dynamic_color", com.factronics.fv.data.SettingsStore(context).dynamicColor)
            .put("festivities_enabled", com.factronics.fv.data.SettingsStore(context).festivitiesEnabled)
            .put("sober_mode", com.factronics.fv.data.SettingsStore(context).soberMode)
            .put("festivity_override", com.factronics.fv.data.SettingsStore(context).festivityOverride)
        val texto = store.exportBackup(settings, Instant.now().toString(), BuildConfigCompat.VERSION)
        File(backupDir, nombre).writeText(texto, Charsets.UTF_8)
        return nombre
    }

    /** Importa/restaura la copia de seguridad más reciente del directorio de copias. */
    fun importBackup(): Resultado {
        val candidatos = backupDir.listFiles { f -> f.isFile && f.name.endsWith(".json") }?.sortedByDescending { it.name }
        val archivo = candidatos?.firstOrNull()
            ?: return Resultado.rechazo(Contract.Errores.RESPALDO_CORRUPTO, "sin copias disponibles")
        val texto = archivo.readText(Charsets.UTF_8)
        val truststore = JSONObject(context.assets.open("truststore.json").readBytes().toString(Charsets.UTF_8))
        return store.importBackup(texto, BuildConfigCompat.VERSION, truststore, Instant.now().toString())
    }

    /** Mapea un código de error del contrato a una clave de interfaz traducida. */
    fun claveError(codigo: String): Int = when (codigo) {
        Contract.Errores.PACK_CORRUPTO -> R.string.errors_pack_corrupt
        Contract.Errores.HASH_INVALIDO -> R.string.errors_hash_invalid
        Contract.Errores.FIRMA_AUSENTE -> R.string.errors_signature_missing
        Contract.Errores.FIRMA_INVALIDA -> R.string.errors_signature_invalid
        Contract.Errores.CLAVE_DESCONOCIDA -> R.string.errors_unknown_key
        Contract.Errores.VERSION_FUTURA -> R.string.errors_future_version
        Contract.Errores.DOWNGRADE -> R.string.errors_downgrade
        Contract.Errores.VERSION_CLIENTE -> R.string.errors_client_version
        Contract.Errores.CONTENIDO_INVALIDO -> R.string.errors_invalid_content
        Contract.Errores.ORDEN_INVALIDO -> R.string.errors_order
        Contract.Errores.RESPALDO_CORRUPTO -> R.string.errors_backup_corrupt
        Contract.Errores.RESPALDO_GRANDE -> R.string.errors_backup_big
        Contract.Errores.DISCO_LLENO -> R.string.errors_disk_full
        Contract.Errores.ESCRITURA_INTERRUMPIDA -> R.string.errors_write_interrupted
        Contract.Errores.MIGRACION_FALLIDA -> R.string.errors_migration_failed
        else -> R.string.errors_unknown
    }
}

/** Versión de la app para las comprobaciones de versión mínima del contrato. */
object BuildConfigCompat {
    val VERSION: String = com.factronics.fv.BuildConfig.VERSION_NAME
}
