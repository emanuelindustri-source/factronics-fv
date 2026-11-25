// F&V — Tests del contrato de sincronización contra un servidor simulado.
// Sin servidor real (Supabase es F8): se prueban entrega normal, duplicados,
// fuera de orden, delta faltante y reconexión tras "offline 24 h".
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearServidorSimulado, sincronizar } from "../src/mock-server.mjs";
import { entriesDe } from "../src/state.mjs";
import { construirDeltas, estadoMiniPack, CLIENT_VERSION, ISO_NOW } from "./helpers.mjs";

function escenario() {
  const { estado } = estadoMiniPack();
  const deltas = construirDeltas("cadena"); // seq 1..3 → versión final 1.3.0
  const servidor = crearServidorSimulado({ deltas });
  return { estado, servidor, deltas };
}

test("entrega normal: el cliente aplica 1..3 en orden y converge", () => {
  const { estado, servidor } = escenario();
  const { estado: final, log } = sincronizar(estado, servidor, { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
  assert.equal(final.packVersion, "1.3.0");
  assert.equal(final.lastAppliedSequence, 3);
  assert.deepEqual(log.map((l) => l.motivo), ["aplicado", "aplicado", "aplicado"]);
});

test("entrega duplicada (reintentos): idempotencia, mismo estado", () => {
  const { estado, servidor } = escenario();
  const { estado: final, log } = sincronizar(estado, servidor, {
    clientVersion: CLIENT_VERSION,
    isoNow: ISO_NOW,
    comportamiento: "duplicados",
    maxIteraciones: 5,
  });
  assert.equal(final.packVersion, "1.3.0");
  assert.equal(final.lastAppliedSequence, 3);
  // Tras aplicar todo, los duplicados son no-op 'ya-aplicado'.
  assert.ok(log.some((l) => l.motivo === "ya-aplicado"), JSON.stringify(log));
});

test("fuera de orden: se rechaza el salto y, al reintentar en orden, converge", () => {
  const { estado, servidor } = escenario();
  // Primer intento: llegan al revés → el primero (seq 3) es un salto → sin progreso.
  const primero = sincronizar(estado, servidor, { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW, comportamiento: "fuera-de-orden" });
  assert.equal(primero.estado.lastAppliedSequence, 0);
  assert.ok(primero.log.some((l) => l.motivo === "ORDEN-INVALIDO"));
  // Reintento con entrega normal (como haría un cliente con reintento/backoff).
  const segundo = sincronizar(primero.estado, servidor, { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW, comportamiento: "normal" });
  assert.equal(segundo.estado.packVersion, "1.3.0");
  assert.equal(segundo.estado.lastAppliedSequence, 3);
});

test("delta faltante: el cliente espera el intermedio y no aplica nada fuera de orden", () => {
  const { estado, servidor } = escenario();
  const { estado: final, log } = sincronizar(estado, servidor, {
    clientVersion: CLIENT_VERSION,
    isoNow: ISO_NOW,
    comportamiento: "omitir-intermedios",
    maxIteraciones: 5,
  });
  // Sin el seq 1 no puede aplicar 2 ni 3.
  assert.equal(final.lastAppliedSequence, 0);
  assert.ok(log.every((l) => l.motivo === "ORDEN-INVALIDO"));
});

test("offline 24 h: al reconectar llega todo de golpe y converge al estado del servidor", () => {
  const { estado, servidor, deltas } = escenario();
  // El cliente estuvo offline: 0 secuencias aplicadas mientras el servidor acumuló 3.
  assert.equal(estado.lastAppliedSequence, 0);
  assert.equal(deltas.length, 3);
  const { estado: final, iteraciones } = sincronizar(estado, servidor, {
    clientVersion: CLIENT_VERSION,
    isoNow: ISO_NOW,
    comportamiento: "offline-24h",
  });
  assert.equal(final.packVersion, "1.3.0");
  assert.equal(final.lastAppliedSequence, 3);
  assert.equal(entriesDe(final).length, 2);
  assert.equal(iteraciones, 2); // 1 lote + 1 comprobación vacía
});

test("el servidor acepta publicación incremental y el cliente la consume", () => {
  const { estado } = estadoMiniPack();
  const servidor = crearServidorSimulado({ deltas: [] });
  const [d1, d2, d3] = construirDeltas("cadena");
  servidor.publicar(d1);
  let r = sincronizar(estado, servidor, { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
  assert.equal(r.estado.packVersion, "1.1.0");
  servidor.publicar(d2);
  servidor.publicar(d3);
  r = sincronizar(r.estado, servidor, { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
  assert.equal(r.estado.packVersion, "1.3.0");
  assert.equal(r.estado.lastAppliedSequence, 3);
});
