// F&V (by Factronics) — PWA walking skeleton (Fase 0)
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getProfile, saveProfile, type Profile } from "./db";
import { applyTheme, type ThemeMode } from "./theme";

type Tab = "home" | "profile" | "settings" | "about";

export default function App() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>("home");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    void getProfile().then((p) => {
      setProfile(p);
      setTheme(p.theme as ThemeMode);
      applyTheme(p.theme as ThemeMode);
      void i18n.changeLanguage(p.language);
    });
  }, [i18n]);

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    await saveProfile({ language: lang });
  };

  const changeTheme = async (mode: ThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
    await saveProfile({ theme: mode });
  };

  return (
    <div className="app">
      {tab === "home" && <Home />}
      {tab === "profile" && (
        <ProfileTab
          profile={profile}
          savedMsg={savedMsg}
          onSave={async (name) => {
            const next = await saveProfile({ name });
            setProfile(next);
            setSavedMsg(true);
            setTimeout(() => setSavedMsg(false), 2500);
          }}
        />
      )}
      {tab === "settings" && (
        <SettingsTab
          theme={theme}
          onTheme={changeTheme}
          onLanguage={changeLanguage}
          language={i18n.language}
        />
      )}
      {tab === "about" && <About />}

      <nav className="nav" aria-label={t("app.name")}>
        {(["home", "profile", "settings", "about"] as Tab[]).map((id) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
          >
            {t(`nav.${id}`)}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Home() {
  const { t } = useTranslation();
  const modules = [
    "home.module.study",
    "home.module.calc",
    "home.module.parts",
    "home.module.reports",
    "home.module.3d",
    "home.module.certs"
  ];
  return (
    <>
      <header className="hero">
        <h1>{t("home.greeting")}</h1>
        <p>{t("home.subtitle")}</p>
        <span className="badge">
          {t("home.phase")} — {t("home.phaseDone")}
        </span>
        <svg className="pulse" width="180" height="90" viewBox="0 0 180 90" aria-hidden="true">
          <path
            d="M0 55 H40 L55 20 L75 78 L92 55 H180"
            fill="none"
            stroke="#F2A900"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </header>

      <section className="card">
        <h2>{t("home.modules")}</h2>
        {modules.map((m) => (
          <div className="module" key={m} style={{ padding: "10px 0" }}>
            <span>{t(m)}</span>
            <span className="chip">{t("home.comingSoon")}</span>
          </div>
        ))}
      </section>

      <p className="status">
        ● {t("home.offlineReady")} · {t("home.demoBadge")}
      </p>
    </>
  );
}

function ProfileTab({
  profile,
  savedMsg,
  onSave
}: {
  profile: Profile | null;
  savedMsg: boolean;
  onSave: (name: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(profile?.name ?? "");

  useEffect(() => {
    if (profile) setName(profile.name);
  }, [profile]);

  return (
    <>
      <header className="hero">
        <h1>{t("profile.title")}</h1>
      </header>

      <section className="card">
        <div className="stats">
          <div className="stat">
            <b>1</b>
            {t("profile.level")}
          </div>
          <div className="stat">
            <b>0</b>
            {t("profile.medals")}
          </div>
          <div className="stat">
            <b>0</b>
            {t("profile.streak")}
          </div>
        </div>
      </section>

      <section className="card">
        <label className="field" htmlFor="profile-name">
          {t("profile.nameLabel")}
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div style={{ marginTop: 12 }}>
          <button className="primary" onClick={() => void onSave(name)}>
            {t("profile.save")}
          </button>
        </div>
        {savedMsg && <p className="status">✓ {t("profile.saved")}</p>}
      </section>

      <p className="status">{t("profile.demoNote")}</p>
    </>
  );
}

function SettingsTab({
  theme,
  onTheme,
  onLanguage,
  language
}: {
  theme: ThemeMode;
  onTheme: (m: ThemeMode) => void;
  onLanguage: (l: string) => void;
  language: string;
}) {
  const { t } = useTranslation();
  return (
    <>
      <header className="hero">
        <h1>{t("settings.title")}</h1>
      </header>

      <section className="card">
        <h2>{t("settings.language")}</h2>
        <div className="radio-row">
          <label>
            <input
              type="radio"
              name="lang"
              checked={language.startsWith("es")}
              onChange={() => onLanguage("es")}
            />
            Español (VE)
          </label>
          <label>
            <input
              type="radio"
              name="lang"
              checked={language.startsWith("en")}
              onChange={() => onLanguage("en")}
            />
            English
          </label>
        </div>
      </section>

      <section className="card">
        <h2>{t("settings.theme")}</h2>
        <div className="radio-row">
          {(["system", "light", "dark"] as ThemeMode[]).map((m) => (
            <label key={m}>
              <input
                type="radio"
                name="theme"
                checked={theme === m}
                onChange={() => onTheme(m)}
              />
              {t(`settings.theme.${m}`)}
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>{t("settings.data")}</h2>
        <p className="status">{t("settings.dataNote")}</p>
      </section>
    </>
  );
}

function About() {
  const { t } = useTranslation();
  return (
    <>
      <header className="hero">
        <h1>{t("about.title")}</h1>
      </header>

      <section className="card">
        <p>{t("about.desc")}</p>
        <p className="disclaimer">{t("about.disclaimer")}</p>
      </section>

      <section className="card">
        <h2>{t("about.version")}</h2>
        <p className="status">F&V 0.1.0 — Fase 0 · walking skeleton</p>
        <h2>{t("about.team")}</h2>
        <p className="status">
          Eduardo Rodríguez · Luis Iungano · José Tovar · José Gabriel Ríos · Elián
          Inojosa · Mariana Cerdeño
        </p>
        <h2>{t("about.sources")}</h2>
        <p className="status">factronics.com.ve · videojet.com</p>
        <p className="status">{t("about.privacy")}</p>
      </section>
    </>
  );
}
