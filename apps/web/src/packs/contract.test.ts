// F&V — Tests de instalación de bundles (casos de sync-cases.json → bundle_cases).
// Paridad con packages/sync-contracts/test/installer.test.mjs (ADR-0009).
import { describe, it, expect } from "vitest";
import { validarBundle, instalarBundle, estadoVacio, resumenDe } from "./installer";
import { construirBundle, estadoInstalado, FIXTURES, CLIENT_VERSION, ISO_NOW } from "./testkit";

describe("bundles del contrato (fixtures compartidos)", () => {
  for (const caso of FIXTURES.bundle_cases) {
    it(`bundle: ${caso.name}`, async () => {
      const { bundle, truststore } = await construirBundle(caso.mutacion);
      const instalado = caso.instalado_version ? estadoInstalado(caso.instalado_version) : null;
      const r = await validarBundle(bundle, {
        truststore,
        clientVersion: CLIENT_VERSION,
        instalado,
        tamanoBytes: caso.tamano_simulado ?? null,
      });

      if (caso.expect === "accept") {
        expect(r.valido, `esperaba aceptar y rechazó: ${JSON.stringify(r.errores)}`).toBe(true);
        if (caso.motivo) expect(r.motivo).toBe(caso.motivo);
      } else {
        expect(r.valido, "esperaba rechazo y fue aceptado").toBe(false);
        const codigos = r.errores.map((e) => e.codigo);
        const alguno = (caso.codes_any ?? []).some((c) => codigos.includes(c));
        expect(alguno, `esperaba alguno de ${JSON.stringify(caso.codes_any)} y llegó ${JSON.stringify(codigos)}`).toBe(true);
        for (const regla of caso.rules_any ?? []) {
          const mensajes = r.errores.map((e) => e.mensaje).join(" | ");
          expect(mensajes.includes(regla), `esperaba la regla ${regla} en: ${mensajes}`).toBe(true);
        }
      }
    });
  }
});

it("instalar un bundle válido produce el estado completo (staging lógico)", async () => {
  const { bundle, truststore } = await construirBundle("ninguna");
  const r = await instalarBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, instalado: null, isoNow: ISO_NOW });
  expect(r.ok).toBe(true);
  const estado = r.estado!;
  expect(estado.packId).toBe("pack-fv-test");
  expect(estado.packVersion).toBe("1.0.0");
  expect(estado.lastAppliedSequence).toBe(0);
  expect(estado.files["items/tecnologia.json"]).toBeTruthy();
  expect(estado.files["sync-manifest.json"]).toBeTruthy();
  expect(estado.signature?.key_id).toBe("test-key");
});

it("instalar sobre la misma versión devuelve 'ya-instalado' sin tocar el estado", async () => {
  const { bundle, truststore } = await construirBundle("ninguna");
  const instalado = { ...estadoInstalado("1.0.0"), updatedAt: "antes" };
  const r = await instalarBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, instalado, isoNow: ISO_NOW });
  expect(r.ok).toBe(true);
  expect(r.motivo).toBe("ya-instalado");
  expect(r.estado).toBe(instalado);
});

it("un bundle inválido jamás produce estado (nada a medias)", async () => {
  const { bundle, truststore } = await construirBundle("hash-alterado");
  const r = await instalarBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, instalado: null, isoNow: ISO_NOW });
  expect(r.ok).toBe(false);
  expect(r.estado).toBeUndefined();
});

it("estado vacío: la app declara que no hay pack (sin contenido inventado)", () => {
  const vacio = estadoVacio();
  expect(vacio.packId).toBeNull();
  expect(resumenDe(vacio)).toEqual({ instalado: false });
});

it("resumenDe expone versión, tamaño y actualización para Ajustes", async () => {
  const { bundle, truststore } = await construirBundle("ninguna");
  const r = await instalarBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, instalado: null, isoNow: ISO_NOW });
  const resumen = resumenDe(r.estado!);
  expect(resumen.instalado).toBe(true);
  if (resumen.instalado) {
    expect(resumen.packVersion).toBe("1.0.0");
    expect(resumen.itemsTotal).toBe(3);
    expect(resumen.tamanoBytes).toBeGreaterThan(0);
    expect(resumen.updatedAt).toBe(ISO_NOW);
    expect(resumen.indices.porId).toBe(3);
    expect(resumen.indices.porTecnologia).toBe(1);
  }
});
