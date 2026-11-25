// F&V (by Factronics) — ilustraciones vectoriales de festividades (F1.3).
// Dibujos propios y simples, sin material de Videojet/Factronics. Decorativos.
import type { FestivityId } from "./festivities";

export function FestivityArt({ id }: { id: FestivityId }) {
  if (id === "none") return null;

  const common = {
    className: "festivity-art",
    viewBox: "0 0 120 120",
    "aria-hidden": true as const,
    focusable: "false" as const
  };

  switch (id) {
    case "christmas":
      return (
        <svg {...common}>
          <g stroke="var(--fv-accent)" strokeWidth="5" strokeLinecap="round">
            <path d="M30 20v28M20 34h20M16 27l8 14M44 27l-8 14" />
            <path d="M86 18v24M74 30h24M70 23l8 12M98 23l-8 12" />
          </g>
          <circle cx="58" cy="78" r="24" fill="var(--fv-accent)" opacity="0.9" />
          <path d="M58 54v8M46 62l8 8M70 62l-8 8" stroke="var(--fv-on-accent)" strokeWidth="4" />
          <circle cx="24" cy="86" r="6" fill="var(--fv-accent-soft)" />
          <circle cx="96" cy="82" r="8" fill="var(--fv-accent-soft)" />
        </svg>
      );
    case "epiphany":
      return (
        <svg {...common}>
          <path d="M60 12l8 20 22 2-17 14 5 22-18-12-18 12 5-22-17-14 22-2z" fill="var(--fv-accent)" />
          <circle cx="22" cy="88" r="5" fill="var(--fv-accent)" />
          <circle cx="94" cy="92" r="7" fill="var(--fv-accent)" />
          <circle cx="72" cy="30" r="4" fill="var(--fv-accent-soft)" />
        </svg>
      );
    case "valentine":
    case "mothersDay":
      return (
        <svg {...common}>
          <path
            d="M60 98C34 78 18 64 18 45c0-14 11-24 24-24 9 0 15 5 18 11 3-6 9-11 18-11 13 0 24 10 24 24 0 19-16 33-42 53z"
            fill="var(--fv-accent)"
          />
          <path d="M88 22l4 9 10 1-8 6 2 10-8-5-8 5 2-10-8-6 10-1z" fill="var(--fv-accent-soft)" />
        </svg>
      );
    case "fathersDay":
      return (
        <svg {...common}>
          <path d="M60 16l10 22 24 3-18 16 5 24-21-12-21 12 5-24-18-16 24-3z" fill="var(--fv-accent)" />
          <circle cx="24" cy="94" r="6" fill="var(--fv-accent-soft)" />
          <circle cx="98" cy="88" r="8" fill="var(--fv-accent-soft)" />
        </svg>
      );
    case "childrensDay":
    case "carnival":
      return (
        <svg {...common}>
          <circle cx="30" cy="30" r="10" fill="var(--fv-accent)" />
          <circle cx="82" cy="24" r="7" fill="var(--fv-accent-soft)" />
          <rect x="52" y="44" width="18" height="18" rx="4" fill="var(--fv-accent-soft)" transform="rotate(18 61 53)" />
          <circle cx="88" cy="70" r="12" fill="var(--fv-accent)" />
          <circle cx="36" cy="82" r="7" fill="var(--fv-accent)" />
          <path d="M12 54l14 6M96 96l10-8" stroke="var(--fv-accent)" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "halloween":
      return (
        <svg {...common}>
          <ellipse cx="60" cy="64" rx="38" ry="32" fill="var(--fv-accent)" />
          <rect x="56" y="26" width="8" height="14" rx="3" fill="var(--fv-accent-soft)" />
          <path d="M44 58l10 6M76 58l-10 6M42 76c10 8 26 8 36 0" stroke="var(--fv-on-accent)" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M16 30l8 10M104 38l-8 10" stroke="var(--fv-accent)" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "independence":
      return (
        <svg {...common}>
          <rect x="20" y="26" width="80" height="14" rx="3" fill="var(--fv-accent)" />
          <rect x="20" y="44" width="80" height="14" rx="3" fill="#10314F" />
          <rect x="20" y="62" width="80" height="14" rx="3" fill="#B3261E" />
          <path d="M60 40l4 10 10 1-8 6 2 10-8-5-8 5 2-10-8-6 10-1z" fill="var(--fv-accent-soft)" />
          <circle cx="26" cy="94" r="5" fill="var(--fv-accent)" />
          <circle cx="94" cy="94" r="5" fill="var(--fv-accent)" />
        </svg>
      );
    default:
      return null;
  }
}
