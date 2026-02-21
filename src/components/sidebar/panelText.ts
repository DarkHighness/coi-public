export const toPlainText = (value?: string | null): string => {
  if (!value) return "";
  return value
    .replace(/[`*_>#~[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const pickFirstText = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    const plain = toPlainText(value);
    if (plain) {
      return plain;
    }
  }
  return "";
};
