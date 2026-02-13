import { ENV_THEMES } from "../src/utils/constants/envThemes";
import { deriveThemeVars } from "../src/utils/theme/deriveThemeVars";

type RGB = { r: number; g: number; b: number };

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const parseHex = (hex: string): RGB | null => {
  if (!HEX_COLOR_RE.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

const srgbToLinear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const relativeLuminance = (rgb: RGB) => {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (a: RGB, b: RGB) => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
};

const fmt = (value: number) => value.toFixed(2).padStart(5, " ");

const getPair = (
  vars: Record<string, string>,
  fgKey: string,
  bgKey: string,
) => {
  const fg = parseHex(vars[fgKey] ?? "");
  const bg = parseHex(vars[bgKey] ?? "");
  if (!fg || !bg) return null;
  return { fg, bg };
};

const auditVars = (
  themeKey: string,
  mode: "night" | "day",
  vars: Record<string, string>,
) => {
  const derived = deriveThemeVars(vars);

  const pairs = [
    { label: "text/bg", fg: "--theme-text", bg: "--theme-bg", min: 7.0 },
    {
      label: "secondary/bg",
      fg: "--theme-text-secondary",
      bg: "--theme-bg",
      min: 4.5,
    },
    { label: "muted/bg", fg: "--theme-muted", bg: "--theme-bg", min: 3.0 },
    {
      label: "divider/bg",
      fg: "--theme-divider",
      bg: "--theme-bg",
      min: 1.8,
    },
  ] as const;

  let hasAny = false;
  const failures: Array<{ label: string; ratio: number; min: number }> = [];

  for (const p of pairs) {
    const pair = getPair(derived, p.fg, p.bg);
    if (!pair) continue;
    hasAny = true;
    const ratio = contrastRatio(pair.fg, pair.bg);
    if (ratio + 1e-6 < p.min)
      failures.push({ label: p.label, ratio, min: p.min });
  }

  if (!hasAny) return { failures, derived };

  const textBg = getPair(derived, "--theme-text", "--theme-bg");
  const secBg = getPair(derived, "--theme-text-secondary", "--theme-bg");
  const mutedBg = getPair(derived, "--theme-muted", "--theme-bg");
  const divBg = getPair(derived, "--theme-divider", "--theme-bg");

  console.log(
    `${themeKey.padEnd(16)} ${mode.padEnd(5)} | text ${textBg ? fmt(contrastRatio(textBg.fg, textBg.bg)) : "  n/a"} | sec ${secBg ? fmt(contrastRatio(secBg.fg, secBg.bg)) : "  n/a"} | muted ${mutedBg ? fmt(contrastRatio(mutedBg.fg, mutedBg.bg)) : "  n/a"} | div ${divBg ? fmt(contrastRatio(divBg.fg, divBg.bg)) : "  n/a"}`,
  );

  return { failures, derived };
};

const main = () => {
  const allFailures: Array<{
    themeKey: string;
    mode: "night" | "day";
    label: string;
    ratio: number;
    min: number;
  }> = [];

  console.log("Theme contrast audit (ratios):");
  console.log("theme            mode  | text  | sec   | muted | div");

  for (const [themeKey, theme] of Object.entries(ENV_THEMES)) {
    const night = auditVars(themeKey, "night", theme.vars);
    for (const f of night.failures) {
      allFailures.push({ themeKey, mode: "night", ...f });
    }
    if (theme.dayVars) {
      const day = auditVars(themeKey, "day", theme.dayVars);
      for (const f of day.failures) {
        allFailures.push({ themeKey, mode: "day", ...f });
      }
    }
  }

  if (allFailures.length === 0) {
    console.log("\nOK: No failures against thresholds.");
    return;
  }

  console.log("\nFailures:");
  for (const f of allFailures) {
    console.log(
      `- ${f.themeKey} (${f.mode}) ${f.label}: ${fmt(f.ratio)} < ${f.min.toFixed(2)}`,
    );
  }

  process.exitCode = 1;
};

main();
