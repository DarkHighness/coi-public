const matches = (message: string | null | undefined, pattern: string) => {
  if (!message) return false;
  return message.includes(pattern);
};

export const isCriticalAppError = (message: string | null | undefined) => {
  if (!message) return false;
  return (
    matches(message, "ChunkLoadError") ||
    matches(message, "Importing a module script failed") ||
    matches(message, "QuotaExceededError")
  );
};
