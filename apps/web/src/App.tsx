// F&V (by Factronics) — PWA (F1.2: 11 idiomas reales + latín/pseudo-local).
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ABOUT_SOURCES_VALUE, ABOUT_TEAM_NAMES, APP_VERSION } from "./constants";
import { getProfile, saveProfile, type Profile } from "./db";
import {
  formatDate,
  formatInteger,
  formatNumber,
  formatPercent,
  SAMPLE_DATE,
  SAMPLE_NUMBER,
  SAMPLE_PERCENT
} from "./format";
import {
  setSpecialLocalesUnlocked,
  specialLocalesUnlocked as readSpecialLocalesUnlocked
} from "./i18n";
import { ALL_LOCALES, REAL_LOCALES } from "./supported-locales";
import { applyTheme, type ThemeMode } from "./theme";

type Tab = "home" | "profile" | "settings" | "about";

export default function App() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>("home");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [savedMsg, setSavedMsg] = useState(false);
  const [specialUnlocked, setSpecialUnlocked] = useState(() => readSpecialLocalesUnlocked());

  useEffect(() => {
    void getProfile().then((p) => {
      setProfile(p);
      setTheme(p.theme as ThemeMode);
      applyTheme(p.theme as ThemeMode);
      if (p.language !== i18n.language) {
        void saveProfile({ language: i18n.language }).then(setProfile);
      }
    });
  }, [i18n]);

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    const next = await saveProfile({ language: lang });
    setProfile(next);
  };

  const changeTheme = async (mode: ThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
    await saveProfile({ theme: mode });
  };

  const unlockSpecial = () => {
    setSpecialLocalesUnlocked(true);
    setSpecialUnlocked(true);
  };

  return (
    <div className="app">
      {tab === "home" && <Home />}
      {tab === "profile" && (
        <ProfileTab
          profile={profile}
          savedMsg={savedMsg}
          language={i18n.language}
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
          specialUnlocked={specialUnlocked}
        />
      )}
      {tab === "about" && <About specialUnlocked={specialUnlocked} onUnlock={unlockSpecial} />}

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
  language,
  onSave
}: {
  profile: Profile | null;
  savedMsg: boolean;
  language: string;
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
            <b>{formatInteger(1, language)}</b>
            {t("profile.level")}
          </div>
          <div className="stat">
            <b>{formatInteger(0, language)}</b>
            {t("profile.medals")}
          </div>
          <div className="stat">
            <b>{t("profile.streakValue", { days: formatInteger(0, language) })}</b>
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
  language,
  specialUnlocked
}: {
  theme: ThemeMode;
  onTheme: (m: ThemeMode) => void;
  onLanguage: (l: string) => void;
  language: string;
  specialUnlocked: boolean;
}) {
  const { t } = useTranslation();
  const locales = specialUnlocked ? ALL_LOCALES : REAL_LOCALES;
  return (
    <>
      <header className="hero">
        <h1>{t("settings.title")}</h1>
      </header>

      <section className="card">
        <h2 id="language-heading">{t("settings.language")}</h2>
        <p className="status">{t("settings.languageNote")}</p>
        <div className="locale-list" role="radiogroup" aria-labelledby="language-heading">
          {locales.map((locale) => (
            <label key={locale.tag} className="locale-option">
              <input
                type="radio"
                name="lang"
                checked={language === locale.tag}
                onChange={() => onLanguage(locale.tag)}
              />
              <span>{locale.label}</span>
            </label>
          ))}
        </div>
        {specialUnlocked && <p className="status">{t("settings.specialUnlocked")}</p>}
      </section>

      <section className="card">
        <h2>{t("settings.formats")}</h2>
        <div className="format-row">
          <span>{t("settings.formats.number")}</span>
          <strong>{formatNumber(SAMPLE_NUMBER, language)}</strong>
        </div>
        <div className="format-row">
          <span>{t("settings.formats.percent")}</span>
          <strong>{formatPercent(SAMPLE_PERCENT, language)}</strong>
        </div>
        <div className="format-row">
          <span>{t("settings.formats.date")}</span>
          <strong>{formatDate(SAMPLE_DATE, language)}</strong>
        </div>
        <p className="status">{t("settings.formats.note")}</p>
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

function About({
  specialUnlocked,
  onUnlock
}: {
  specialUnlocked: boolean;
  onUnlock: () => void;
}) {
  const { t } = useTranslation();
  const [taps, setTaps] = useState(0);

  const handleVersionTap = () => {
    const next = taps + 1;
    if (next >= 7) {
      onUnlock();
      setTaps(0);
      return;
    }
    setTaps(next);
  };

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
        <button type="button" className="version-link" onClick={handleVersionTap}>
          {t("about.versionValue", { version: APP_VERSION })}
        </button>
        {taps >= 5 && <p className="status">{t("about.unlockAlmost")}</p>}
        {specialUnlocked && <p className="status">{t("settings.specialUnlocked")}</p>}
        <h2>{t("about.team")}</h2>
        <p className="status">{ABOUT_TEAM_NAMES}</p>
        <h2>{t("about.sources")}</h2>
        <p className="status">{ABOUT_SOURCES_VALUE}</p>
        <p className="status">{t("about.licenses")}</p>
        <p className="status">{t("about.privacy")}</p>
        <p className="status">{t("about.translationsPending")}</p>
      </section>
    </>
  );
}
