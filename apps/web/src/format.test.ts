// F&V (by Factronics) — pruebas de formato por locale (gate F1.2).
import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatInteger,
  formatNumber,
  formatPercent,
  SAMPLE_DATE,
  SAMPLE_NUMBER,
  SAMPLE_PERCENT
} from "./format";

describe("formato de números", () => {
  it("es-VE usa punto de miles y coma decimal", () => {
    expect(formatNumber(SAMPLE_NUMBER, "es-VE")).toBe("1.234,5");
    expect(formatInteger(1234, "es-VE")).toBe("1.234");
  });

  it("en-US usa coma de miles y punto decimal", () => {
    expect(formatNumber(SAMPLE_NUMBER, "en")).toBe("1,234.5");
  });

  it("de-DE usa punto de miles y coma decimal", () => {
    expect(formatNumber(SAMPLE_NUMBER, "de")).toBe("1.234,5");
  });

  it("ja-JP usa coma de miles y punto decimal", () => {
    expect(formatNumber(SAMPLE_NUMBER, "ja")).toBe("1,234.5");
  });
});

describe("formato de porcentajes", () => {
  it("es-VE y ja-JP", () => {
    expect(formatPercent(SAMPLE_PERCENT, "es-VE")).toBe("25%");
    expect(formatPercent(SAMPLE_PERCENT, "ja")).toBe("25%");
  });

  it("en-US", () => {
    expect(formatPercent(SAMPLE_PERCENT, "en")).toBe("25%");
  });

  it("de-DE separa con espacio duro", () => {
    expect(formatPercent(SAMPLE_PERCENT, "de")).toBe("25\u00A0%");
  });
});

describe("formato de fechas largas", () => {
  it("es-VE", () => {
    expect(formatDate(SAMPLE_DATE, "es-VE")).toBe("25 de noviembre de 2026");
  });

  it("en-US", () => {
    expect(formatDate(SAMPLE_DATE, "en")).toBe("November 25, 2026");
  });

  it("de-DE", () => {
    expect(formatDate(SAMPLE_DATE, "de")).toBe("25. November 2026");
  });

  it("ja-JP", () => {
    expect(formatDate(SAMPLE_DATE, "ja")).toBe("2026年11月25日");
  });
});
