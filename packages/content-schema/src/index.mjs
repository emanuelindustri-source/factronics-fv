// F&V — API pública de @factronics-fv/content-schema.
export { validatePack } from "./validate.mjs";
export { loadPack, ErrorCarga } from "./load.mjs";
export { migrar, createMigrador, CURRENT_SCHEMA_VERSION, MIGRATIONS, cmpSemver } from "./migrate.mjs";
export {
  SCHEMA_VERSION,
  TIPOS,
  PREFIJOS,
  CAMPOS_REF,
  CAMPOS_SOURCE_REF,
  PREFIJO_CODIGO_DEMO,
  ETIQUETA_DEMO,
} from "./constants.mjs";
