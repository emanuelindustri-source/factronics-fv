// F&V — Tests del almacén de packs (Dexie/IndexedDB) con fake-indexeddb.
// Cubren: instalación, resumen, búsqueda, desinstalación, atomicidad de la
// transacción, export/import sobre almacén limpio, rechazo de corruptos y la
// actualización Dexie v1→v2 (el perfil se conserva).
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db";
import * as store from "./store";
import { construirBundle, construirDeltas, CLIENT_VERSION, ISO_NOW, SETTINGS_DEMO } from "./testkit";
import { DEMO_BUNDLE, DEMO_TRUSTSTORE } from "../generated/demo-pack";
import { entriesDe } from "./state";

beforeEach(async () => {
  await db.close();
  await db.delete();
  await db.open();
});

describe("almacén de packs (Dexie)", () => {
  it("instala el pack demo, expone resumen y búsqueda, y desinstala sin dejar rastro", async () => {
    const r = await store.installBundle(DEMO_BUNDLE, {
      truststore: DEMO_TRUSTSTORE,
      clientVersion: CLIENT_VERSION,
      isoNow: ISO_NOW,
    });
    expect(r.ok).toBe(true);

    const resumen = await store.getPackSummary();
    expect(resumen).toMatchObject({
      instalado: true,
      packId: "pack-fv-demo",
      packVersion: "1.0.0",
      schemaVersion: "1.0.0",
      demo: true,
      itemsTotal: 25,
    });

    const preguntas = await store.searchContent({ tipo: "pregunta" });
    expect(preguntas.length).toBe(3);
    const texto = await store.searchContent({ texto: "demo" });
    expect(texto.length).toBeGreaterThan(0);
    const tecId = (JSON.parse(DEMO_BUNDLE.files["items/tecnologia.json"]) as Array<{ id: string }>)[0].id;
    const porTec = await store.searchContent({ tecnologia: tecId });
    expect(porTec.length).toBeGreaterThan(0);

    await store.uninstall("pack-fv-demo");
    expect(await store.getPackSummary()).toEqual({ instalado: false });
    expect(await db.packs.count()).toBe(0);
    expect(await db.contentItems.count()).toBe(0);
    expect(await db.tombstones.count()).toBe(0);
    expect(await db.syncState.count()).toBe(0);
  });

  it("instala el mini-pack de fixtures con resumen e índices correctos", async () => {
    const { bundle, truststore } = await construirBundle("ninguna");
    const r = await store.installBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
    expect(r.ok).toBe(true);

    const resumen = await store.getPackSummary();
    expect(resumen).toMatchObject({ instalado: true, packId: "pack-fv-test", packVersion: "1.0.0", itemsTotal: 3 });
    if (resumen.instalado) {
      expect(resumen.indices).toEqual({ porId: 3, porTipo: 3, porTecnologia: 1 });
      expect(resumen.tamanoBytes).toBeGreaterThan(0);
    }

    const estado = await store.readState("pack-fv-test");
    expect(estado).not.toBeNull();
    expect(entriesDe(estado!).map((e) => e.item.id).sort()).toEqual(["crt:demo-test", "qst:demo-test-0001", "tec:demo-test"]);

    const hallados = await store.searchContent({ texto: "sincronizacion" });
    expect(hallados.map((i) => i.id).sort()).toEqual(["qst:demo-test-0001", "tec:demo-test"]);

    const sincronizacion = await db.syncState.get("pack-fv-test");
    expect(sincronizacion?.last_applied_sequence).toBe(0);

    await store.uninstall("pack-fv-test");
    expect(await store.getPackSummary()).toEqual({ instalado: false });
  });

  it("la escritura es atómica: un fallo a mitad de transacción no deja estado parcial", async () => {
    const { bundle, truststore } = await construirBundle("ninguna");
    const tabla = db.contentItems as unknown as { bulkPut: (rows: unknown[]) => Promise<unknown> };
    const original = tabla.bulkPut;
    tabla.bulkPut = () => {
      throw new Error("fallo inyectado");
    };
    let fallo: unknown = null;
    try {
      await store.installBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
    } catch (e) {
      fallo = e;
    } finally {
      tabla.bulkPut = original;
    }
    expect(fallo).toBeInstanceOf(Error);
    // NADA parcial: la transacción completa se revierte.
    expect(await db.packs.count()).toBe(0);
    expect(await db.contentItems.count()).toBe(0);
    expect(await db.tombstones.count()).toBe(0);
    expect(await db.syncState.count()).toBe(0);

    // Y con la escritura sana, la instalación completa funciona.
    const r = await store.installBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
    expect(r.ok).toBe(true);
    expect(await db.contentItems.count()).toBe(3);
  });

  it("exportar e importar sobre almacén limpio conserva los ítems byte a byte", async () => {
    const { bundle, truststore } = await construirBundle("ninguna");
    await store.installBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
    const { texto } = await store.exportBackup({
      settings: { language: "es-VE", theme_mode: "system" },
      source: "web",
      created: "2026-11-25T10:00:00Z",
      appMinVersion: "0.1.0",
    });
    const antes = await store.readState("pack-fv-test");

    // Almacén limpio: se borra la BD completa y se restaura desde el backup.
    await db.close();
    await db.delete();
    await db.open();
    expect(await store.getPackSummary()).toEqual({ instalado: false });

    const r = await store.importBackup(texto, { clientVersion: CLIENT_VERSION, truststore, isoNow: ISO_NOW });
    expect(r.ok).toBe(true);

    const despues = await store.readState("pack-fv-test");
    expect(despues).not.toBeNull();
    expect(entriesDe(despues!).map((e) => e.item.id).sort()).toEqual(entriesDe(antes!).map((e) => e.item.id).sort());
    // El texto de los archivos se conserva byte a byte (mismos hashes declarados).
    expect(despues!.files).toEqual(antes!.files);
    expect(await store.getPackSummary()).toMatchObject({ instalado: true, itemsTotal: 3 });
  });

  it("un backup corrupto o alterado se rechaza y no escribe nada", async () => {
    await expect(
      store.importBackup("esto no es un backup", { clientVersion: CLIENT_VERSION, truststore: DEMO_TRUSTSTORE, isoNow: ISO_NOW }),
    ).rejects.toMatchObject({ name: "ErrorContrato", codigo: "RESPALDO-CORRUPTO" });
    expect(await db.packs.count()).toBe(0);

    // Backup válido con UN bit alterado: checksum inválido, nada se restaura.
    const { bundle, truststore } = await construirBundle("ninguna");
    await store.installBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
    const { texto } = await store.exportBackup({
      settings: SETTINGS_DEMO,
      source: "web",
      created: "2026-11-25T10:00:00Z",
      appMinVersion: "0.1.0",
    });
    const alterado = texto.replace('"es-VE"', '"es-VX"');
    await expect(
      store.importBackup(alterado, { clientVersion: CLIENT_VERSION, truststore, isoNow: ISO_NOW }),
    ).rejects.toMatchObject({ name: "ErrorContrato", codigo: "RESPALDO-CORRUPTO" });
    // El pack instalado sigue intacto (todo o nada).
    const estado = await store.readState("pack-fv-test");
    expect(estado?.packVersion).toBe("1.0.0");
    expect(await db.packs.count()).toBe(1);
  });

  it("aplicar un delta en el almacén actualiza estado y sincronización", async () => {
    const { bundle, truststore } = await construirBundle("ninguna");
    await store.installBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });

    const [delta] = await construirDeltas("valido");
    const r = await store.applyDeltaToStore(delta, { clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
    expect(r.estado.packVersion).toBe("1.1.0");
    const tras = await store.readState("pack-fv-test");
    expect(tras?.lastAppliedSequence).toBe(1);
    expect(entriesDe(tras!).length).toBe(2);
    expect("tec:demo-test" in tras!.tombstones).toBe(true);
  });

  it("la actualización Dexie v1→v2 conserva el perfil y añade las tablas del contrato", async () => {
    await db.close();
    await db.delete();
    // BD v1 creada con la API cruda de IndexedDB (solo el store 'profile').
    await new Promise<void>((resolve, reject) => {
      const pet = globalThis.indexedDB.open("fv-db", 1);
      pet.onupgradeneeded = () => {
        pet.result.createObjectStore("profile", { keyPath: "id" });
      };
      pet.onsuccess = () => {
        const bd = pet.result;
        const tx = bd.transaction("profile", "readwrite");
        tx.objectStore("profile").put({
          id: 1,
          name: "Perfil v1",
          role: "profile.role.demo",
          company: "Factronics, C.A.",
          language: "es-VE",
          theme: "system",
        });
        tx.oncomplete = () => {
          bd.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      pet.onerror = () => reject(pet.error);
    });

    // Abrir FVDatabase dispara la migración v1 → v2.
    await db.open();
    const perfil = await db.profile.get(1);
    expect(perfil?.name).toBe("Perfil v1");
    expect(db.tables.map((t) => t.name).sort()).toEqual(["contentItems", "packs", "profile", "syncState", "tombstones"]);
    expect(await db.packs.count()).toBe(0);

    // Las tablas nuevas son utilizables de inmediato.
    const { bundle, truststore } = await construirBundle("ninguna");
    const r = await store.installBundle(bundle, { truststore, clientVersion: CLIENT_VERSION, isoNow: ISO_NOW });
    expect(r.ok).toBe(true);
    expect((await db.profile.get(1))?.name).toBe("Perfil v1");
  });
});
