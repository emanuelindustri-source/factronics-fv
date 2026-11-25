// F&V — Servidor simulado de sincronización para pruebas del contrato.
//
// Supabase llega en F8; el contrato de F1.4 se prueba contra este servidor simulado
// que reproduce los modos de entrega del mundo real: normal, duplicados (reintento),
// fuera de orden (red móvil), deltas faltantes y "offline 24 h" (todo de golpe al
// reconectar). La convergencia se demuestra con los mismos algoritmos de cliente.

import { aplicarDelta } from "./delta.mjs";

/**
 * @param {{ deltas: object[] }} args cadena de deltas publicados por el servidor
 */
export function crearServidorSimulado({ deltas = [] } = {}) {
  const cola = [...deltas].sort((a, b) => a.sequence - b.sequence);
  return {
    /** Entrega los deltas desde una secuencia, con el comportamiento indicado. */
    entregar({ desde, comportamiento = "normal" }) {
      const pend = cola.filter((d) => d.sequence >= desde);
      switch (comportamiento) {
        case "normal":
        case "offline-24h":
          return [...pend];
        case "duplicados":
          return [...pend, ...pend];
        case "fuera-de-orden":
          return [...pend].reverse();
        case "omitir-intermedios":
          return pend.filter((_, i) => i !== 0);
        default:
          return [...pend];
      }
    },
    publicar(delta) {
      cola.push(delta);
      cola.sort((a, b) => a.sequence - b.sequence);
    },
  };
}

/**
 * Bucle de sincronización de referencia: pide pendientes y aplica en orden.
 * - Los deltas ya aplicados son no-op (idempotencia).
 * - Un salto (ORDEN-INVALIDO) corta el lote: el cliente espera el delta faltante
 *   y vuelve a pedir desde la última secuencia aplicada.
 * - Con 'maxIteraciones' se evitan bucles infinitos en pruebas.
 *
 * @returns {{ estado: object, log: Array<{sequence:number, ok:boolean, motivo:string}>, iteraciones: number }}
 */
export function sincronizar(estado, servidor, { clientVersion, isoNow, comportamiento = "normal", maxIteraciones = 10 } = {}) {
  let actual = estado;
  const log = [];
  let iteraciones = 0;
  for (let i = 0; i < maxIteraciones; i++) {
    iteraciones = i + 1;
    const lote = servidor.entregar({ desde: actual.lastAppliedSequence + 1, comportamiento });
    if (lote.length === 0) break;
    let progreso = false;
    for (const delta of lote) {
      const r = aplicarDelta(actual, delta, { clientVersion, isoNow });
      log.push({ sequence: delta.sequence, ok: r.ok, motivo: r.motivo ?? r.codigo });
      if (r.ok && r.motivo === "aplicado") {
        actual = r.estado;
        progreso = true;
      } else if (!r.ok) {
        break; // espera el delta faltante o rechaza el lote
      }
    }
    if (!progreso) break;
  }
  return { estado: actual, log, iteraciones };
}
