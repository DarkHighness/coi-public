import { ThemeConfig } from "../../types";

export const THEMES: Record<string, ThemeConfig> = {
  fantasy: {
    vars: {
      '--theme-bg': '#020617',
      '--theme-surface': '#0f172a',
      '--theme-surface-highlight': '#1e293b',
      '--theme-border': '#334155',
      '--theme-primary': '#f59e0b',
      '--theme-primary-hover': '#d97706',
      '--theme-text': '#e2e8f0',
      '--theme-muted': '#94a3b8',
    },
    fontClass: 'font-fantasy',
  },
  scifi: {
    vars: {
      '--theme-bg': '#000000',
      '--theme-surface': '#09090b',
      '--theme-surface-highlight': '#18181b',
      '--theme-border': '#27272a',
      '--theme-primary': '#06b6d4',
      '--theme-primary-hover': '#0891b2',
      '--theme-text': '#e4e4e7',
      '--theme-muted': '#a1a1aa',
    },
    fontClass: 'font-scifi',
  },
  cyberpunk: {
    vars: {
      '--theme-bg': '#1a0b2e',
      '--theme-surface': '#2e1065',
      '--theme-surface-highlight': '#4c1d95',
      '--theme-border': '#701a75',
      '--theme-primary': '#d946ef',
      '--theme-primary-hover': '#c026d3',
      '--theme-text': '#fdf4ff',
      '--theme-muted': '#e879f9',
    },
    fontClass: 'font-cyberpunk',
  },
  horror: {
    vars: {
      '--theme-bg': '#1c1917',
      '--theme-surface': '#292524',
      '--theme-surface-highlight': '#44403c',
      '--theme-border': '#7f1d1d',
      '--theme-primary': '#ef4444',
      '--theme-primary-hover': '#dc2626',
      '--theme-text': '#e7e5e4',
      '--theme-muted': '#a8a29e',
    },
    fontClass: 'font-horror',
  },
  mystery: {
    vars: {
      '--theme-bg': '#0a0a0a',
      '--theme-surface': '#171717',
      '--theme-surface-highlight': '#262626',
      '--theme-border': '#404040',
      '--theme-primary': '#fbbf24',
      '--theme-primary-hover': '#f59e0b',
      '--theme-text': '#d4d4d4',
      '--theme-muted': '#737373',
    },
    fontClass: 'font-serif',
  },
  modern_romance: {
    vars: {
      '--theme-bg': '#1a1018',
      '--theme-surface': '#291521',
      '--theme-surface-highlight': '#451e30',
      '--theme-border': '#831843',
      '--theme-primary': '#f472b6',
      '--theme-primary-hover': '#ec4899',
      '--theme-text': '#fce7f3',
      '--theme-muted': '#db2777',
    },
    fontClass: 'font-sans',
  },
  palace_drama: {
    vars: {
      '--theme-bg': '#220505',
      '--theme-surface': '#450a0a',
      '--theme-surface-highlight': '#600f0f',
      '--theme-border': '#b45309',
      '--theme-primary': '#fbbf24',
      '--theme-primary-hover': '#d97706',
      '--theme-text': '#fffbeb',
      '--theme-muted': '#92400e',
    },
    fontClass: 'font-fantasy',
  },
  wuxia: {
    vars: {
      '--theme-bg': '#1c1c1c',
      '--theme-surface': '#2a2a2a',
      '--theme-surface-highlight': '#3d3d3d',
      '--theme-border': '#525252',
      '--theme-primary': '#ef4444',
      '--theme-primary-hover': '#b91c1c',
      '--theme-text': '#f5f5f4',
      '--theme-muted': '#a8a29e',
    },
    fontClass: 'font-serif',
  },
  xianxia: {
    vars: {
      '--theme-bg': '#0f1c2e',
      '--theme-surface': '#1e293b',
      '--theme-surface-highlight': '#334155',
      '--theme-border': '#64748b',
      '--theme-primary': '#38bdf8',
      '--theme-primary-hover': '#0284c7',
      '--theme-text': '#f0f9ff',
      '--theme-muted': '#94a3b8',
    },
    fontClass: 'font-serif',
  },
  ceo: {
    vars: {
      '--theme-bg': '#111827',
      '--theme-surface': '#1f2937',
      '--theme-surface-highlight': '#374151',
      '--theme-border': '#4b5563',
      '--theme-primary': '#6366f1',
      '--theme-primary-hover': '#4f46e5',
      '--theme-text': '#f9fafb',
      '--theme-muted': '#9ca3af',
    },
    fontClass: 'font-sans',
  },
  long_aotian: {
    vars: {
      '--theme-bg': '#000000',
      '--theme-surface': '#1a1a1a',
      '--theme-surface-highlight': '#333333',
      '--theme-border': '#ffd700', // Gold border
      '--theme-primary': '#ffd700', // Gold primary
      '--theme-primary-hover': '#e6c200',
      '--theme-text': '#ffffff',
      '--theme-muted': '#bfbfbf',
    },
    fontClass: 'font-serif',
  },
  villain_op: {
    vars: {
      '--theme-bg': '#0f0505',
      '--theme-surface': '#2b0b0b',
      '--theme-surface-highlight': '#4a1414',
      '--theme-border': '#7f1d1d',
      '--theme-primary': '#9333ea', // Dark Purple (Villainous)
      '--theme-primary-hover': '#7e22ce',
      '--theme-text': '#f3e8ff',
      '--theme-muted': '#a855f7',
    },
    fontClass: 'font-fantasy',
  },
  period_drama: {
    vars: {
      '--theme-bg': '#2c241b', // Dark Sepia/Brown
      '--theme-surface': '#433629',
      '--theme-surface-highlight': '#5c4d3c',
      '--theme-border': '#a18e72',
      '--theme-primary': '#d4c4a8', // Parchment/Paper
      '--theme-primary-hover': '#e3d5bc',
      '--theme-text': '#f5f0e6',
      '--theme-muted': '#a89f91',
    },
    fontClass: 'font-serif',
  },
  female_growth: {
    vars: {
      '--theme-bg': '#1a0505',
      '--theme-surface': '#2b0a0a',
      '--theme-surface-highlight': '#4a1212',
      '--theme-border': '#9f1239',
      '--theme-primary': '#fb7185',
      '--theme-primary-hover': '#f43f5e',
      '--theme-text': '#fff1f2',
      '--theme-muted': '#fda4af',
    },
    fontClass: 'font-serif',
  },
  war_god: {
    vars: {
      '--theme-bg': '#0a0a0a',
      '--theme-surface': '#171717',
      '--theme-surface-highlight': '#262626',
      '--theme-border': '#b91c1c',
      '--theme-primary': '#ef4444',
      '--theme-primary-hover': '#dc2626',
      '--theme-text': '#f5f5f5',
      '--theme-muted': '#737373',
    },
    fontClass: 'font-fantasy',
  },
  ancient_romance: {
    vars: {
      '--theme-bg': '#1c1917',
      '--theme-surface': '#292524',
      '--theme-surface-highlight': '#44403c',
      '--theme-border': '#d6d3d1',
      '--theme-primary': '#fdba74',
      '--theme-primary-hover': '#fb923c',
      '--theme-text': '#fafaf9',
      '--theme-muted': '#a8a29e',
    },
    fontClass: 'font-serif',
  },
  love_after_marriage: {
    vars: {
      '--theme-bg': '#1f1016',
      '--theme-surface': '#381a26',
      '--theme-surface-highlight': '#5e2a3e',
      '--theme-border': '#db2777',
      '--theme-primary': '#f472b6',
      '--theme-primary-hover': '#ec4899',
      '--theme-text': '#fce7f3',
      '--theme-muted': '#fbcfe8',
    },
    fontClass: 'font-sans',
  },
  angst: {
    vars: {
      '--theme-bg': '#0f172a',
      '--theme-surface': '#1e293b',
      '--theme-surface-highlight': '#334155',
      '--theme-border': '#94a3b8',
      '--theme-primary': '#38bdf8', // Cold Blue
      '--theme-primary-hover': '#0ea5e9',
      '--theme-text': '#f1f5f9',
      '--theme-muted': '#64748b',
    },
    fontClass: 'font-serif',
  },
  reunion: {
    vars: {
      '--theme-bg': '#18181b',
      '--theme-surface': '#27272a',
      '--theme-surface-highlight': '#3f3f46',
      '--theme-border': '#a1a1aa',
      '--theme-primary': '#a78bfa',
      '--theme-primary-hover': '#8b5cf6',
      '--theme-text': '#f4f4f5',
      '--theme-muted': '#71717a',
    },
    fontClass: 'font-serif',
  },
  return_strong: {
    vars: {
      '--theme-bg': '#000000',
      '--theme-surface': '#111111',
      '--theme-surface-highlight': '#222222',
      '--theme-border': '#eab308', // Gold
      '--theme-primary': '#facc15',
      '--theme-primary-hover': '#eab308',
      '--theme-text': '#ffffff',
      '--theme-muted': '#a3a3a3',
    },
    fontClass: 'font-fantasy',
  },
  farming: {
    vars: {
      '--theme-bg': '#14281d', // Dark Green
      '--theme-surface': '#1d3b2a',
      '--theme-surface-highlight': '#2d5740',
      '--theme-border': '#4ade80',
      '--theme-primary': '#86efac',
      '--theme-primary-hover': '#4ade80',
      '--theme-text': '#f0fdf4',
      '--theme-muted': '#86efac',
    },
    fontClass: 'font-sans',
  },
  republican: {
    vars: {
      '--theme-bg': '#1a1614',
      '--theme-surface': '#2b2420',
      '--theme-surface-highlight': '#423832',
      '--theme-border': '#d4af37', // Art Deco Gold
      '--theme-primary': '#14b8a6', // Teal
      '--theme-primary-hover': '#0d9488',
      '--theme-text': '#f5f5f4',
      '--theme-muted': '#a8a29e',
    },
    fontClass: 'font-serif',
  },
  intrigue: {
    vars: {
      '--theme-bg': '#190808',
      '--theme-surface': '#360f0f',
      '--theme-surface-highlight': '#591c1c',
      '--theme-border': '#7f1d1d',
      '--theme-primary': '#f87171',
      '--theme-primary-hover': '#ef4444',
      '--theme-text': '#fef2f2',
      '--theme-muted': '#fca5a5',
    },
    fontClass: 'font-serif',
  },
  survival: {
    vars: {
      '--theme-bg': '#1a120b',
      '--theme-surface': '#2e1f12',
      '--theme-surface-highlight': '#4a321d',
      '--theme-border': '#ea580c',
      '--theme-primary': '#f97316',
      '--theme-primary-hover': '#ea580c',
      '--theme-text': '#fff7ed',
      '--theme-muted': '#fdba74',
    },
    fontClass: 'font-scifi',
  },
  patriotism: {
    vars: {
      '--theme-bg': '#1e1b4b', // Dark Blue
      '--theme-surface': '#312e81',
      '--theme-surface-highlight': '#4338ca',
      '--theme-border': '#ef4444', // Red accent
      '--theme-primary': '#fbbf24', // Gold
      '--theme-primary-hover': '#f59e0b',
      '--theme-text': '#eef2ff',
      '--theme-muted': '#a5b4fc',
    },
    fontClass: 'font-serif',
  },
  son_in_law: {
    vars: {
      '--theme-bg': '#111827',
      '--theme-surface': '#1f2937',
      '--theme-surface-highlight': '#374151',
      '--theme-border': '#6b7280',
      '--theme-primary': '#22d3ee',
      '--theme-primary-hover': '#06b6d4',
      '--theme-text': '#f9fafb',
      '--theme-muted': '#9ca3af',
    },
    fontClass: 'font-sans',
  },
  white_moonlight: {
    vars: {
      '--theme-bg': '#0f172a',
      '--theme-surface': '#1e293b',
      '--theme-surface-highlight': '#334155',
      '--theme-border': '#94a3b8',
      '--theme-primary': '#e2e8f0', // White/Silver
      '--theme-primary-hover': '#cbd5e1',
      '--theme-text': '#f8fafc',
      '--theme-muted': '#94a3b8',
    },
    fontClass: 'font-serif',
  },
  yandere: {
    vars: {
      '--theme-bg': '#000000',
      '--theme-surface': '#1a0505',
      '--theme-surface-highlight': '#330a0a',
      '--theme-border': '#ff0000', // Bright Red
      '--theme-primary': '#ff0000',
      '--theme-primary-hover': '#cc0000',
      '--theme-text': '#ffe4e6',
      '--theme-muted': '#fda4af',
    },
    fontClass: 'font-horror',
  },
  cs_student: {
    vars: {
      '--theme-bg': '#022c22', // teal-950
      '--theme-surface': '#064e3b', // emerald-900
      '--theme-surface-highlight': '#065f46', // emerald-800
      '--theme-border': '#059669', // emerald-600
      '--theme-primary': '#34d399', // emerald-400
      '--theme-primary-hover': '#10b981', // emerald-500
      '--theme-text': '#ecfdf5', // emerald-50
      '--theme-muted': '#6ee7b7', // emerald-300
    },
    fontClass: 'font-sans', // Standard modern font fits CS best
  },
};
