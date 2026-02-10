export const BUTTERFLY_COLORS = ["#ffffff", "#38bdf8"] as const;

export const getButterflyColor = (index: number): string =>
  BUTTERFLY_COLORS[index % BUTTERFLY_COLORS.length];
