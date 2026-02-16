import atmosphereDescriptionsData from "@/resources/atmosphere_descriptions.json";
import {
  ambienceSchema,
  envThemeSchema,
  weatherEffectSchema,
} from "@/services/zodSchemas";
import type { VfsFile, VfsFileMap, VfsContentType } from "../types";
import { hashContent } from "../utils";
import { buildGlobalVfsToolDocs } from "./toolDocs";

const createFile = (
  path: string,
  content: string,
  contentType: VfsContentType,
): VfsFile => ({
  path,
  content,
  contentType,
  hash: hashContent(content),
  size: content.length,
  updatedAt: 0,
});

const addText = (files: VfsFileMap, path: string, content: string): void => {
  files[path] = createFile(
    path,
    content,
    path.endsWith(".md") ? "text/markdown" : "text/plain",
  );
};

export const buildGlobalVfsRefs = (): VfsFileMap => {
  const files: VfsFileMap = {};

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

    addText(files, `refs/atmosphere/${kind}/${key}.md`, md);
  };

  for (const key of envThemeSchema.options) {
    writeItem("envTheme", key, atmosphereDescriptionsData.envTheme[key] ?? "");
  }

  for (const key of ambienceSchema.options) {
    writeItem("ambience", key, atmosphereDescriptionsData.ambience[key] ?? "");
  }

  for (const key of weatherEffectSchema.options) {
    writeItem("weather", key, atmosphereDescriptionsData.weather[key] ?? "");
  }

  const optionsMd = [
    "# Atmosphere Options",
    "",
    "## envTheme",
    ...envThemeSchema.options.map((key) => `- ${key}`),
    "",
    "## ambience",
    ...ambienceSchema.options.map((key) => `- ${key}`),
    "",
    "## weather",
    ...weatherEffectSchema.options.map((key) => `- ${key}`),
    "",
  ].join("\n");
  addText(files, "refs/atmosphere/options.md", optionsMd);

  addText(
    files,
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
      '- List: `vfs_ls({ path: "current/refs/atmosphere/ambience" })`',
      '- Read one: `vfs_read_chars({ path: "current/refs/atmosphere/ambience/nightclub.md" })`',
      '- Search: `vfs_search({ path: "current/refs/atmosphere", query: "neon" })`',
      "",
    ].join("\n"),
  );

  const toolDocs = buildGlobalVfsToolDocs();
  for (const [path, file] of Object.entries(toolDocs)) {
    files[path] = file;
  }

  return files;
};
