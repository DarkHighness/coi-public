import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get git hash from environment variable or git command
 * Supports CI/CD environments and Wrangler builds
 */
function getGitHash() {
  // Try environment variables first (common in CI/CD)
  // CF_PAGES_COMMIT_SHA - Cloudflare Pages
  // VERCEL_GIT_COMMIT_SHA - Vercel
  // GITHUB_SHA - GitHub Actions
  // GITLAB_CI_COMMIT_SHA - GitLab CI
  const envHash =
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.GITLAB_CI_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA; // Generic fallback

  if (envHash) {
    return envHash.substring(0, 7); // Use short hash format
  }

  // Try git command (local development)
  try {
    return execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'] // Suppress stderr
    }).trim();
  } catch (error) {
    console.warn('⚠ Git command not available, using fallback');
    return 'dev';
  }
}

/**
 * Get build time from environment variable or current time
 */
function getBuildTime() {
  // Allow override via environment variable
  const envTime = process.env.BUILD_TIME;
  if (envTime) {
    return envTime;
  }

  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
}

try {
  const gitHash = getGitHash();
  const buildTime = getBuildTime();

  // Create build info object
  const buildInfo = {
    gitHash,
    buildTime,
  };

  // Generate TypeScript file
  const content = `// This file is auto-generated during build
// Do not edit manually

export const BUILD_INFO = ${JSON.stringify(buildInfo, null, 2)};
`;

  // Write to constants directory
  const outputPath = join(__dirname, '../utils/constants/buildInfo.ts');
  writeFileSync(outputPath, content, 'utf-8');

  console.log(`✓ Build info generated: ${gitHash} (${buildTime})`);
} catch (error) {
  console.error('✗ Failed to generate build info:', error.message);
  process.exit(1);
}
