// F&V — Estado local de un pack instalado: índices de búsqueda y consulta offline.
// PARIDAD: port de packages/sync-contracts/src/state.mjs (referencia) y
// apps/web/src/packs/state.ts. Los algoritmos de índice y búsqueda se prueban
// contra packages/shared-fixtures/sync/sync-cases.json (search_cases).

package com.factronics.fv.data.pack

import org.json.JSONArray
import org.json.JSONObject

data class PackState(
    val packId: String?,
    val packVersion: String?,
    val schemaVersion: String?,
    val minClientVersion: String?,
    val demo: Boolean,
    val lastAppliedSequence: Int,
    val files: Map<String, String>,
    val tombstones: Map<String, JSONObject>,
    val syncManifest: JSONObject?,
    val syncManifestText: String,
    val signature: JSONObject?,
    val installedAt: String?,
    val updatedAt: String?
) {
    companion object {
        fun vacio() = PackState(
            packId = null, packVersion = null, schemaVersion = null, minClientVersion = null,
            demo = false, lastAppliedSequence = 0, files = emptyMap(), tombstones = emptyMap(),
            syncManifest = null, syncManifestText = "", signature = null,
            installedAt = null, updatedAt = null
        )
    }
}

object PackStoreOps {

    /** Todos los ítems del pack con el archivo en el que viven. */
    fun itemsDe(state: PackState): List<Pair<String, JSONObject>> {
        val out = mutableListOf<Pair<String, JSONObject>>()
        for ((path, content) in state.files) {
            if (!path.startsWith("items/")) continue
            val arr = try {
                JSONArray(content)
            } catch (_: Exception) {
                continue
            }
            for (i in 0 until arr.length()) {
                val item = arr.opt(i)
                if (item is JSONObject) out.add(path to item)
            }
        }
        return out
    }

    /** Ítems vivos (sin tombstones aplicados). */
    fun entriesDe(state: PackState): List<Pair<String, JSONObject>> =
        itemsDe(state).filter { (_, item) ->
            val id = item.optString("id", "")
            id.isEmpty() || !state.tombstones.containsKey(id)
        }

    /** IDs de tecnología asociados a un ítem (índice por tecnología). */
    fun tecnologiasDe(item: JSONObject): List<String> {
        val out = sortedSetOf<String>()
        fun add(v: Any?) {
            if (v is String && v.startsWith("tec:")) out.add(v)
        }
        add(item.opt("tecnologia_id"))
        for (campo in listOf(
            "tecnologia_id", "familia_id", "generacion_id", "sistema_id", "componente_id",
            "documento_id", "pagina_id", "pregunta_id", "modelo_ids", "intento_ids", "entidades"
        )) {
            when (val v = item.opt(campo)) {
                is JSONArray -> for (i in 0 until v.length()) add(v.optString(i))
                else -> add(v)
            }
        }
        return out.toList()
    }

    data class Indices(
        val porId: Map<String, JSONObject>,
        val porTipo: Map<String, List<String>>,
        val porTecnologia: Map<String, List<String>>
    )

    /** Índices de búsqueda por ID / tipo / tecnología. */
    fun construirIndices(state: PackState): Indices {
        val porId = LinkedHashMap<String, JSONObject>()
        val porTipo = LinkedHashMap<String, MutableList<String>>()
        val porTecnologia = LinkedHashMap<String, MutableList<String>>()
        for ((_, item) in entriesDe(state)) {
            val id = item.optString("id", "")
            if (id.isEmpty()) continue
            porId[id] = item
            val tipo = if (item.opt("tipo") is String) item.getString("tipo") else "desconocido"
            porTipo.getOrPut(tipo) { mutableListOf() }.add(id)
            for (tec in tecnologiasDe(item)) {
                porTecnologia.getOrPut(tec) { mutableListOf() }.add(id)
            }
        }
        val tiposOrdenados = porTipo.mapValues { (_, v) -> v.sorted() }
        val tecsOrdenadas = porTecnologia.mapValues { (_, v) -> v.sorted() }
        return Indices(porId, tiposOrdenados, tecsOrdenadas)
    }

    private fun sinAcentos(s: String): String = java.text.Normalizer
        .normalize(s, java.text.Normalizer.Form.NFD)
        .replace(Regex("\\p{M}+"), "")
        .lowercase()

    private fun contieneTexto(item: JSONObject, texto: String): Boolean {
        val objetivo = sinAcentos(texto)
        val pila = ArrayDeque<Any?>()
        pila.add(item)
        while (pila.isNotEmpty()) {
            when (val v = pila.removeFirst()) {
                is String -> if (sinAcentos(v).contains(objetivo)) return true
                is JSONArray -> for (i in 0 until v.length()) pila.add(v.opt(i))
                is JSONObject -> for (k in v.keys()) pila.add(v.opt(k))
                else -> {}
            }
        }
        return false
    }

    /**
     * Búsqueda offline sobre el pack instalado (texto sin acentos, tipo, tecnología).
     * Orden estable por ID, límite de 200 resultados (FTS completo es F4.4).
     */
    fun buscar(state: PackState, texto: String = "", tipo: String? = null, tecnologia: String? = null, limite: Int = 200): List<JSONObject> {
        val indices = construirIndices(state)
        var candidatos = indices.porId.values.toList()
        if (tipo != null) candidatos = candidatos.filter { it.optString("tipo") == tipo }
        if (tecnologia != null) {
            val ids = indices.porTecnologia[tecnologia]?.toSet() ?: emptySet()
            candidatos = candidatos.filter { it.optString("id") in ids }
        }
        val q = texto.trim()
        if (q.isNotEmpty()) candidatos = candidatos.filter { contieneTexto(it, q) }
        return candidatos.sortedBy { it.optString("id") }.take(limite)
    }

    /** Tamaño aproximado del estado en bytes (UTF-8). */
    fun tamanoBytes(state: PackState): Long =
        state.files.values.sumOf { it.toByteArray(Charsets.UTF_8).size.toLong() }

    /** Serializa los ítems vivos a archivos items/<tipo>.json (orden estable por ID). */
    fun serializarArchivosItems(entries: List<Pair<String, JSONObject>>): Map<String, String> {
        val porTipo = LinkedHashMap<String, MutableList<JSONObject>>()
        for ((_, item) in entries) {
            val tipo = item.optString("tipo", "")
            if (tipo !in Contract.PREFIJOS) continue
            porTipo.getOrPut(tipo) { mutableListOf() }.add(item)
        }
        val files = mutableMapOf<String, String>()
        for ((tipo, items) in porTipo.entries.sortedBy { it.key }) {
            val ordenados = items.sortedBy { it.optString("id") }
            val arr = JSONArray()
            ordenados.forEach { arr.put(it) }
            files["items/$tipo.json"] = arr.toString()
        }
        return files
    }
}
