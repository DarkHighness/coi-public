import { describe, it, expect } from "vitest";
import { getSummaryToolsForStrategy } from "@/services/tools";

describe("getSummaryToolsForStrategy", () => {
  it("compact strategy keeps minimal summary tools", () => {
    const tools = getSummaryToolsForStrategy("compact");
    const names = tools.map((t) => t.name);

    expect(names).toContain("summary_query_segments");
    expect(names).toContain("summary_query_state");
    expect(names).toContain("finish_summary");

    expect(names).not.toContain("query_turn");
    expect(names).not.toContain("query_summary");
    expect(names).not.toContain("vfs_read");
  });

  it("query_summary strategy exposes anchored fallback toolset", () => {
    const tools = getSummaryToolsForStrategy("query_summary");
    const names = tools.map((t) => t.name);

    expect(names).toContain("summary_query_state");
    expect(names).toContain("finish_summary");
    expect(names).not.toContain("summary_query_segments");

    expect(names).toContain("query_turn");
    expect(names).toContain("query_summary");
    expect(names).toContain("vfs_ls");
    expect(names).toContain("vfs_read");
    expect(names).toContain("vfs_search");
    expect(names).toContain("vfs_grep");
  });
});
