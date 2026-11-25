// F&V (by Factronics) — pruebas del motor de festividades (F1.3).
// Consume los fixtures compartidos con Android para garantizar paridad.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  easterSunday,
  nthWeekday,
  resolveFestivity,
  type FestivityId
} from "./festivities";

interface FixtureCase {
  name: string;
  instant: string;
  zone: string;
  country: string;
  expected: FestivityId;
  override?: string;
  enabled?: boolean;
  sober?: boolean;
}

const fixtures = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../../../packages/shared-fixtures/theme/festivities-fixtures.json", import.meta.url)
    ),
    "utf8"
  )
) as { cases: FixtureCase[] };

describe("motor de festividades", () => {
  for (const fixture of fixtures.cases) {
    it(fixture.name, () => {
      const result = resolveFestivity({
        now: new Date(fixture.instant),
        zone: fixture.zone,
        country: fixture.country,
        enabled: fixture.enabled ?? true,
        sober: fixture.sober ?? false,
        override: fixture.override ?? "auto"
      });
      expect(result).toBe(fixture.expected);
    });
  }

  it("Pascua conocida (2024–2028)", () => {
    expect(easterSunday(2024).toISOString().slice(0, 10)).toBe("2024-03-31");
    expect(easterSunday(2025).toISOString().slice(0, 10)).toBe("2025-04-20");
    expect(easterSunday(2026).toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(easterSunday(2027).toISOString().slice(0, 10)).toBe("2027-03-28");
    expect(easterSunday(2028).toISOString().slice(0, 10)).toBe("2028-04-16");
  });

  it("enésimo domingo del mes", () => {
    expect(nthWeekday(2026, 5, 2, 0).toISOString().slice(0, 10)).toBe("2026-05-10");
    expect(nthWeekday(2026, 6, 3, 0).toISOString().slice(0, 10)).toBe("2026-06-21");
    expect(nthWeekday(2026, 7, 3, 0).toISOString().slice(0, 10)).toBe("2026-07-19");
  });

  it("un override desconocido vuelve a automático", () => {
    expect(
      resolveFestivity({
        now: new Date("2026-12-25T15:00:00Z"),
        zone: "America/Caracas",
        country: "VE",
        enabled: true,
        sober: false,
        override: "inventada"
      })
    ).toBe("christmas");
  });
});
