// F&V — Migraciones del almacén local de packs (registro declarativo).
// PARIDAD: port de packages/sync-contracts/src/localSchema.mjs. Reglas (ADR-0009):
//   - El almacén declara 'local_schema_version'.
//   - Al abrir se aplican las migraciones encadenadas hasta la versión actual.
//   - Si una migración falla, el almacén NO se toca (rollback) y se reporta
//     MIGRACION-FALLIDA; el contenido de los packs sigue siendo legible.
//   - Sin ruta declarada no hay actualización (nunca se adivina).

package com.factronics.fv.data.pack

import org.json.JSONObject

class MigradorLocal(private val migraciones: List<Migracion>) {

    data class Migracion(val desde: Int, val hasta: Int, val aplicar: (JSONObject) -> JSONObject)

    data class ResultadoMigracion(val ok: Boolean, val store: JSONObject, val codigo: String? = null, val mensaje: String? = null)

    fun migrarAlmacen(store: JSONObject?, versionObjetivo: Int = Contract.LOCAL_SCHEMA_VERSION): ResultadoMigracion {
        // Base vacía → v1: creación desde cero.
        if (store == null) {
            val nuevo = JSONObject()
            nuevo.put("local_schema_version", 1)
            nuevo.put("packs", JSONObject())
            return ResultadoMigracion(true, nuevo)
        }
        var actual: JSONObject = store
        while ((actual.optInt("local_schema_version", 1)) < versionObjetivo) {
            val v = actual.optInt("local_schema_version", 1)
            val paso = migraciones.firstOrNull { it.desde == v }
                ?: return ResultadoMigracion(false, store, Contract.Errores.MIGRACION_FALLIDA, "sin ruta de migración declarada desde v$v")
            val siguiente = try {
                paso.aplicar(JSONObject(actual.toString()))
            } catch (_: Exception) {
                // ROLLBACK: el almacén original queda intacto.
                return ResultadoMigracion(false, store, Contract.Errores.MIGRACION_FALLIDA, "migración v${paso.desde}→v${paso.hasta} falló")
            }
            if (siguiente.optInt("local_schema_version", -1) != paso.hasta) {
                return ResultadoMigracion(false, store, Contract.Errores.MIGRACION_FALLIDA, "la migración v${paso.desde}→v${paso.hasta} no fija local_schema_version=${paso.hasta}")
            }
            actual = siguiente
        }
        return ResultadoMigracion(true, actual)
    }

    companion object {
        /** Migraciones sintéticas de prueba (fixtures sync-cases.json → local_store_cases). */
        fun sinteticas(): Map<String, Migracion> = mapOf(
            "sintetica-v1-v2" to Migracion(1, 2) { s ->
                s.put("local_schema_version", 2)
                s.put("formato", "fv-store/2")
                s
            },
            "fallida" to Migracion(1, 2) { _ ->
                throw IllegalStateException("fallo inyectado para pruebas")
            }
        )
    }
}
