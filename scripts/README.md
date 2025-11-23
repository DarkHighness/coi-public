# Build Info Generation

This directory contains the script to generate build information (git hash and build time) for the application.

## Usage

The script is automatically run before each build:

- `npm run dev` - Generates build info before starting dev server
- `npm run build` - Generates build info before building

## Environment Variables

The script supports the following environment variables for CI/CD and cloud build systems:

### Git Commit Hash

The script will try to get the git commit hash from these sources (in order):

1. `CF_PAGES_COMMIT_SHA` - Cloudflare Pages
2. `VERCEL_GIT_COMMIT_SHA` - Vercel
3. `GITHUB_SHA` - GitHub Actions
4. `GITLAB_CI_COMMIT_SHA` - GitLab CI
5. `GIT_COMMIT_SHA` - Generic fallback
6. Local git command: `git rev-parse --short HEAD`
7. Fallback: `"dev"`

### Build Time

The script will use the build time from these sources (in order):

1. `BUILD_TIME` - Custom override (format: YYYY-MM-DD)
2. Current system time in YYYY-MM-DD format

## Examples

### Local Development

```bash
npm run dev
```

Uses local git command to get commit hash.

### Cloudflare Pages

No configuration needed. The script will automatically detect `CF_PAGES_COMMIT_SHA`.

### Wrangler

```bash
wrangler pages deploy dist
```

Cloudflare Wrangler automatically provides `CF_PAGES_COMMIT_SHA` during deployment.

### Custom CI/CD

```bash
GIT_COMMIT_SHA=$(git rev-parse HEAD) npm run build
```

### Manual Override

```bash
GIT_COMMIT_SHA=abc1234 BUILD_TIME=2025-01-01 npm run build
```

## Output

The script generates `utils/constants/buildInfo.ts`:

```typescript
export const BUILD_INFO = {
  gitHash: "c40e5c9",
  buildTime: "2025-11-23",
};
```

This file is automatically imported and displayed in:

- Desktop: SystemFooter component
- Mobile: Mobile menu page

**Note:** `buildInfo.ts` is auto-generated and should not be committed to git (it's in `.gitignore`).
