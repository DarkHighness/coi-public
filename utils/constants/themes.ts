import { ThemeConfig, StoryThemeConfig } from "../../types";

// Visual/Atmospheric Themes (Dynamic)
export const CATEGORY_KEYS = [
  "all",
  "ancient",
  "modern",
  "fantasy",
  "suspense",
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const ENV_THEMES: Record<string, ThemeConfig> = {
  // Standard Fantasy / Mystic
  fantasy: {
    vars: {
      "--theme-bg": "#020617",
      "--theme-surface": "#0f172a",
      "--theme-surface-highlight": "#1e293b",
      "--theme-border": "#334155",
      "--theme-primary": "#f59e0b",
      "--theme-primary-hover": "#d97706",
      "--theme-text": "#e2e8f0",
      "--theme-muted": "#94a3b8",
    },
    dayVars: {
      "--theme-bg": "#f8fafc",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#f1f5f9",
      "--theme-border": "#cbd5e1",
      "--theme-primary": "#d97706",
      "--theme-primary-hover": "#b45309",
      "--theme-text": "#0f172a",
      "--theme-muted": "#64748b",
    },
    fontClass: "font-fantasy",
  },
  // Sci-Fi / Tech
  scifi: {
    vars: {
      "--theme-bg": "#000000",
      "--theme-surface": "#09090b",
      "--theme-surface-highlight": "#18181b",
      "--theme-border": "#27272a",
      "--theme-primary": "#06b6d4",
      "--theme-primary-hover": "#0891b2",
      "--theme-text": "#e4e4e7",
      "--theme-muted": "#a1a1aa",
    },
    dayVars: {
      "--theme-bg": "#f0f9ff",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#e0f2fe",
      "--theme-border": "#bae6fd",
      "--theme-primary": "#0891b2",
      "--theme-primary-hover": "#0e7490",
      "--theme-text": "#0c4a6e",
      "--theme-muted": "#0369a1",
    },
    fontClass: "font-scifi",
  },
  // Cyberpunk / Neon
  cyberpunk: {
    vars: {
      "--theme-bg": "#1a0b2e",
      "--theme-surface": "#2e1065",
      "--theme-surface-highlight": "#4c1d95",
      "--theme-border": "#701a75",
      "--theme-primary": "#d946ef",
      "--theme-primary-hover": "#c026d3",
      "--theme-text": "#fdf4ff",
      "--theme-muted": "#e879f9",
    },
    dayVars: {
      "--theme-bg": "#fdf4ff",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#fae8ff",
      "--theme-border": "#f0abfc",
      "--theme-primary": "#c026d3",
      "--theme-primary-hover": "#a21caf",
      "--theme-text": "#4a044e",
      "--theme-muted": "#86198f",
    },
    fontClass: "font-cyberpunk",
  },
  // Horror / Dark
  horror: {
    vars: {
      "--theme-bg": "#1c1917",
      "--theme-surface": "#292524",
      "--theme-surface-highlight": "#44403c",
      "--theme-border": "#7f1d1d",
      "--theme-primary": "#ef4444",
      "--theme-primary-hover": "#dc2626",
      "--theme-text": "#e7e5e4",
      "--theme-muted": "#a8a29e",
    },
    dayVars: {
      "--theme-bg": "#fff1f2",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#ffe4e6",
      "--theme-border": "#fecdd3",
      "--theme-primary": "#dc2626",
      "--theme-primary-hover": "#b91c1c",
      "--theme-text": "#450a0a",
      "--theme-muted": "#9f1239",
    },
    fontClass: "font-horror",
  },
  // Mystery / Noir
  mystery: {
    vars: {
      "--theme-bg": "#0a0a0a",
      "--theme-surface": "#171717",
      "--theme-surface-highlight": "#262626",
      "--theme-border": "#404040",
      "--theme-primary": "#fbbf24",
      "--theme-primary-hover": "#f59e0b",
      "--theme-text": "#d4d4d4",
      "--theme-muted": "#737373",
    },
    dayVars: {
      "--theme-bg": "#fafafa",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#f5f5f5",
      "--theme-border": "#d4d4d4",
      "--theme-primary": "#d97706",
      "--theme-primary-hover": "#b45309",
      "--theme-text": "#171717",
      "--theme-muted": "#525252",
    },
    fontClass: "font-serif",
  },
  // Romance / Pink
  romance: {
    vars: {
      "--theme-bg": "#1a1018",
      "--theme-surface": "#291521",
      "--theme-surface-highlight": "#451e30",
      "--theme-border": "#831843",
      "--theme-primary": "#f472b6",
      "--theme-primary-hover": "#ec4899",
      "--theme-text": "#fce7f3",
      "--theme-muted": "#db2777",
    },
    dayVars: {
      "--theme-bg": "#fff1f2",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#ffe4e6",
      "--theme-border": "#fbcfe8",
      "--theme-primary": "#db2777",
      "--theme-primary-hover": "#be185d",
      "--theme-text": "#831843",
      "--theme-muted": "#9d174d",
    },
    fontClass: "font-sans",
  },
  // Palace / Royal
  royal: {
    vars: {
      "--theme-bg": "#220505",
      "--theme-surface": "#450a0a",
      "--theme-surface-highlight": "#600f0f",
      "--theme-border": "#b45309",
      "--theme-primary": "#fbbf24",
      "--theme-primary-hover": "#d97706",
      "--theme-text": "#fffbeb",
      "--theme-muted": "#92400e",
    },
    dayVars: {
      "--theme-bg": "#fffbeb",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#fef3c7",
      "--theme-border": "#fde68a",
      "--theme-primary": "#d97706",
      "--theme-primary-hover": "#b45309",
      "--theme-text": "#451a03",
      "--theme-muted": "#92400e",
    },
    fontClass: "font-fantasy",
  },
  // Wuxia / Ink
  wuxia: {
    vars: {
      "--theme-bg": "#1c1c1c",
      "--theme-surface": "#2a2a2a",
      "--theme-surface-highlight": "#3d3d3d",
      "--theme-border": "#525252",
      "--theme-primary": "#ef4444",
      "--theme-primary-hover": "#b91c1c",
      "--theme-text": "#f5f5f4",
      "--theme-muted": "#a8a29e",
    },
    dayVars: {
      "--theme-bg": "#f5f5f4",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#e7e5e4",
      "--theme-border": "#d6d3d1",
      "--theme-primary": "#b91c1c",
      "--theme-primary-hover": "#991b1b",
      "--theme-text": "#1c1917",
      "--theme-muted": "#57534e",
    },
    fontClass: "font-serif",
  },
  // Demonic / Dark Red
  demonic: {
    vars: {
      "--theme-bg": "#0f0505", // Very dark red/black
      "--theme-surface": "#1a0a0a",
      "--theme-surface-highlight": "#2b1111",
      "--theme-border": "#7f1d1d", // Dark red
      "--theme-primary": "#ef4444", // Red
      "--theme-primary-hover": "#dc2626",
      "--theme-text": "#fef2f2",
      "--theme-muted": "#991b1b",
    },
    dayVars: {
      "--theme-bg": "#fef2f2",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#fee2e2",
      "--theme-border": "#fecaca",
      "--theme-primary": "#dc2626",
      "--theme-primary-hover": "#b91c1c",
      "--theme-text": "#450a0a",
      "--theme-muted": "#991b1b",
    },
    fontClass: "font-serif",
  },
  // Xianxia / Ethereal Blue
  ethereal: {
    vars: {
      "--theme-bg": "#0f1c2e",
      "--theme-surface": "#1e293b",
      "--theme-surface-highlight": "#334155",
      "--theme-border": "#64748b",
      "--theme-primary": "#38bdf8",
      "--theme-primary-hover": "#0284c7",
      "--theme-text": "#f0f9ff",
      "--theme-muted": "#94a3b8",
    },
    dayVars: {
      "--theme-bg": "#f0f9ff",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#e0f2fe",
      "--theme-border": "#bae6fd",
      "--theme-primary": "#0284c7",
      "--theme-primary-hover": "#0369a1",
      "--theme-text": "#0c4a6e",
      "--theme-muted": "#075985",
    },
    fontClass: "font-serif",
  },
  // CEO / Modern Dark
  modern: {
    vars: {
      "--theme-bg": "#111827",
      "--theme-surface": "#1f2937",
      "--theme-surface-highlight": "#374151",
      "--theme-border": "#4b5563",
      "--theme-primary": "#6366f1",
      "--theme-primary-hover": "#4f46e5",
      "--theme-text": "#f9fafb",
      "--theme-muted": "#9ca3af",
    },
    dayVars: {
      "--theme-bg": "#f9fafb",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#f3f4f6",
      "--theme-border": "#d1d5db",
      "--theme-primary": "#4f46e5",
      "--theme-primary-hover": "#4338ca",
      "--theme-text": "#111827",
      "--theme-muted": "#6b7280",
    },
    fontClass: "font-sans",
  },
  // Gold / Opulent
  gold: {
    vars: {
      "--theme-bg": "#000000",
      "--theme-surface": "#1a1a1a",
      "--theme-surface-highlight": "#333333",
      "--theme-border": "#ffd700", // Gold border
      "--theme-primary": "#ffd700", // Gold primary
      "--theme-primary-hover": "#e6c200",
      "--theme-text": "#ffffff",
      "--theme-muted": "#bfbfbf",
    },
    dayVars: {
      "--theme-bg": "#ffffff",
      "--theme-surface": "#fefce8",
      "--theme-surface-highlight": "#fef9c3",
      "--theme-border": "#eab308",
      "--theme-primary": "#eab308",
      "--theme-primary-hover": "#ca8a04",
      "--theme-text": "#000000",
      "--theme-muted": "#854d0e",
    },
    fontClass: "font-serif",
  },
  // Villain / Purple
  villain: {
    vars: {
      "--theme-bg": "#0f0505",
      "--theme-surface": "#2b0b0b",
      "--theme-surface-highlight": "#4a1414",
      "--theme-border": "#7f1d1d",
      "--theme-primary": "#9333ea", // Dark Purple (Villainous)
      "--theme-primary-hover": "#7e22ce",
      "--theme-text": "#f3e8ff",
      "--theme-muted": "#a855f7",
    },
    dayVars: {
      "--theme-bg": "#faf5ff",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#f3e8ff",
      "--theme-border": "#d8b4fe",
      "--theme-primary": "#9333ea",
      "--theme-primary-hover": "#7e22ce",
      "--theme-text": "#3b0764",
      "--theme-muted": "#7e22ce",
    },
    fontClass: "font-fantasy",
  },
  // Period / Sepia
  sepia: {
    vars: {
      "--theme-bg": "#2c241b", // Dark Sepia/Brown
      "--theme-surface": "#433629",
      "--theme-surface-highlight": "#5c4d3c",
      "--theme-border": "#a18e72",
      "--theme-primary": "#d4c4a8", // Parchment/Paper
      "--theme-primary-hover": "#e3d5bc",
      "--theme-text": "#f5f0e6",
      "--theme-muted": "#a89f91",
    },
    dayVars: {
      "--theme-bg": "#f5f5f4",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#e7e5e4",
      "--theme-border": "#d6d3d1",
      "--theme-primary": "#a18e72",
      "--theme-primary-hover": "#8c7b62",
      "--theme-text": "#292524",
      "--theme-muted": "#78716c",
    },
    fontClass: "font-serif",
  },
  // Female Growth / Rose
  rose: {
    vars: {
      "--theme-bg": "#1a0505",
      "--theme-surface": "#2b0a0a",
      "--theme-surface-highlight": "#4a1212",
      "--theme-border": "#9f1239",
      "--theme-primary": "#fb7185",
      "--theme-primary-hover": "#f43f5e",
      "--theme-text": "#fff1f2",
      "--theme-muted": "#fda4af",
    },
    dayVars: {
      "--theme-bg": "#fff1f2",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#ffe4e6",
      "--theme-border": "#fda4af",
      "--theme-primary": "#e11d48",
      "--theme-primary-hover": "#be123c",
      "--theme-text": "#881337",
      "--theme-muted": "#be123c",
    },
    fontClass: "font-serif",
  },
  // War / Blood
  war: {
    vars: {
      "--theme-bg": "#0a0a0a",
      "--theme-surface": "#171717",
      "--theme-surface-highlight": "#262626",
      "--theme-border": "#b91c1c",
      "--theme-primary": "#ef4444",
      "--theme-primary-hover": "#dc2626",
      "--theme-text": "#f5f5f5",
      "--theme-muted": "#737373",
    },
    dayVars: {
      "--theme-bg": "#fef2f2",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#fee2e2",
      "--theme-border": "#fca5a5",
      "--theme-primary": "#ef4444",
      "--theme-primary-hover": "#dc2626",
      "--theme-text": "#450a0a",
      "--theme-muted": "#991b1b",
    },
    fontClass: "font-fantasy",
  },
  // Ancient Romance / Orange
  sunset: {
    vars: {
      "--theme-bg": "#1c1917",
      "--theme-surface": "#292524",
      "--theme-surface-highlight": "#44403c",
      "--theme-border": "#d6d3d1",
      "--theme-primary": "#fdba74",
      "--theme-primary-hover": "#fb923c",
      "--theme-text": "#fafaf9",
      "--theme-muted": "#a8a29e",
    },
    dayVars: {
      "--theme-bg": "#fff7ed",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#ffedd5",
      "--theme-border": "#fed7aa",
      "--theme-primary": "#f97316",
      "--theme-primary-hover": "#ea580c",
      "--theme-text": "#431407",
      "--theme-muted": "#9a3412",
    },
    fontClass: "font-serif",
  },
  // Angst / Cold Blue
  cold: {
    vars: {
      "--theme-bg": "#0f172a",
      "--theme-surface": "#1e293b",
      "--theme-surface-highlight": "#334155",
      "--theme-border": "#94a3b8",
      "--theme-primary": "#38bdf8", // Cold Blue
      "--theme-primary-hover": "#0ea5e9",
      "--theme-text": "#f1f5f9",
      "--theme-muted": "#64748b",
    },
    dayVars: {
      "--theme-bg": "#f0f9ff",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#e0f2fe",
      "--theme-border": "#7dd3fc",
      "--theme-primary": "#0ea5e9",
      "--theme-primary-hover": "#0284c7",
      "--theme-text": "#0c4a6e",
      "--theme-muted": "#0369a1",
    },
    fontClass: "font-serif",
  },
  // Reunion / Violet
  violet: {
    vars: {
      "--theme-bg": "#18181b",
      "--theme-surface": "#27272a",
      "--theme-surface-highlight": "#3f3f46",
      "--theme-border": "#a1a1aa",
      "--theme-primary": "#a78bfa",
      "--theme-primary-hover": "#8b5cf6",
      "--theme-text": "#f4f4f5",
      "--theme-muted": "#71717a",
    },
    dayVars: {
      "--theme-bg": "#f5f3ff",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#ede9fe",
      "--theme-border": "#c4b5fd",
      "--theme-primary": "#8b5cf6",
      "--theme-primary-hover": "#7c3aed",
      "--theme-text": "#4c1d95",
      "--theme-muted": "#6d28d9",
    },
    fontClass: "font-serif",
  },
  // Farming / Green
  nature: {
    vars: {
      "--theme-bg": "#14281d", // Dark Green
      "--theme-surface": "#1d3b2a",
      "--theme-surface-highlight": "#2d5740",
      "--theme-border": "#4ade80",
      "--theme-primary": "#86efac",
      "--theme-primary-hover": "#4ade80",
      "--theme-text": "#f0fdf4",
      "--theme-muted": "#86efac",
    },
    dayVars: {
      "--theme-bg": "#f0fdf4",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#dcfce7",
      "--theme-border": "#86efac",
      "--theme-primary": "#22c55e",
      "--theme-primary-hover": "#16a34a",
      "--theme-text": "#14532d",
      "--theme-muted": "#15803d",
    },
    fontClass: "font-sans",
  },
  // Republican / Art Deco
  artdeco: {
    vars: {
      "--theme-bg": "#1a1614",
      "--theme-surface": "#2b2420",
      "--theme-surface-highlight": "#423832",
      "--theme-border": "#d4af37", // Art Deco Gold
      "--theme-primary": "#14b8a6", // Teal
      "--theme-primary-hover": "#0d9488",
      "--theme-text": "#f5f5f4",
      "--theme-muted": "#a8a29e",
    },
    dayVars: {
      "--theme-bg": "#f5f5f4",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#e7e5e4",
      "--theme-border": "#d4af37",
      "--theme-primary": "#0d9488",
      "--theme-primary-hover": "#0f766e",
      "--theme-text": "#292524",
      "--theme-muted": "#57534e",
    },
    fontClass: "font-serif",
  },
  // Intrigue / Blood Red
  intrigue: {
    vars: {
      "--theme-bg": "#190808",
      "--theme-surface": "#360f0f",
      "--theme-surface-highlight": "#591c1c",
      "--theme-border": "#7f1d1d",
      "--theme-primary": "#f87171",
      "--theme-primary-hover": "#ef4444",
      "--theme-text": "#fef2f2",
      "--theme-muted": "#fca5a5",
    },
    dayVars: {
      "--theme-bg": "#fef2f2",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#fee2e2",
      "--theme-border": "#fca5a5",
      "--theme-primary": "#ef4444",
      "--theme-primary-hover": "#dc2626",
      "--theme-text": "#450a0a",
      "--theme-muted": "#991b1b",
    },
    fontClass: "font-serif",
  },
  // Survival / Rust
  wasteland: {
    vars: {
      "--theme-bg": "#1a120b",
      "--theme-surface": "#2e1f12",
      "--theme-surface-highlight": "#4a321d",
      "--theme-border": "#ea580c",
      "--theme-primary": "#f97316",
      "--theme-primary-hover": "#ea580c",
      "--theme-text": "#fff7ed",
      "--theme-muted": "#fdba74",
    },
    dayVars: {
      "--theme-bg": "#fff7ed",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#ffedd5",
      "--theme-border": "#fdba74",
      "--theme-primary": "#ea580c",
      "--theme-primary-hover": "#c2410c",
      "--theme-text": "#431407",
      "--theme-muted": "#9a3412",
    },
    fontClass: "font-scifi",
  },
  // Patriotism / Blue Gold
  patriotic: {
    vars: {
      "--theme-bg": "#1e1b4b", // Dark Blue
      "--theme-surface": "#312e81",
      "--theme-surface-highlight": "#4338ca",
      "--theme-border": "#ef4444", // Red accent
      "--theme-primary": "#fbbf24", // Gold
      "--theme-primary-hover": "#f59e0b",
      "--theme-text": "#eef2ff",
      "--theme-muted": "#a5b4fc",
    },
    dayVars: {
      "--theme-bg": "#eef2ff",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#e0e7ff",
      "--theme-border": "#ef4444",
      "--theme-primary": "#d97706",
      "--theme-primary-hover": "#b45309",
      "--theme-text": "#1e1b4b",
      "--theme-muted": "#4338ca",
    },
    fontClass: "font-serif",
  },
  // Son in Law / Cyan
  cyan: {
    vars: {
      "--theme-bg": "#111827",
      "--theme-surface": "#1f2937",
      "--theme-surface-highlight": "#374151",
      "--theme-border": "#6b7280",
      "--theme-primary": "#22d3ee",
      "--theme-primary-hover": "#06b6d4",
      "--theme-text": "#f9fafb",
      "--theme-muted": "#9ca3af",
    },
    dayVars: {
      "--theme-bg": "#f9fafb",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#f3f4f6",
      "--theme-border": "#9ca3af",
      "--theme-primary": "#06b6d4",
      "--theme-primary-hover": "#0891b2",
      "--theme-text": "#111827",
      "--theme-muted": "#4b5563",
    },
    fontClass: "font-sans",
  },
  // White Moonlight / Silver
  silver: {
    vars: {
      "--theme-bg": "#0f172a",
      "--theme-surface": "#1e293b",
      "--theme-surface-highlight": "#334155",
      "--theme-border": "#94a3b8",
      "--theme-primary": "#e2e8f0", // White/Silver
      "--theme-primary-hover": "#cbd5e1",
      "--theme-text": "#f8fafc",
      "--theme-muted": "#94a3b8",
    },
    dayVars: {
      "--theme-bg": "#f8fafc",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#f1f5f9",
      "--theme-border": "#cbd5e1",
      "--theme-primary": "#64748b",
      "--theme-primary-hover": "#475569",
      "--theme-text": "#0f172a",
      "--theme-muted": "#64748b",
    },
    fontClass: "font-serif",
  },
  // Yandere / Blood Red
  obsessive: {
    vars: {
      "--theme-bg": "#000000",
      "--theme-surface": "#1a0505",
      "--theme-surface-highlight": "#330a0a",
      "--theme-border": "#ff0000", // Bright Red
      "--theme-primary": "#ff0000",
      "--theme-primary-hover": "#cc0000",
      "--theme-text": "#ffe4e6",
      "--theme-muted": "#fda4af",
    },
    dayVars: {
      "--theme-bg": "#fff1f2",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#ffe4e6",
      "--theme-border": "#ff0000",
      "--theme-primary": "#dc2626",
      "--theme-primary-hover": "#b91c1c",
      "--theme-text": "#450a0a",
      "--theme-muted": "#991b1b",
    },
    fontClass: "font-horror",
  },
  // CS Student / Emerald
  emerald: {
    vars: {
      "--theme-bg": "#022c22", // teal-950
      "--theme-surface": "#064e3b", // emerald-900
      "--theme-surface-highlight": "#065f46", // emerald-800
      "--theme-border": "#059669", // emerald-600
      "--theme-primary": "#34d399", // emerald-400
      "--theme-primary-hover": "#10b981", // emerald-500
      "--theme-text": "#ecfdf5", // emerald-50
      "--theme-muted": "#6ee7b7", // emerald-300
    },
    dayVars: {
      "--theme-bg": "#ecfdf5",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#d1fae5",
      "--theme-border": "#34d399",
      "--theme-primary": "#059669",
      "--theme-primary-hover": "#047857",
      "--theme-text": "#064e3b",
      "--theme-muted": "#10b981",
    },
    fontClass: "font-sans",
  },
  // Infinite Flow / Danger
  danger: {
    vars: {
      "--theme-bg": "#09090b",
      "--theme-surface": "#18181b",
      "--theme-surface-highlight": "#27272a",
      "--theme-border": "#3f3f46",
      "--theme-primary": "#f43f5e", // Rose/Red for danger
      "--theme-primary-hover": "#e11d48",
      "--theme-text": "#e4e4e7",
      "--theme-muted": "#a1a1aa",
    },
    dayVars: {
      "--theme-bg": "#f4f4f5",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#e4e4e7",
      "--theme-border": "#d4d4d8",
      "--theme-primary": "#e11d48",
      "--theme-primary-hover": "#be123c",
      "--theme-text": "#18181b",
      "--theme-muted": "#71717a",
    },
    fontClass: "font-scifi",
  },
  // Entertainment / Glamour
  glamour: {
    vars: {
      "--theme-bg": "#1a1018",
      "--theme-surface": "#291521",
      "--theme-surface-highlight": "#451e30",
      "--theme-border": "#f472b6", // Pink
      "--theme-primary": "#fbbf24", // Gold
      "--theme-primary-hover": "#f59e0b",
      "--theme-text": "#fdf2f8",
      "--theme-muted": "#fbcfe8",
    },
    dayVars: {
      "--theme-bg": "#fdf2f8",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#fce7f3",
      "--theme-border": "#f472b6",
      "--theme-primary": "#d97706",
      "--theme-primary-hover": "#b45309",
      "--theme-text": "#831843",
      "--theme-muted": "#db2777",
    },
    fontClass: "font-sans",
  },
  // Esports / RGB
  rgb: {
    vars: {
      "--theme-bg": "#020617",
      "--theme-surface": "#0f172a",
      "--theme-surface-highlight": "#1e293b",
      "--theme-border": "#3b82f6", // Blue
      "--theme-primary": "#22c55e", // Green (RGB vibes)
      "--theme-primary-hover": "#16a34a",
      "--theme-text": "#f8fafc",
      "--theme-muted": "#94a3b8",
    },
    dayVars: {
      "--theme-bg": "#f8fafc",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#f1f5f9",
      "--theme-border": "#3b82f6",
      "--theme-primary": "#16a34a",
      "--theme-primary-hover": "#15803d",
      "--theme-text": "#0f172a",
      "--theme-muted": "#64748b",
    },
    fontClass: "font-sans",
  },
  // Rough Guy / Stone
  stone: {
    vars: {
      "--theme-bg": "#1c1917", // stone-900
      "--theme-surface": "#292524", // stone-800
      "--theme-surface-highlight": "#44403c", // stone-700
      "--theme-border": "#78716c", // stone-500
      "--theme-primary": "#d97706", // amber-600
      "--theme-primary-hover": "#b45309", // amber-700
      "--theme-text": "#f5f5f4", // stone-100
      "--theme-muted": "#a8a29e", // stone-400
    },
    dayVars: {
      "--theme-bg": "#f5f5f4",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#e7e5e4",
      "--theme-border": "#a8a29e",
      "--theme-primary": "#b45309",
      "--theme-primary-hover": "#92400e",
      "--theme-text": "#1c1917",
      "--theme-muted": "#78716c",
    },
    fontClass: "font-sans",
  },
  // Wife Chasing / Heartbreak
  heartbreak: {
    vars: {
      "--theme-bg": "#0f172a", // slate-900
      "--theme-surface": "#1e293b", // slate-800
      "--theme-surface-highlight": "#334155", // slate-700
      "--theme-border": "#94a3b8", // slate-400
      "--theme-primary": "#f43f5e", // rose-500 (Heartbreak/Love)
      "--theme-primary-hover": "#e11d48", // rose-600
      "--theme-text": "#f1f5f9", // slate-100
      "--theme-muted": "#64748b", // slate-500
    },
    dayVars: {
      "--theme-bg": "#f1f5f9",
      "--theme-surface": "#ffffff",
      "--theme-surface-highlight": "#e2e8f0",
      "--theme-border": "#f43f5e",
      "--theme-primary": "#e11d48",
      "--theme-primary-hover": "#be123c",
      "--theme-text": "#0f172a",
      "--theme-muted": "#64748b",
    },
    fontClass: "font-sans",
  },
};

// Story Themes (Static Genres)
export const THEMES: Record<string, StoryThemeConfig> = {
  fantasy: { defaultEnvTheme: "fantasy", icon: "🐉", categories: ["fantasy"] },
  scifi: { defaultEnvTheme: "scifi", icon: "🚀", categories: ["fantasy"] },
  cyberpunk: {
    defaultEnvTheme: "cyberpunk",
    icon: "🌃",
    categories: ["fantasy"],
  },
  horror: { defaultEnvTheme: "horror", icon: "👻", categories: ["suspense"] },
  mystery: { defaultEnvTheme: "mystery", icon: "🔍", categories: ["suspense"] },
  modern_romance: {
    defaultEnvTheme: "romance",
    icon: "❤️",
    categories: ["modern"],
  },
  palace_drama: {
    defaultEnvTheme: "royal",
    icon: "👑",
    categories: ["ancient"],
  },
  wuxia: { defaultEnvTheme: "wuxia", icon: "⚔️", categories: ["ancient"] },
  demonic_cultivation: {
    defaultEnvTheme: "demonic",
    icon: "😈",
    categories: ["ancient"],
  },
  xianxia: { defaultEnvTheme: "ethereal", icon: "✨", categories: ["ancient"] },
  infinite_flow: {
    defaultEnvTheme: "danger",
    icon: "♾️",
    categories: ["fantasy"],
  },
  entertainment: {
    defaultEnvTheme: "glamour",
    icon: "🎬",
    categories: ["modern"],
  },
  esports: { defaultEnvTheme: "rgb", icon: "🎮", categories: ["modern"] },
  ceo: { defaultEnvTheme: "modern", icon: "💼", categories: ["modern"] },
  long_aotian: {
    defaultEnvTheme: "gold",
    icon: "💪",
    categories: ["suspense"],
  },
  villain_op: {
    defaultEnvTheme: "villain",
    icon: "🦹",
    categories: ["suspense"],
  },
  period_drama: {
    defaultEnvTheme: "sepia",
    icon: "🎭",
    categories: ["ancient"],
  },
  female_growth: {
    defaultEnvTheme: "rose",
    icon: "🌸",
    categories: ["suspense"],
  },
  war_god: { defaultEnvTheme: "war", icon: "🛡️", categories: ["suspense"] },
  ancient_romance: {
    defaultEnvTheme: "sunset",
    icon: "💖",
    categories: ["ancient"],
  },
  love_after_marriage: {
    defaultEnvTheme: "romance",
    icon: "💍",
    categories: ["modern"],
  },
  angst: { defaultEnvTheme: "cold", icon: "💔", categories: ["suspense"] },
  reunion: { defaultEnvTheme: "violet", icon: "🤝", categories: ["modern"] },
  return_strong: {
    defaultEnvTheme: "war",
    icon: "🔥",
    categories: ["suspense"],
  },
  farming: { defaultEnvTheme: "nature", icon: "🌾", categories: ["fantasy"] },
  republican: {
    defaultEnvTheme: "artdeco",
    icon: "🎩",
    categories: ["ancient"],
  },
  intrigue: {
    defaultEnvTheme: "intrigue",
    icon: "🤫",
    categories: ["ancient"],
  },
  survival: {
    defaultEnvTheme: "wasteland",
    icon: "🏕️",
    categories: ["suspense"],
  },
  patriotism: {
    defaultEnvTheme: "patriotic",
    icon: "🇨🇳",
    categories: ["modern"],
  },
  son_in_law: { defaultEnvTheme: "cyan", icon: "👨‍👩‍👧", categories: ["modern"] },
  white_moonlight: {
    defaultEnvTheme: "silver",
    icon: "🌕",
    categories: ["modern"],
  },
  yandere: {
    defaultEnvTheme: "obsessive",
    icon: "🔪",
    categories: ["suspense"],
  },
  cs_student: {
    defaultEnvTheme: "emerald",
    icon: "💻",
    categories: ["modern"],
  },
  rough_guy: { defaultEnvTheme: "stone", icon: "👊", categories: ["modern"] },
  wife_chasing: {
    defaultEnvTheme: "heartbreak",
    icon: "🏃‍♀️",
    categories: ["modern"],
  },
  special_forces: {
    defaultEnvTheme: "war",
    icon: "🎖️",
    categories: ["modern"],
  },
  zombie: { defaultEnvTheme: "horror", icon: "🧟", categories: ["suspense"] },
  body_swap: { defaultEnvTheme: "modern", icon: "👯", categories: ["modern"] },
  industry_elite: {
    defaultEnvTheme: "modern",
    icon: "🏢",
    categories: ["modern"],
  },
  mutual_redemption: {
    defaultEnvTheme: "violet",
    icon: "💞",
    categories: ["modern"],
  },
  sweet_pet: { defaultEnvTheme: "romance", icon: "🍬", categories: ["modern"] },
  wild_youth: { defaultEnvTheme: "modern", icon: "🎸", categories: ["modern"] },
  rebirth_revenge: {
    defaultEnvTheme: "intrigue",
    icon: "🩸",
    categories: ["suspense", "modern"],
  },
  flash_marriage: {
    defaultEnvTheme: "romance",
    icon: "⚡",
    categories: ["modern"],
  },
  family_ethics: {
    defaultEnvTheme: "sepia",
    icon: "🏠",
    categories: ["modern"],
  },
  divine_doctor: {
    defaultEnvTheme: "nature",
    icon: "💊",
    categories: ["modern", "fantasy"],
  },
  cute_pet: {
    defaultEnvTheme: "nature",
    icon: "🐾",
    categories: ["modern", "fantasy"],
  },
  hidden_identity: {
    defaultEnvTheme: "mystery",
    icon: "🕶️",
    categories: ["modern", "suspense"],
  },
  system_stream: {
    defaultEnvTheme: "scifi",
    icon: "🤖",
    categories: ["fantasy", "modern"],
  },
  wealthy_family: {
    defaultEnvTheme: "gold",
    icon: "💰",
    categories: ["modern", "suspense"],
  },
  cs_grad_journey: {
    defaultEnvTheme: "emerald",
    icon: "🎓",
    categories: ["modern"],
    restricted: true,
  },
};
