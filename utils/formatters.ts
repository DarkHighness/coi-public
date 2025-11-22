/**
 * Format bytes to human-readable storage size
 * Automatically selects appropriate unit (B, KB, MB, GB)
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${size} ${sizes[i]}`;
};

/**
 * Format storage estimate with smart unit selection
 */
export const formatStorageEstimate = (
  usage: number,
  quota: number,
): {
  usageFormatted: string;
  quotaFormatted: string;
  percentage: number;
} => {
  return {
    usageFormatted: formatBytes(usage),
    quotaFormatted: formatBytes(quota),
    percentage: (usage / quota) * 100,
  };
};
