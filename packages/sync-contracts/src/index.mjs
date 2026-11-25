// F&V — @factronics-fv/sync-contracts: contratos de sincronización offline (v1.0.0).
//
// Superficie pública del contrato compartido por Android (Kotlin), PWA (TypeScript)
// y herramientas (Node). Las implementaciones cliente son paritarias y se prueban
// contra los fixtures de packages/shared-fixtures/sync/. Ver ADR-0009.

export {
  CONTRACT_VERSION,
  SUPPORTED_CONTRACT_MAJOR,
  BUNDLE_FORMAT,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  CONTENT_SCHEMA_VERSION,
  LOCAL_SCHEMA_VERSION,
  SIGN_ALG,
  BACKUP_MAX_BYTES,
  BUNDLE_MAX_BYTES,
  ERRORES,
  PREFIJOS,
  CAMPOS_SOURCE_REF,
  REGLAS,
  PREFIJO_CODIGO_DEMO,
  ETIQUETA_DEMO,
  cmpSemver,
  ErrorContrato,
} from "./constants.mjs";

export { canonicalJson } from "./canonical.mjs";
export { sha256Hex, generarParClaves, firmar, verificarFirma, firmarManifiesto, verificarManifiesto } from "./integrity.mjs";
export { validarContenido } from "./contentRules.mjs";
export {
  itemsDe,
  entriesDe,
  tecnologiasDe,
  construirIndices,
  buscar,
  tamanoBytes,
  serializarArchivosItems,
} from "./state.mjs";
export {
  validarConEsquema,
  validarBundle,
  estadoDesdeBundle,
  instalarBundle,
  estadoVacio,
  resumenDe,
} from "./installer.mjs";
export { aplicarDelta } from "./delta.mjs";
export { crearBackup, validarBackup, restablecerBackup, payloadChecksum } from "./backup.mjs";
export { crearServidorSimulado, sincronizar } from "./mock-server.mjs";
export { crearMigradorLocal, MIGRACIONES_SINTETICAS } from "./localSchema.mjs";
