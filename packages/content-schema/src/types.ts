/**
 * F&V — Tipos compartidos del esquema canónico de contenido (v1.0.0).
 *
 * Contrato de datos para las apps (Android vía Kotlin más adelante, PWA en TS,
 * portal y backend). Estos tipos están alineados 1:1 con los JSON Schema de
 * `schemas/`. Si cambia el esquema, cambia esta versión (semver) y se declara
 * una migración en `src/migrate.mjs`.
 *
 * REGLA INQUEBRANTABLE: todo dato técnico lleva `sourceRef` completo.
 * Sin fuente no se valida ni se publica (AGENTS.md, regla 2).
 */

export type TipoItem =
  | "tecnologia"
  | "familia"
  | "generacion"
  | "modelo"
  | "sistema"
  | "componente"
  | "numero_parte"
  | "codigo_error"
  | "tinta"
  | "documento"
  | "pagina"
  | "fragmento"
  | "pregunta"
  | "intento"
  | "certificado";

export type EstadoItem = "borrador" | "en_revision" | "validado" | "publicado" | "retirado";
export type Confianza = "alta" | "media" | "baja";

export type TipoDocumento =
  | "manual_operador"
  | "manual_servicio"
  | "boletin"
  | "dibujo"
  | "ipb"
  | "procedimiento"
  | "hoja_referencia"
  | "tabla"
  | "otro";

export type TipoPregunta =
  | "seleccion_simple"
  | "verdadero_falso"
  | "seleccion_multiple"
  | "completar_frase"
  | "describir_componente"
  | "diagnostico_error"
  | "numero_parte";

export type Dificultad = "basico" | "intermedio" | "avanzado";
export type ClaseInsumo = "tinta" | "make_up" | "solvente" | "limpiador" | "otro";
export type EstadoCertificado = "pendiente" | "emitido" | "revocado";

/** Fecha ISO 8601 (AAAA-MM-DD). */
export type Fecha = string;

/**
 * Procedencia obligatoria de todo dato técnico.
 * Sin estos 8 campos el validador rechaza el ítem.
 */
export interface SourceRef {
  /** Título del documento de origen tal como aparece en él. */
  documento: string;
  /** Código oficial del documento (en packs demo: 'DEMO-...'). */
  codigo_oficial: string;
  /** Revisión del documento (p. ej. 'A', 'AB', 'Rev C'). */
  revision: string;
  /** Página de la cita. */
  pagina: number;
  /** Página final si la cita abarca rango (>= pagina). */
  pagina_fin?: number;
  /** Cita textual que respalda el dato (mín. 10 caracteres). */
  cita_textual: string;
  confianza: Confianza;
  /** Persona que verificó el dato contra la fuente (revisión humana). */
  revisor: string;
  fecha_revision: Fecha;
  /** Referencia al ítem 'documento' del pack (opcional; nunca al propio ítem). */
  documento_id?: string;
}

/** Campos comunes a todo ítem de contenido. */
export interface ItemBase {
  /** ID estable '<prefijo>:<slug-kebab-case>'. Inmutable una vez publicado. */
  id: string;
  tipo: TipoItem;
  /** Versión del esquema con la que fue validado el ítem. */
  schema_version: string;
  /** Revisión de contenido del ítem (incrementa en cada cambio; el ID no cambia). */
  revision: number;
  estado: EstadoItem;
  actualizado: Fecha;
  etiquetas: string[];
  /** PROCEDENCIA OBLIGATORIA. */
  source_ref: SourceRef;
}

export interface Tecnologia extends ItemBase {
  tipo: "tecnologia";
  nombre: string;
  siglas?: string;
  descripcion?: string;
}

export interface Familia extends ItemBase {
  tipo: "familia";
  tecnologia_id: string;
  nombre: string;
  descripcion?: string;
}

export interface Generacion extends ItemBase {
  tipo: "generacion";
  familia_id: string;
  nombre: string;
  /** Opcional: no se consigna si la fuente no lo respalda (prohibido inventar). */
  anio?: number;
}

export interface Modelo extends ItemBase {
  tipo: "modelo";
  generacion_id: string;
  tecnologia_id?: string;
  nombre: string;
  descripcion?: string;
}

export interface Sistema extends ItemBase {
  tipo: "sistema";
  nombre: string;
  descripcion: string;
  modelo_ids?: string[];
}

export interface Componente extends ItemBase {
  tipo: "componente";
  sistema_id: string;
  nombre: string;
  funcion: string;
  modelo_ids?: string[];
}

export interface NumeroParte extends ItemBase {
  tipo: "numero_parte";
  /** En packs demo: 'DEMO-...'. Prohibido inventar códigos reales. */
  codigo: string;
  componente_id: string;
  descripcion: string;
  /** Modelos donde se usa ('usado en'). */
  modelo_ids: string[];
}

export interface CodigoError extends ItemBase {
  tipo: "codigo_error";
  codigo: string;
  titulo: string;
  descripcion: string;
  causa_sugerida?: string;
  accion_sugerida?: string;
  modelo_ids?: string[];
}

export interface Tinta extends ItemBase {
  tipo: "tinta";
  codigo: string;
  clase: ClaseInsumo;
  color?: string;
  descripcion: string;
  modelo_ids?: string[];
}

export interface Documento extends ItemBase {
  tipo: "documento";
  titulo: string;
  codigo_oficial: string;
  /** Revisión del documento (no confundir con 'revision', la revisión del ítem). */
  revision_documento: string;
  tipo_documento: TipoDocumento;
  /** BCP-47 simplificado: es, en, pt, pt-BR... */
  idioma: string;
  editor?: string;
  nota_licencia?: string;
}

export interface Pagina extends ItemBase {
  tipo: "pagina";
  documento_id: string;
  numero: number;
  resumen?: string;
  texto?: string;
}

export interface Fragmento extends ItemBase {
  tipo: "fragmento";
  documento_id: string;
  pagina_id?: string;
  pagina_numero: number;
  texto: string;
  tema?: string;
  entidades?: string[];
}

export interface Pregunta extends ItemBase {
  tipo: "pregunta";
  tipo_pregunta: TipoPregunta;
  enunciado: string;
  /** Obligatorio en seleccion_simple, verdadero_falso y seleccion_multiple. */
  opciones?: string[];
  respuesta_correcta: string | string[];
  explicacion: string;
  dificultad: Dificultad;
  tema?: string;
  entidades?: string[];
}

export interface Intento extends ItemBase {
  tipo: "intento";
  /** Alias: prohibido almacenar PII (nombre real, correo, identificadores). */
  usuario_alias: string;
  pregunta_id: string;
  respuesta: string | string[];
  correcta: boolean;
  /** Puntaje normalizado 0..1. */
  puntaje: number;
  fecha: Fecha;
  nota?: string;
}

export interface Certificado extends ItemBase {
  tipo: "certificado";
  /** Debe declarar 'programa interno' de Factronics, C.A. */
  programa: string;
  titulo: string;
  usuario_alias: string;
  emitido: Fecha;
  expira?: Fecha;
  /** Estado de emisión (no confundir con 'estado', el ciclo de vida del ítem). */
  estado_emision: EstadoCertificado;
  intento_ids?: string[];
  /** Debe incluir: 'No es una certificación oficial de Videojet Technologies'. */
  aviso: string;
}

export type Item =
  | Tecnologia
  | Familia
  | Generacion
  | Modelo
  | Sistema
  | Componente
  | NumeroParte
  | CodigoError
  | Tinta
  | Documento
  | Pagina
  | Fragmento
  | Pregunta
  | Intento
  | Certificado;

/** Manifiesto de un pack de contenido (pack.json). */
export interface PackManifest {
  id: string;
  nombre: string;
  descripcion: string;
  /** Versión del contenido del pack (semver). */
  version: string;
  /** Versión del esquema (semver). Migrar antes de validar si difiere. */
  schema_version: string;
  /** true = contenido demo autorizado, etiquetado y con códigos 'DEMO-'. */
  demo: boolean;
  idioma_default: string;
  creado: Fecha;
  responsable: string;
}

export interface Pack {
  manifest: PackManifest;
  items: Item[];
}
