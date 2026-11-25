// F&V — Reglas semánticas de contenido en el cliente (paridad con el validador de F1.1).
// PARIDAD: port de packages/sync-contracts/src/contentRules.mjs con los MISMOS nombres
// de regla. La paridad se prueba contra packages/shared-fixtures/sync/sync-cases.json
// (bundle_cases.rules_any) en JavaScript, TypeScript y Kotlin. Ver ADR-0009.

package com.factronics.fv.data.pack

import org.json.JSONArray
import org.json.JSONObject

object ContentRules {

    data class ErrorRegla(val regla: String, val id: String, val mensaje: String)
    data class ResultadoReglas(val valido: Boolean, val errores: List<ErrorRegla>)

    private val RE_ID =
        Regex("^(tec|fam|gen|mod|sis|cmp|prt|err|ink|doc|pag|frag|qst|att|crt):[a-z0-9]+(-[a-z0-9]+)*$")

    private fun sinAcentos(s: String): String = java.text.Normalizer
        .normalize(s, java.text.Normalizer.Form.NFD)
        .replace(Regex("\\p{M}+"), "")
        .lowercase()

    /**
     * @param manifest manifiesto pack.json (JSONObject)
     * @param entries pares (archivo, item) — se pasan como Pair<String, JSONObject>
     */
    fun validarContenido(manifest: JSONObject?, entries: List<Pair<String, JSONObject>>): ResultadoReglas {
        val errores = mutableListOf<ErrorRegla>()
        fun err(regla: String, id: String?, mensaje: String) {
            errores.add(ErrorRegla(regla, id ?: "-", mensaje))
        }
        val esDemo = manifest?.optBoolean("demo", false) == true

        // Índice y unicidad de IDs.
        val indice = LinkedHashMap<String, JSONObject>()
        for ((_, item) in entries) {
            val id = if (item.has("id") && !item.isNull("id")) item.optString("id", "") else ""
            if (id.isEmpty()) continue
            if (indice.containsKey(id)) {
                err(Contract.Reglas.ID_DUPLICADO, id, "ID duplicado dentro del pack")
            } else {
                indice[id] = item
            }
        }

        for ((archivo, item) in entries) {
            val id = if (item.has("id") && item.opt("id") is String) item.getString("id") else "($archivo)"

            // Procedencia obligatoria: SIN FUENTE NO SE PUBLICA.
            val sr = item.opt("source_ref")
            if (sr == null || sr == JSONObject.NULL || sr !is JSONObject) {
                err(Contract.Reglas.FALTA_PROCEDENCIA, id, "SIN FUENTE NO SE PUBLICA: el ítem no tiene source_ref")
            } else {
                val faltantes = Contract.CAMPOS_SOURCE_REF.filter { c ->
                    val v = sr.opt(c)
                    v == null || v == JSONObject.NULL || v == ""
                }
                if (faltantes.isNotEmpty()) {
                    err(Contract.Reglas.SOURCE_INCOMPLETO, id, "source_ref incompleto; faltan: ${faltantes.joinToString(", ")}")
                }
            }

            // Tipo conocido y coherencia tipo ↔ archivo.
            val tipo = if (item.opt("tipo") is String) item.getString("tipo") else null
            if (tipo == null || !Contract.PREFIJOS.containsKey(tipo)) {
                err(Contract.Reglas.ARCHIVO_TIPO, id, "tipo desconocido o ausente: ${item.opt("tipo")}")
                continue
            }
            val esperado = "items/$tipo.json"
            if (archivo != esperado) {
                err(Contract.Reglas.ARCHIVO_TIPO, id, "el ítem de tipo '$tipo' debe vivir en $esperado, pero está en $archivo")
            }

            // ID estable: formato y coherencia prefijo ↔ tipo.
            if (item.opt("id") !is String || !RE_ID.matches(item.getString("id"))) {
                err(Contract.Reglas.ID_FORMATO, id, "ID inválido: se espera '<prefijo>:<slug-kebab-case>'")
            } else {
                val prefijo = item.getString("id").split(":")[0]
                if (Contract.PREFIJOS[tipo] != prefijo) {
                    err(Contract.Reglas.ID_TIPO, id, "el prefijo '$prefijo' no corresponde al tipo '$tipo' (esperado '${Contract.PREFIJOS[tipo]}')")
                }
            }

            // Versión de esquema coherente con el manifiesto.
            if (item.opt("schema_version") != manifest?.opt("schema_version")) {
                err(
                    Contract.Reglas.SCHEMA_VERSION, id,
                    "schema_version del ítem ('${item.opt("schema_version")}') no coincide con la del manifiesto ('${manifest?.opt("schema_version")}')"
                )
            }

            // Rango de páginas de la cita.
            if (sr is JSONObject) {
                val pagina = sr.opt("pagina")
                val paginaFin = sr.opt("pagina_fin")
                if (pagina is Int && paginaFin is Int && paginaFin < pagina) {
                    err(Contract.Reglas.SOURCE_INCOMPLETO, id, "source_ref.pagina_fin ($paginaFin) < source_ref.pagina ($pagina)")
                }
            }

            // Reglas demo: etiqueta y códigos DEMO- (nada real, nada inventado).
            if (esDemo) {
                val etiquetas = item.optJSONArray("etiquetas")
                val tieneEtiqueta = etiquetas != null && (0 until etiquetas.length()).any { etiquetas.optString(it) == Contract.ETIQUETA_DEMO }
                if (!tieneEtiqueta) {
                    err(Contract.Reglas.DEMO_ETIQUETA, id, "todo ítem de un pack demo debe llevar la etiqueta '${Contract.ETIQUETA_DEMO}'")
                }
                val codigos = listOfNotNull(
                    item.opt("codigo") as? String,
                    item.opt("codigo_oficial") as? String,
                    (sr as? JSONObject)?.opt("codigo_oficial") as? String
                )
                for (codigo in codigos) {
                    if (!Contract.PREFIJO_CODIGO_DEMO.containsMatchIn(codigo)) {
                        err(Contract.Reglas.DEMO_CODIGO, id, "en packs demo todo código debe empezar por 'DEMO-' (recibido: '$codigo')")
                    }
                }
            }

            // Certificados: programa interno, nunca oficial de Videojet.
            if (tipo == "certificado") {
                val programa = (item.opt("programa") as? String)?.let { sinAcentos(it) } ?: ""
                val avisoTxt = (item.opt("aviso") as? String)?.let { sinAcentos(it) } ?: ""
                if (!programa.contains("programa interno")) {
                    err(Contract.Reglas.CERTIFICADO_PROGRAMA, id, "el certificado debe declararse como 'programa interno' de Factronics, C.A.")
                }
                if (!avisoTxt.contains("no es una certificacion oficial de videojet")) {
                    err(Contract.Reglas.CERTIFICADO_AVISO, id, "el certificado debe incluir el aviso 'No es una certificación oficial de Videojet Technologies'")
                }
            }

            // Preguntas: la respuesta debe estar entre las opciones cuando aplica.
            if (tipo == "pregunta" && item.opt("opciones") is JSONArray) {
                val opciones = item.getJSONArray("opciones")
                val listaOpciones = (0 until opciones.length()).map { opciones.optString(it) }
                val tp = item.optString("tipo_pregunta", "")
                val rc = item.opt("respuesta_correcta")
                if (tp == "seleccion_simple" || tp == "verdadero_falso") {
                    if (rc !is String || rc !in listaOpciones) {
                        err(Contract.Reglas.PREGUNTA_RESPUESTA, id, "respuesta_correcta debe ser una de las opciones en '$tp'")
                    }
                } else if (tp == "seleccion_multiple") {
                    val lista = rc as? JSONArray
                    val okLista = lista != null && lista.length() > 0 &&
                        (0 until lista.length()).all { lista.optString(it) in listaOpciones }
                    if (!okLista) {
                        err(Contract.Reglas.PREGUNTA_RESPUESTA, id, "en seleccion_multiple la respuesta_correcta debe ser un array contenido en las opciones")
                    }
                }
            }
        }

        // El schema_version del manifiesto debe ser el soportado por esta app.
        if (manifest?.opt("schema_version") != Contract.CONTENT_SCHEMA_VERSION) {
            err(
                Contract.Reglas.SCHEMA_VERSION, "pack.json",
                "schema_version '${manifest?.opt("schema_version")}' no soportada (esperada '${Contract.CONTENT_SCHEMA_VERSION}')"
            )
        }

        return ResultadoReglas(errores.isEmpty(), errores)
    }
}
