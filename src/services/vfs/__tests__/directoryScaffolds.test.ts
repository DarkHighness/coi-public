import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import {
  CUSTOM_RULE_CATEGORY_DIRECTORY_PATHS,
  ensureDirectoryScaffolds,
  isScaffoldDirectoryPath,
  isScaffoldReadmePath,
} from "../directoryScaffolds";

describe("directory scaffolds", () => {
  it("creates world and custom_rules scaffold readmes", () => {
    const session = new VfsSession();

    const created = ensureDirectoryScaffolds(session);

    expect(created.length).toBeGreaterThan(0);
    expect(session.readFile("world/characters/README.md")).toBeTruthy();
    expect(session.readFile("world/locations/README.md")).toBeTruthy();
    expect(session.readFile("world/causal_chains/README.md")).toBeTruthy();
    expect(session.readFile("world/placeholders/README.md")).toBeTruthy();
    expect(session.readFile("custom_rules/README.md")).toBeTruthy();
    expect(
      session.readFile("custom_rules/00-system-core/README.md"),
    ).toBeTruthy();
    expect(session.readFile("custom_rules/12-custom/README.md")).toBeTruthy();
    expect(session.readFile("custom_rules/00-system-core/RULES.md")).toBeNull();

    const charactersReadme =
      session.readFile("world/characters/README.md")?.content ?? "";
    expect(charactersReadme).toContain("## Audience");
    expect(charactersReadme).toContain("## Write Protocol");
    expect(charactersReadme).toContain("AI Runtime");

    const placeholderReadme =
      session.readFile("world/placeholders/README.md")?.content ?? "";
    expect(placeholderReadme).toContain("markdown-only");
    expect(placeholderReadme).toContain(
      "After successful canonical write, delete the corresponding draft markdown",
    );
    expect(placeholderReadme).toContain(
      "do not delete draft on failed promotion",
    );

    const systemCoreReadme =
      session.readFile("custom_rules/00-system-core/README.md")?.content ?? "";
    expect(systemCoreReadme).toContain("When to apply:");
    expect(systemCoreReadme).toContain("## Guardrails");
  });

  it("is idempotent when called repeatedly", () => {
    const session = new VfsSession();

    const first = ensureDirectoryScaffolds(session);
    const second = ensureDirectoryScaffolds(session);

    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual([]);
  });

  it("keeps 13 custom rules category directories registered", () => {
    expect(CUSTOM_RULE_CATEGORY_DIRECTORY_PATHS).toHaveLength(13);
    expect(CUSTOM_RULE_CATEGORY_DIRECTORY_PATHS[0]).toBe(
      "custom_rules/00-system-core",
    );
    expect(CUSTOM_RULE_CATEGORY_DIRECTORY_PATHS[12]).toBe(
      "custom_rules/12-custom",
    );
    expect(isScaffoldDirectoryPath("custom_rules/08-state-management")).toBe(
      true,
    );
    expect(
      isScaffoldReadmePath("custom_rules/08-state-management/README.md"),
    ).toBe(true);
  });
});
