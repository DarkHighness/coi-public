type RGB = { r: number; g: number; b: number };

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const toHex2 = (value: number) => {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, "0");
};

const rgbToHex = (rgb: RGB) => {
  return `#${toHex2(rgb.r)}${toHex2(rgb.g)}${toHex2(rgb.b)}`;
};

const parseHex = (hex: string): RGB | null => {
  if (!HEX_COLOR_RE.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

// Mix fg toward bg by fgWeight (1 => fg, 0 => bg)
const mix = (fg: RGB, bg: RGB, fgWeight: number): RGB => {
  const w = clamp01(fgWeight);
  return {
    r: fg.r * w + bg.r * (1 - w),
    g: fg.g * w + bg.g * (1 - w),
    b: fg.b * w + bg.b * (1 - w),
  };
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

const binarySearchMinFgWeight = (
  fg: RGB,
  bg: RGB,
  minContrast: number,
): number | null => {
  // If even full fg cannot reach the minimum, signal failure.
  if (contrastRatio(fg, bg) < minContrast) return null;

  let low = 0; // too close to bg => low contrast
  let high = 1; // full fg

  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    const mixed = mix(fg, bg, mid);
    if (contrastRatio(mixed, bg) >= minContrast) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high;
};

const deriveTextSecondary = (text: RGB, bg: RGB) => {
  const minContrast = 4.5;
  const fgWeight = binarySearchMinFgWeight(text, bg, minContrast);
  if (fgWeight == null) return rgbToHex(text);
  // Add a small buffer to be resilient across rounding and rendering differences.
  return rgbToHex(mix(text, bg, clamp01(fgWeight + 0.03)));
};

const deriveMuted = (text: RGB, bg: RGB) => {
  const minContrast = 3.0;
  const fgWeight = binarySearchMinFgWeight(text, bg, minContrast);
  if (fgWeight == null) return rgbToHex(text);
  // Keep muted visibly distinct from secondary in most themes.
  const buffered = clamp01(fgWeight + 0.02);
  return rgbToHex(mix(text, bg, buffered));
};

const deriveDivider = (text: RGB, bg: RGB) => {
  const minContrast = 1.8;
  const fgWeight = binarySearchMinFgWeight(text, bg, minContrast);
  if (fgWeight == null) return rgbToHex(text);
  // Divider should stay subtle, but must remain visible in light mode.
  const buffered = clamp01(fgWeight + 0.02);
  const capped = Math.min(buffered, 0.55);
  return rgbToHex(mix(text, bg, capped));
};

export const deriveThemeVars = (vars: Record<string, string>) => {
  const next = { ...vars };

  const bgHex = next["--theme-bg"];
  const textHex = next["--theme-text"];

  const bg = typeof bgHex === "string" ? parseHex(bgHex) : null;
  const text = typeof textHex === "string" ? parseHex(textHex) : null;
  if (!bg || !text) return next;

  if (
    !next["--theme-text-secondary"] ||
    !parseHex(next["--theme-text-secondary"])
  ) {
    next["--theme-text-secondary"] = deriveTextSecondary(text, bg);
  }

  const mutedHex = next["--theme-muted"];
  const muted = typeof mutedHex === "string" ? parseHex(mutedHex) : null;
  if (muted && contrastRatio(muted, bg) < 3.0) {
    next["--theme-muted"] = deriveMuted(text, bg);
  }

  if (!next["--theme-divider"] || !parseHex(next["--theme-divider"])) {
    next["--theme-divider"] = deriveDivider(text, bg);
  }

  return next;
};
