// F&V — Constantes del contrato de sincronización (v1.0.0).
// Un solo lugar para versiones, códigos de error y límites.
// IMPORTANTE: los nombres de error son contrato compartido; las implementaciones
// Kotlin (Android) y TypeScript (PWA) deben devolver exactamente estos códigos.

/** Versión de este contrato de sincronización. */
export const CONTRACT_VERSION = "1.0.0";

/** Rango de contract_version aceptado por el cliente (magor soportado). */
export const SUPPORTED_CONTRACT_MAJOR = 1;

/** Formato del bundle de instalación. */
export const BUNDLE_FORMAT = "fvpack/1";

/** Formato del backup local. */
export const BACKUP_FORMAT = "fv-backup";
export const BACKUP_FORMAT_VERSION = "1.0.0";

/** Versión del esquema canónico de contenido (F1.1) soportada. */
export const CONTENT_SCHEMA_VERSION = "1.0.0";

/** Versión del almacén local de packs (esquema propio de la app, ver ADR-0009). */
export const LOCAL_SCHEMA_VERSION = 1;

/** Algoritmo de firma del contrato. */
export const SIGN_ALG = "SHA256withECDSA";

/** Límite de tamaño del archivo de backup (50 MiB). */
export const BACKUP_MAX_BYTES = 50 * 1024 * 1024;

/** Límite de tamaño de un bundle .fvpack (20 MiB). */
export const BUNDLE_MAX_BYTES = 20 * 1024 * 1024;

/** Códigos de error del contrato (compartidos Android ↔ PWA ↔ herramientas). */
export const ERRORES = {
  CONTRATO_VERSION: "CONTRATO-VERSION",
  MANIFIESTO_INVALIDO: "MANIFIESTO-INVALIDO",
  BUNDLE_INVALIDO: "BUNDLE-INVALIDO",
  HASH_INVALIDO: "HASH-INVALIDO",
  FIRMA_AUSENTE: "FIRMA-AUSENTE",
  FIRMA_INVALIDA: "FIRMA-INVALIDA",
  CLAVE_DESCONOCIDA: "CLAVE-DESCONOCIDA",
  VERSION_FUTURA: "VERSION-FUTURA",
  DOWNGRADE: "DOWNGRADE",
  VERSION_CLIENTE: "VERSION-CLIENTE",
  PACK_CORRUPTO: "PACK-CORRUPTO",
  CONTENIDO_INVALIDO: "CONTENIDO-INVALIDO",
  ORDEN_INVALIDO: "ORDEN-INVALIDO",
  BASE_DESCUADRE: "BASE-DESCUADRE",
  TOMBSTONE_CONFLICTO: "TOMBSTONE-CONFLICTO",
  RESPALDO_CORRUPTO: "RESPALDO-CORRUPTO",
  RESPALDO_GRANDE: "RESPALDO-DEMASIADO-GRANDE",
  RESPALDO_VERSION: "RESPALDO-VERSION",
  DISCO_LLENO: "DISCO-LLENO",
  ESCRITURA_INTERRUMPIDA: "ESCRITURA-INTERRUMPIDA",
  MIGRACION_FALLIDA: "MIGRACION-FALLIDA",
  PACK_NO_INSTALADO: "PACK-NO-INSTALADO",
};

/** Tipos de entidad del contenido (F1.1) para coherencia prefijo ↔ tipo. */
export const PREFIJOS = {
  tecnologia: "tec",
  familia: "fam",
  generacion: "gen",
  modelo: "mod",
  sistema: "sis",
  componente: "cmp",
  numero_parte: "prt",
  codigo_error: "err",
  tinta: "ink",
  documento: "doc",
  pagina: "pag",
  fragmento: "frag",
  pregunta: "qst",
  intento: "att",
  certificado: "crt",
};

/** Campos obligatorios de source_ref (F1.1). */
export const CAMPOS_SOURCE_REF = [
  "documento",
  "codigo_oficial",
  "revision",
  "pagina",
  "cita_textual",
  "confianza",
  "revisor",
  "fecha_revision",
];

/** Reglas semánticas del validador de F1.1 reutilizadas en el cliente. */
export const REGLAS = {
  FALTA_PROCEDENCIA: "FALTA-PROCEDENCIA",
  SOURCE_INCOMPLETO: "SOURCE-REF-INCOMPLETO",
  ID_FORMATO: "ID-FORMATO",
  ID_TIPO: "ID-TIPO",
  ID_DUPLICADO: "ID-DUPLICADO",
  SCHEMA_VERSION: "SCHEMA-VERSION",
  DEMO_ETIQUETA: "DEMO-ETIQUETA",
  DEMO_CODIGO: "DEMO-CODIGO",
  CERTIFICADO_AVISO: "CERTIFICADO-AVISO",
  CERTIFICADO_PROGRAMA: "CERTIFICADO-PROGRAMA",
  PREGUNTA_RESPUESTA: "PREGUNTA-RESPUESTA",
  ARCHIVO_TIPO: "ARCHIVO-TIPO",
};

export const PREFIJO_CODIGO_DEMO = /^DEMO[-_]/i;
export const ETIQUETA_DEMO = "DEMO";

/**
 * Compara versiones semánticas.
 * @returns {number} -1 si a < b, 0 si igual, 1 si a > b.
 */
export function cmpSemver(a, b) {
  const pa = String(a).split(".").map((n) => parseInt(n, 10));
  const pb = String(b).split(".").map((n) => parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** Errores tipados del contrato: llevan siempre un código de ERRORES. */
export class ErrorContrato extends Error {
  constructor(codigo, mensaje) {
    super(`[${codigo}] ${mensaje}`);
    this.name = "ErrorContrato";
    this.codigo = codigo;
  }
}
