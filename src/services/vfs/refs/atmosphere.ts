import atmosphereDescriptionsData from "@/resources/atmosphere_descriptions.json";
import {
  ambienceSchema,
  envThemeSchema,
  weatherEffectSchema,
} from "@/services/zodSchemas";
import type { VfsSession } from "../vfsSession";
import { isSharedReadOnlyPath } from "../pathScopes";

const writeText = (session: VfsSession, path: string, value: string) => {
  if (isSharedReadOnlyPath(path)) {
    return;
  }
  session.writeFile(path, value, path.endsWith(".md") ? "text/markdown" : "text/plain");
};

/**
 * Seed atmosphere reference data into VFS under `refs/atmosphere/`.
 *
 * Why:
 * - Keeps large descriptions out of the always-loaded prompt context
 * - Lets the agent fetch only what it needs via vfs_ls / vfs_read / vfs_read_json / vfs_search
 */
export const seedAtmosphereRefs = (session: VfsSession): void => {
  const writeItem = (
    kind: "envTheme" | "ambience" | "weather",
    key: string,
    description: string,
  ) => {
    const md = [
      "---",
      `kind: ${kind}`,
      `key: ${key}`,
      "---",
      "",
      `# ${key}`,
      "",
      description,
      "",
    ].join("\n");
    writeText(session, `refs/atmosphere/${kind}/${key}.md`, md);
  };

  for (const key of envThemeSchema.options) {
    const description = atmosphereDescriptionsData.envTheme[key] ?? "";
    writeItem("envTheme", key, description);
  }

  for (const key of ambienceSchema.options) {
    const description = atmosphereDescriptionsData.ambience[key] ?? "";
    writeItem("ambience", key, description);
  }

  for (const key of weatherEffectSchema.options) {
    const description = atmosphereDescriptionsData.weather[key] ?? "";
    writeItem("weather", key, description);
  }

  const optionsMd = [
    "# Atmosphere Options",
    "",
    "## envTheme",
    ...envThemeSchema.options.map((k) => `- ${k}`),
    "",
    "## ambience",
    ...ambienceSchema.options.map((k) => `- ${k}`),
    "",
    "## weather",
    ...weatherEffectSchema.options.map((k) => `- ${k}`),
    "",
  ].join("\n");

  writeText(session, "refs/atmosphere/options.md", optionsMd);

  writeText(
    session,
    "refs/atmosphere/README.md",
    [
      "# Atmosphere Reference (VFS)",
      "",
      "This folder stores atmosphere reference data to avoid bloating prompts.",
      "",
      "## Where to look",
      "- `refs/atmosphere/envTheme/*.md`",
      "- `refs/atmosphere/ambience/*.md`",
      "- `refs/atmosphere/weather/*.md`",
      "- `refs/atmosphere/options.md`",
      "",
      "## How to use (examples)",
      '- List: `vfs_ls({ path: \"current/refs/atmosphere/ambience\" })`',
      '- Read one: `vfs_read({ path: \"current/refs/atmosphere/ambience/nightclub.md\" })`',
      '- Search: `vfs_search({ path: \"current/refs/atmosphere\", query: \"neon\" })`',
      "",
    ].join("\n"),
  );
};
