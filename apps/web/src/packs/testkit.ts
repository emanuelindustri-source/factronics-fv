// F&V — Helpers de prueba del contrato de sincronización (port TS de test/helpers.mjs).
//
// Construye bundles, deltas y backups a partir de los fixtures compartidos,
// con criptografía efímera por ejecución (nunca claves en el repo).
// Las mutaciones reproducen EXACTAMENTE las de packages/sync-contracts/test/helpers.mjs
// para que los fixtures compartidos validen la paridad JS = TS (ADR-0009).

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { sha256Hex, generarParClaves, firmarManifiesto } from "./integrity";
import { estadoDesdeBundle } from "./installer";
import { crearBackup, payloadChecksum } from "./backup";
import type {
  BackupDoc,
  BackupSettings,
  BundleDoc,
  ContenidoItem,
  DeltaDoc,
  DeltaUpsert,
  PackManifest,
  PackState,
  SignatureBlock,
  SyncManifest,
  Tombstone,
  Truststore,
} from "./types";

// apps/web/src/packs → 4 niveles arriba es la raíz del monorepo.
const URL_FIXTURES = new URL("../../../../packages/shared-fixtures/sync/", import.meta.url);

/* eslint-disable @typescript-eslint/no-explicit-any */
export type FixtureItem = Record<string, any>;

export interface CasoBundle {
  name: string;
  mutacion: string;
  expect: "accept" | "reject";
  codes_any?: string[];
  rules_any?: string[];
  motivo?: string;
  instalado_version?: string;
  tamano_simulado?: number | null;
}

export interface CasoDelta {
  name: string;
  kind: string;
  expect: "accept" | "reject";
  codes_any?: string[];
  motivo_segunda?: string;
  expect_version?: string;
  expect_items?: number;
  expect_tombstones?: string[];
}

export interface CasoBackup {
  name: string;
  mutacion: string;
  expect: "accept" | "reject";
  codes_any?: string[];
  tamano_simulado?: number | null;
}

export interface CasoBusqueda {
  name: string;
  query: { texto?: string; tipo?: string | null; tecnologia?: string | null };
  expect_ids: string[];
}

export interface CasoAlmacenLocal {
  name: string;
  migracion: string;
  store_in: FixtureItem | null;
  expect_store?: FixtureItem;
  expect_error?: string;
  expect_local_schema_version?: number;
}

export interface SyncCases {
  client_version: string;
  mini_pack: { manifest: FixtureItem; items: Record<string, FixtureItem[]> };
  bundle_cases: CasoBundle[];
  delta_cases: CasoDelta[];
  backup_cases: CasoBackup[];
  search_cases: CasoBusqueda[];
  local_store_cases: CasoAlmacenLocal[];
}

export const FIXTURES = JSON.parse(readFileSync(new URL("sync-cases.json", URL_FIXTURES), "utf8")) as SyncCases;
export const VECTORS = JSON.parse(readFileSync(new URL("crypto-vectors.json", URL_FIXTURES), "utf8")) as {
  canonical_vectors: Array<{ name: string; payload: unknown; canonical: string; sha256: string }>;
  signature_vector: { alg: string; key_id: string; message: string; signed: string; public_key: string; sig: string };
};

export const CLIENT_VERSION = FIXTURES.client_version;
export const ISO_NOW = "2026-11-25T12:00:00Z";

export function clon<T>(o: T): T {
  return structuredClone(o);
}

export interface ClavesEfimeras {
  publicKeyB64: string;
  privateKeyB64: string;
}

const byteLength = (s: string): number => new TextEncoder().encode(s).length;

/**
 * sha256Hex síncrono para el kit de pruebas (igual que node:crypto en la
 * referencia JS). Solo lo usan los tests, que corren en entorno Node.
 */
function sha256HexSync(texto: string): string {
  return createHash("sha256").update(new TextEncoder().encode(texto)).digest("hex");
}

function totalItems(items: Record<string, FixtureItem[]>): number {
  return Object.values(items).reduce((n, arr) => n + arr.length, 0);
}

function archivosDe(manifest: FixtureItem, items: Record<string, FixtureItem[]>): Record<string, string> {
  const files: Record<string, string> = { "pack.json": JSON.stringify(manifest) };
  for (const [tipo, arr] of Object.entries(items)) {
    if (arr.length > 0) files[`items/${tipo}.json`] = JSON.stringify(arr);
  }
  return files;
}

function syncManifestDe(
  manifest: FixtureItem,
  items: Record<string, FixtureItem[]>,
  files: Record<string, string>,
  { minClient = "0.1.0", contractVersion = "1.0.0" } = {},
): SyncManifest {
  const entries = Object.keys(files)
    .sort()
    .map((path) => ({ path, sha256: sha256HexSync(files[path]), bytes: byteLength(files[path]) }));
  return {
    contract_version: contractVersion,
    pack_id: manifest.id,
    pack_version: manifest.version,
    schema_version: manifest.schema_version,
    min_client_version: minClient,
    demo: manifest.demo,
    creado: manifest.creado,
    responsable: manifest.responsable,
    items_total: totalItems(items),
    files: entries,
  };
}

// Los hashes de los archivos declarados se calculan igual que en la referencia JS.

/**
 * Construye un bundle .fvpack válido a partir del mini-pack de fixtures,
 * aplicando la mutación indicada (ver sync-cases.json → bundle_cases.mutacion).
 */
export async function construirBundle(
  mutacion = "ninguna",
  { keyId = "test-key", keypair = null }: { keyId?: string; keypair?: ClavesEfimeras | null } = {},
): Promise<{ bundle: BundleDoc; truststore: Truststore; keypair: ClavesEfimeras }> {
  const kp = keypair ?? (await generarParClaves());
  const manifest = clon(FIXTURES.mini_pack.manifest);
  const items = clon(FIXTURES.mini_pack.items);
  let opts: { minClient?: string; contractVersion?: string } = {};
  let forzarArchivos: Record<string, string> | null = null;

  const tec = items.tecnologia[0];
  const pre = items.pregunta[0];
  const crt = items.certificado[0];

  switch (mutacion) {
    case "ninguna":
      break;
    case "item-sin-source-ref":
      delete tec.source_ref;
      break;
    case "source-ref-incompleto":
      delete tec.source_ref.cita_textual;
      break;
    case "id-formato":
      tec.id = "TEC demo";
      break;
    case "id-tipo":
      tec.id = "fam:demo-test";
      break;
    case "id-duplicado":
      items.pregunta.push(clon(pre));
      break;
    case "etiqueta-demo":
      tec.etiquetas = [];
      break;
    case "codigo-no-demo":
      tec.source_ref.codigo_oficial = "ABC-0001";
      break;
    case "schema-version-dispar":
      tec.schema_version = "1.1.0";
      break;
    case "archivo-tipo":
      items.tecnologia.push(items.pregunta.pop() as FixtureItem);
      break;
    case "certificado-sin-aviso":
      delete crt.aviso;
      break;
    case "certificado-programa-oficial":
      crt.programa = "Programa oficial de certificación de Videojet Technologies";
      break;
    case "pregunta-respuesta":
      pre.respuesta_correcta = "Opción imposible";
      break;
    case "json-invalido":
      forzarArchivos = { "items/pregunta.json": "{esto no es json" };
      break;
    case "manifest-campo-faltante":
      break;
    case "min-client-version":
      opts = { minClient: "99.0.0" };
      break;
    case "version-futura":
      manifest.schema_version = "2.0.0";
      for (const arr of Object.values(items)) for (const it of arr) it.schema_version = "2.0.0";
      break;
    case "contract-version-futura":
      opts = { contractVersion: "2.0.0" };
      break;
    case "hash-alterado":
    case "firma-alterada":
    case "clave-desconocida":
    case "sin-firma":
    case "downgrade":
      // Mutaciones aplicadas después de firmar (o resueltas por 'instalado_version').
      break;
    default:
      throw new Error(`mutación desconocida: ${mutacion}`);
  }

  const files = archivosDe(manifest, items);
  if (forzarArchivos) Object.assign(files, forzarArchivos);
  const syncManifest = syncManifestDe(manifest, items, files, opts);
  if (mutacion === "manifest-campo-faltante") {
    delete (syncManifest as Partial<SyncManifest>).min_client_version;
  }

  const manifestText = JSON.stringify(syncManifest, null, 2);
  files["sync-manifest.json"] = manifestText;
  const signature = await firmarManifiesto(manifestText, { keyId, privateKeyB64: kp.privateKeyB64 });
  const truststore: Truststore = {
    keys: [{ key_id: keyId, alg: "SHA256withECDSA", demo: true, public_key: kp.publicKeyB64 }],
  };

  const bundle: BundleDoc = {
    bundle_format: "fvpack/1",
    sync_manifest: syncManifest,
    signature,
    pack_manifest: manifest as PackManifest,
    files,
  };

  // Mutaciones sobre el bundle ya firmado (integridad/firma).
  switch (mutacion) {
    case "hash-alterado":
      bundle.files["pack.json"] = bundle.files["pack.json"] + " ";
      break;
    case "firma-alterada":
      (bundle.signature as SignatureBlock).sig = "AAAA";
      break;
    case "clave-desconocida":
      (bundle.signature as SignatureBlock).key_id = "clave-desconocida";
      break;
    case "sin-firma":
      bundle.signature = null;
      break;
    default:
      break;
  }

  return { bundle, truststore, keypair: kp };
}

/** Estado instalado de referencia (para casos de downgrade / ya-instalado). */
export function estadoInstalado(version: string): PackState {
  return {
    packId: "pack-fv-test",
    packVersion: version,
    schemaVersion: null,
    minClientVersion: null,
    demo: false,
    lastAppliedSequence: 0,
    files: {},
    tombstones: {},
    installedAt: null,
    updatedAt: null,
  };
}

function upsert(ruta: string, itemsArr: ContenidoItem[]): DeltaUpsert {
  const content = JSON.stringify(itemsArr);
  return { path: ruta, sha256: sha256HexSync(content), bytes: byteLength(content), content };
}

function deltaBase(extra: Partial<DeltaDoc>): DeltaDoc {
  return {
    contract_version: "1.0.0",
    pack_id: "pack-fv-test",
    base_version: "1.0.0",
    delta_version: "1.1.0",
    sequence: 1,
    min_client_version: "0.1.0",
    upserts: [],
    tombstones: [],
    ...extra,
  };
}

function preguntaRev2(): ContenidoItem {
  const p = clon(FIXTURES.mini_pack.items.pregunta[0]) as ContenidoItem;
  p.revision = 2;
  p.enunciado = "¿Para qué sirve el mini-pack de fixtures? (revisión 2)";
  return p;
}

function certificadoRev2(): ContenidoItem {
  const c = clon(FIXTURES.mini_pack.items.certificado[0]) as ContenidoItem;
  c.revision = 2;
  return c;
}

/**
 * Construye los deltas de un caso de sync-cases.json → delta_cases.
 * @returns lista de deltas a aplicar en orden
 */
export async function construirDeltas(kind: string): Promise<DeltaDoc[]> {
  const tomb = (id: string, tipo: string): Tombstone => ({
    id,
    tipo,
    revision: 2,
    deleted_at: "2026-11-26",
    reason: "retirado en revisión demo",
  });
  switch (kind) {
    case "valido":
    case "idempotencia":
      return [
        deltaBase({
          upserts: [upsert("items/pregunta.json", [preguntaRev2()])],
          tombstones: [tomb("tec:demo-test", "tecnologia")],
        }),
      ];
    case "orden-invalido":
      return [deltaBase({ sequence: 5 })];
    case "base-descuadre":
      return [deltaBase({ base_version: "0.9.0" })];
    case "downgrade":
      return [deltaBase({ delta_version: "1.0.0" })];
    case "tombstone-resurreccion":
      return [
        deltaBase({ tombstones: [tomb("qst:demo-test-0001", "pregunta")] }),
        deltaBase({
          base_version: "1.1.0",
          delta_version: "1.2.0",
          sequence: 2,
          upserts: [upsert("items/pregunta.json", [clon(FIXTURES.mini_pack.items.pregunta[0]) as ContenidoItem])],
        }),
      ];
    case "hash-malo": {
      const up = upsert("items/pregunta.json", [preguntaRev2()]);
      up.sha256 = "0".repeat(64);
      return [deltaBase({ upserts: [up] })];
    }
    case "min-client":
      return [deltaBase({ min_client_version: "99.0.0" })];
    case "cadena":
      return [
        deltaBase({ upserts: [upsert("items/pregunta.json", [preguntaRev2()])] }),
        deltaBase({
          base_version: "1.1.0",
          delta_version: "1.2.0",
          sequence: 2,
          upserts: [upsert("items/certificado.json", [certificadoRev2()])],
        }),
        deltaBase({
          base_version: "1.2.0",
          delta_version: "1.3.0",
          sequence: 3,
          tombstones: [tomb("tec:demo-test", "tecnologia")],
        }),
      ];
    default:
      throw new Error(`kind de delta desconocido: ${kind}`);
  }
}

/** Estado instalado completo a partir del mini-pack (para deltas/backup/búsqueda). */
export async function estadoMiniPack(
  isoNow = ISO_NOW,
): Promise<{ estado: PackState; truststore: Truststore; bundle: BundleDoc }> {
  const { bundle, truststore } = await construirBundle("ninguna");
  return { estado: estadoDesdeBundle(bundle, isoNow), truststore, bundle };
}

export const SETTINGS_DEMO: BackupSettings = {
  language: "es-VE",
  theme_mode: "system",
  dynamic_color: true,
  festivities_enabled: true,
  sober_mode: false,
  festivity_override: "auto",
};

/**
 * Construye un backup a partir del mini-pack instalado, con la mutación indicada.
 */
export async function construirBackup(
  mutacion = "ninguna",
): Promise<{ backup: BackupDoc | null; texto: string; truststore: Truststore }> {
  const { estado, truststore } = await estadoMiniPack();
  const backup = await crearBackup({
    packs: [{ estado }],
    settings: clon(SETTINGS_DEMO),
    source: "android",
    created: "2026-11-25T10:00:00Z",
    appMinVersion: "0.1.0",
  });

  switch (mutacion) {
    case "ninguna":
      break;
    case "checksum-alterado":
      backup.settings.language = "en";
      break;
    case "formato-futuro":
      backup.format_version = "2.0.0";
      break;
    case "settings-con-nombre":
      backup.settings.name = "Khristyan Hidalgo";
      backup.checksum = await sha256Hex(payloadChecksum(backup));
      break;
    case "json-invalido":
      return { backup: null, texto: "esto no es un backup", truststore };
    default:
      throw new Error(`mutación de backup desconocida: ${mutacion}`);
  }
  return { backup, texto: JSON.stringify(backup), truststore };
}
