
import { ThemeConfig } from "../../types";

export const THEMES: Record<string, ThemeConfig> = {
  fantasy: {
    name: "Fantasy",
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
    fontClass: 'font-fantasy'
  },
  scifi: {
    name: "Sci-Fi",
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
    fontClass: 'font-scifi'
  },
  cyberpunk: {
    name: "Cyberpunk",
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
    fontClass: 'font-cyberpunk'
  },
  horror: {
    name: "Horror",
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
    fontClass: 'font-horror'
  },
  mystery: {
    name: "Mystery",
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
    fontClass: 'font-serif'
  },
  modern_romance: {
    name: "Modern Romance",
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
    fontClass: 'font-sans'
  },
  palace_drama: {
    name: "Palace Drama",
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
    fontClass: 'font-fantasy'
  },
  wuxia: {
    name: "Wuxia",
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
    fontClass: 'font-serif'
  },
  xianxia: {
    name: "Xianxia",
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
    fontClass: 'font-fantasy'
  },
  ceo: {
    name: "Urban CEO",
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
    fontClass: 'font-sans'
  },
  // --- NEW THEMES ---
  long_aotian: {
    name: "Long Aotian (OP)",
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
    fontClass: 'font-serif' // Assertive, bold
  },
  villain_op: {
    name: "Villain OP",
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
    fontClass: 'font-fantasy'
  },
  period_drama: {
    name: "Period Drama",
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
    fontClass: 'font-serif'
  }
};
