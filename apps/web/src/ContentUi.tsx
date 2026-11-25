// F&V — UI de contenido offline de la PWA (F1.4).
// Pestaña "Contenido": búsqueda offline por texto/tipo/tecnología con estado
// vacío claro si no hay pack. Tarjeta de Ajustes: estado del pack instalado
// (versión, tamaño, última actualización, ítems) y acciones de instalar pack
// demo, exportar/restaurar copia de seguridad y limpiar contenido.
// Todo el texto viene del catálogo i18n (148 claves × 13 locales).

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  clearContent,
  exportBackupFile,
  getPackSummary,
  importBackupFile,
  installDemoPack,
  listarTecnologias,
  searchContent,
  type ContenidoItem,
  type Resumen
} from "./packs";
import { formatInteger } from "./format";

const CLAVE_ERROR: Record<string, string> = {
  "PACK-CORRUPTO": "errors.packCorrupt",
  "HASH-INVALIDO": "errors.hashInvalid",
  "FIRMA-AUSENTE": "errors.signatureMissing",
  "FIRMA-INVALIDA": "errors.signatureInvalid",
  "CLAVE-DESCONOCIDA": "errors.unknownKey",
  "VERSION-FUTURA": "errors.futureVersion",
  "DOWNGRADE": "errors.downgrade",
  "VERSION-CLIENTE": "errors.clientVersion",
  "CONTENIDO-INVALIDO": "errors.invalidContent",
  "ORDEN-INVALIDO": "errors.order",
  "RESPALDO-CORRUPTO": "errors.backupCorrupt",
  "RESPALDO-DEMASIADO-GRANDE": "errors.backupBig",
  "DISCO-LLENO": "errors.diskFull",
  "ESCRITURA-INTERRUMPIDA": "errors.writeInterrupted",
  "MIGRACION-FALLIDA": "errors.migrationFailed"
};

const CLAVE_TIPO: Record<string, string> = {
  tecnologia: "search.type.tecnologia",
  familia: "search.type.familia",
  generacion: "search.type.generacion",
  modelo: "search.type.modelo",
  sistema: "search.type.sistema",
  componente: "search.type.componente",
  numero_parte: "search.type.numero_parte",
  codigo_error: "search.type.codigo_error",
  tinta: "search.type.tinta",
  documento: "search.type.documento",
  pagina: "search.type.pagina",
  fragmento: "search.type.fragmento",
  pregunta: "search.type.pregunta",
  intento: "search.type.intento",
  certificado: "search.type.certificado"
};

const TODOS_LOS_TIPOS = Object.keys(CLAVE_TIPO);

function errorKey(codigo: string): string {
  return CLAVE_ERROR[codigo] ?? "errors.unknown";
}

function campoTexto(item: ContenidoItem, campos: string[]): string {
  for (const campo of campos) {
    const v = item[campo];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return typeof item.id === "string" ? item.id : "";
}

/** Pestaña "Contenido": búsqueda offline sobre el pack instalado. */
export function ContentTab() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<Resumen | null>(null);
  const [tecnologias, setTecnologias] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState("");
  const [tecnologia, setTecnologia] = useState("");
  const [resultados, setResultados] = useState<ContenidoItem[]>([]);
  const [fuente, setFuente] = useState<string | null>(null);

  const etiquetaTipo = useCallback(
    (tipoItem: string) => (CLAVE_TIPO[tipoItem] ? t(CLAVE_TIPO[tipoItem], {}) : tipoItem),
    [t]
  );

  useEffect(() => {
    void getPackSummary().then(setSummary);
    void listarTecnologias().then(setTecnologias);
  }, []);

  useEffect(() => {
    if (!summary?.instalado) return;
    let cancelado = false;
    void searchContent({
      texto: query.trim(),
      tipo: tipo || undefined,
      tecnologia: tecnologia || undefined
    }).then((r) => {
      if (!cancelado) setResultados(r);
    });
    return () => {
      cancelado = true;
    };
  }, [summary, query, tipo, tecnologia]);

  if (!summary) return null;

  if (!summary.instalado) {
    return (
      <>
        <header className="hero">
          <h1>{t("search.title")}</h1>
          <p>{t("packs.status.none.title")}</p>
        </header>
        <section className="card">
          <p className="status">{t("packs.status.none.desc")}</p>
        </section>
      </>
    );
  }

  return (
    <>
      <header className="hero">
        <h1>{t("search.title")}</h1>
      </header>
      <section className="card">
        <label className="field" htmlFor="content-search">
          {t("search.placeholder")}
        </label>
        <input
          id="content-search"
          type="search"
          value={query}
          placeholder={t("search.placeholder")}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="format-row">
          <label className="field" htmlFor="filter-type">
            {t("search.filter.type")}
          </label>
          <select id="filter-type" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">{t("search.filter.all")}</option>
            {TODOS_LOS_TIPOS.map((k) => (
              <option key={k} value={k}>
                {etiquetaTipo(k)}
              </option>
            ))}
          </select>
        </div>
        {tecnologias.length > 0 && (
          <div className="format-row">
            <label className="field" htmlFor="filter-tech">
              {t("search.filter.tech")}
            </label>
            <select id="filter-tech" value={tecnologia} onChange={(e) => setTecnologia(e.target.value)}>
              <option value="">{t("search.filter.all")}</option>
              {tecnologias.map((tec) => (
                <option key={tec} value={tec}>
                  {tec}
                </option>
              ))}
            </select>
          </div>
        )}

        {resultados.length === 0 ? (
          <div>
            <h2>{t("search.empty.title")}</h2>
            <p className="status">{t("search.empty.desc")}</p>
          </div>
        ) : (
          <div>
            <h2>{t("search.results", { total: resultados.length })}</h2>
            {resultados.map((item) => {
              const sr = item.source_ref ?? null;
              return (
                <div className="module" key={String(item.id)}>
                  <strong>{campoTexto(item, ["nombre", "enunciado", "titulo", "programa", "descripcion"])}</strong>
                  <p className="status">{item.id}</p>
                  <p className="status">{typeof item.tipo === "string" ? etiquetaTipo(item.tipo) : ""}</p>
                  <button
                    type="button"
                    className="primary"
                    aria-expanded={fuente === item.id}
                    onClick={() => setFuente(fuente === item.id ? null : item.id ?? null)}
                  >
                    {t("search.item.source")}
                  </button>
                  {fuente === item.id && sr && (
                    <div>
                      <p className="status">{sr.documento ?? ""}</p>
                      <p className="status">{sr.codigo_oficial ?? ""}</p>
                      <p className="status">{`${t("search.item.revision")}: ${sr.revision ?? ""}`}</p>
                      <p className="status">{`${t("search.type.pagina")}: ${sr.pagina ?? ""}`}</p>
                      <p className="status">{sr.cita_textual ?? ""}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

/** Tarjeta de Ajustes: estado del contenido instalado y acciones. */
export function ContentCard() {
  const { t, i18n } = useTranslation();
  const [summary, setSummary] = useState<Resumen | null>(null);
  const [mensaje, setMensaje] = useState<{ key: string; arg?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refrescar = useCallback(() => {
    void getPackSummary().then(setSummary);
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  if (!summary) return null;

  const instalarDemo = async () => {
    const estabaInstalado = summary.instalado;
    const r = await installDemoPack();
    if (r.ok) {
      setMensaje({
        key:
          r.motivo === "ya-instalado"
            ? "packs.installedOk"
            : estabaInstalado
              ? "packs.updatedOk"
              : "packs.installedOk"
      });
    } else {
      setMensaje({ key: errorKey(r.codigo) });
    }
    refrescar();
  };

  const exportar = async () => {
    const { filename, texto } = await exportBackupFile();
    const blob = new Blob([texto], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setMensaje({ key: "packs.exported", arg: filename });
    refrescar();
  };

  const restaurar = async (file: File) => {
    const texto = await file.text();
    const r = await importBackupFile(texto);
    if (r.ok) {
      setMensaje({ key: "packs.imported" });
    } else {
      setMensaje({ key: errorKey(r.codigo) });
    }
    refrescar();
  };

  const limpiar = async () => {
    await clearContent();
    setMensaje({ key: "packs.removed" });
    refrescar();
  };

  return (
    <section className="card">
      <h2>{t("settings.content.title")}</h2>
      <p className="status">{t("settings.content.note")}</p>

      {!summary.instalado ? (
        <div>
          <h3>{t("packs.status.none.title")}</h3>
          <p className="status">{t("packs.status.none.desc")}</p>
        </div>
      ) : (
        <div>
          <h3>{t("packs.status.installed")}</h3>
          <div className="format-row">
            <span>{t("packs.version")}</span>
            <span>{summary.packVersion}</span>
          </div>
          <div className="format-row">
            <span>{t("packs.items")}</span>
            <span>{formatInteger(summary.itemsTotal, i18n.language)}</span>
          </div>
          <div className="format-row">
            <span>{t("packs.size")}</span>
            <span>{t("packs.sizeValue", { total: formatInteger(Math.max(1, Math.round(summary.tamanoBytes / 1024)), i18n.language) })}</span>
          </div>
          <div className="format-row">
            <span>{t("packs.updated")}</span>
            <span>{summary.updatedAt}</span>
          </div>
        </div>
      )}

      {mensaje && (
        <p className="status">
          {mensaje.arg !== undefined ? t(mensaje.key, { name: mensaje.arg }) : t(mensaje.key, {})}
        </p>
      )}

      {!summary.instalado && (
        <div>
          <button type="button" className="primary" onClick={() => void instalarDemo()}>
            {t("packs.installDemo")}
          </button>
          <p className="status">{t("packs.installDemoNote")}</p>
        </div>
      )}
      <button type="button" className="primary" onClick={() => void exportar()}>
        {t("packs.export")}
      </button>
      <button type="button" className="primary" onClick={() => fileRef.current?.click()}>
        {t("packs.restore")}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        aria-label={t("packs.restore")}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void restaurar(file);
          e.target.value = "";
        }}
      />
      {summary.instalado && (
        <div>
          <button type="button" className="primary" onClick={() => void limpiar()}>
            {t("packs.clear")}
          </button>
          <p className="status">{t("packs.clearConfirm")}</p>
        </div>
      )}
    </section>
  );
}
