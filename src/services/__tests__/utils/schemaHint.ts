export const pickHintSignatureLines = (
  hint: string,
  prefixes: string[],
): string[] => {
  return hint
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => prefixes.some((prefix) => line.startsWith(prefix)));
};
