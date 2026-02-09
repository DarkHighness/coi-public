import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils")>();
  return {
    ...actual,
    getProviderConfig: vi.fn(),
  };
});

import { generateStoryOutlinePhased } from "./outline";
import { getProviderConfig } from "../../utils";

describe("generateStoryOutlinePhased", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when options are missing", async () => {
    await expect(
      generateStoryOutlinePhased("fantasy", "English"),
    ).rejects.toThrow("options is required");
  });

  it("throws when lore provider config is unavailable", async () => {
    vi.mocked(getProviderConfig).mockReturnValue(undefined as any);

    await expect(
      generateStoryOutlinePhased(
        "fantasy",
        "English",
        undefined,
        undefined,
        {
          settings: {} as any,
          vfsSession: {} as any,
        },
      ),
    ).rejects.toThrow("Lore provider not configured");
  });
});
