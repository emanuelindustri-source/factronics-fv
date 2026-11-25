// F&V (by Factronics) — motor de festividades (F1.3).
// Fechas calculadas en la zona horaria del dispositivo; nunca se inventan fechas.
// Mismas reglas que Android (FestivityEngine.kt); fixtures compartidos en
// packages/shared-fixtures/theme/festivities-fixtures.json.

export const FESTIVITY_IDS = [
  "christmas",
  "epiphany",
  "valentine",
  "carnival",
  "mothersDay",
  "fathersDay",
  "childrensDay",
  "halloween",
  "independence"
] as const;

export type FestivityId = (typeof FESTIVITY_IDS)[number] | "none";

export const FESTIVITY_PRIORITY: Record<(typeof FESTIVITY_IDS)[number], number> = {
  childrensDay: 10,
  fathersDay: 20,
  mothersDay: 30,
  epiphany: 40,
  christmas: 50,
  independence: 60,
  halloween: 70,
  valentine: 80,
  carnival: 90
};

/** Festividades que solo aplican en Venezuela. El resto son globales. */
const VENEZUELA_ONLY = new Set<string>([
  "mothersDay",
  "fathersDay",
  "childrensDay",
  "independence"
]);

export interface FestivityOptions {
  enabled: boolean;
  sober: boolean;
  override: string;
}

export interface FestivityInput extends FestivityOptions {
  now: Date;
  zone: string;
  country: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function datePartsInZone(now: Date, zone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

/** Pascua gregoriana (algoritmo de Meeus/Jones/Butcher). Devuelve mediodía UTC. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month, day);
}

/** Enésimo día de la semana del mes (n=1..5, 0=domingo). */
export function nthWeekday(year: number, month: number, nth: number, weekday: number): Date {
  const first = utcDate(year, month, 1);
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return addDays(first, offset + (nth - 1) * 7);
}

function within(date: Date, start: Date, days: number): boolean {
  const value = date.getTime();
  return value >= start.getTime() && value < start.getTime() + days * DAY_MS;
}

function activeIds(year: number, date: Date, country: string): string[] {
  const active: string[] = [];
  const allowedByCountry = (id: string) =>
    !VENEZUELA_ONLY.has(id) || country.toUpperCase() === "VE";

  // Fechas fijas (ventana declarada).
  if (within(date, utcDate(year, 12, 15), 11) && allowedByCountry("christmas")) {
    active.push("christmas");
  }
  if (within(date, utcDate(year, 1, 5), 2) && allowedByCountry("epiphany")) {
    active.push("epiphany");
  }
  if (within(date, utcDate(year, 2, 7), 8) && allowedByCountry("valentine")) {
    active.push("valentine");
  }
  if (within(date, utcDate(year, 10, 25), 7) && allowedByCountry("halloween")) {
    active.push("halloween");
  }
  if (within(date, utcDate(year, 7, 5), 1) && allowedByCountry("independence")) {
    active.push("independence");
  }

  // Carnaval: domingo a martes (Pascua - 50 a Pascua - 47).
  const easter = easterSunday(year);
  if (within(date, addDays(easter, -50), 4) && allowedByCountry("carnival")) {
    active.push("carnival");
  }

  // Días de familia en Venezuela (enésimo día de la semana).
  if (allowedByCountry("mothersDay") && date.getTime() === nthWeekday(year, 5, 2, 0).getTime()) {
    active.push("mothersDay");
  }
  if (allowedByCountry("fathersDay") && date.getTime() === nthWeekday(year, 6, 3, 0).getTime()) {
    active.push("fathersDay");
  }
  if (allowedByCountry("childrensDay") && date.getTime() === nthWeekday(year, 7, 3, 0).getTime()) {
    active.push("childrensDay");
  }
  return active;
}

/**
 * Resuelve la festividad activa.
 * Prioridad: si hay conflicto, gana la de mayor número (Carnaval > San Valentín, etc.).
 */
export function resolveFestivity(input: FestivityInput): FestivityId {
  if (!input.enabled || input.sober) return "none";

  if (input.override && input.override !== "auto") {
    if (input.override === "none") return "none";
    if ((FESTIVITY_IDS as readonly string[]).includes(input.override)) {
      return input.override as FestivityId;
    }
  }

  const { year, month, day } = datePartsInZone(input.now, input.zone);
  const date = utcDate(year, month, day);
  const active = activeIds(year, date, input.country);
  if (active.length === 0) return "none";
  return active.reduce((best, id) =>
    FESTIVITY_PRIORITY[id as keyof typeof FESTIVITY_PRIORITY] >
    FESTIVITY_PRIORITY[best as keyof typeof FESTIVITY_PRIORITY]
      ? id
      : best
  ) as FestivityId;
}

export function festivityNameKey(id: FestivityId): string {
  return `festivity.${id}`;
}

export function isFestivityId(value: string): value is FestivityId {
  return value === "none" || (FESTIVITY_IDS as readonly string[]).includes(value);
}
