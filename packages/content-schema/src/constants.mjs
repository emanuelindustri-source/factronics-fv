// F&V — Constantes del esquema canónico de contenido (v1.0.0).
// Un solo lugar para tipos, prefijos de ID y mapa de referencias.

export const SCHEMA_VERSION = "1.0.0";

/** Los 15 tipos de entidad del dominio F&V. */
export const TIPOS = [
  "tecnologia",
  "familia",
  "generacion",
  "modelo",
  "sistema",
  "componente",
  "numero_parte",
  "codigo_error",
  "tinta",
  "documento",
  "pagina",
  "fragmento",
  "pregunta",
  "intento",
  "certificado",
];

/** Prefijo estable del ID por tipo: <prefijo>:<slug-kebab-case>. */
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

/** Campos de referencia → tipo esperado (null = cualquier tipo). */
export const CAMPOS_REF = {
  tecnologia_id: "tecnologia",
  familia_id: "familia",
  generacion_id: "generacion",
  sistema_id: "sistema",
  componente_id: "componente",
  documento_id: "documento",
  pagina_id: "pagina",
  pregunta_id: "pregunta",
  modelo_ids: "modelo",
  intento_ids: "intento",
  entidades: null,
};

/** Campos que forman parte de la procedencia obligatoria. */
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

/** En packs demo todo código (partes, errores, tintas, documentos, source_ref) empieza por 'DEMO-'. */
export const PREFIJO_CODIGO_DEMO = /^DEMO[-_]/i;

/** Etiqueta obligatoria en cada ítem de un pack demo. */
export const ETIQUETA_DEMO = "DEMO";
