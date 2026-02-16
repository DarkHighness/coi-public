// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolCallCarousel } from "./ToolCallCarousel";

describe("ToolCallCarousel", () => {
  it("renders context usage meter when live snapshot is present", () => {
    render(
      <ToolCallCarousel
        calls={[
          {
            name: "vfs_read",
            input: { path: "current/world/global.json" },
            output: null,
            timestamp: Date.now(),
            contextUsage: {
              promptTokens: 1000,
              contextWindowTokens: 2000,
              usageRatio: 0.5,
              autoCompactThreshold: 0.7,
              thresholdTokens: 1400,
              tokensToThreshold: 400,
              source: "settings.modelContextWindows",
            },
          },
        ]}
      />,
    );

    expect(screen.getByText(/Context 50%/i)).toBeTruthy();
    expect(screen.getByText(/auto 70%/i)).toBeTruthy();
  });

  it("keeps carousel output minimal when no context usage snapshot exists", () => {
    render(
      <ToolCallCarousel
        calls={[
          {
            name: "vfs_mutate",
            input: { ops: [] },
            output: { success: true },
            timestamp: Date.now(),
          },
        ]}
      />,
    );

    expect(screen.queryByText(/Context \d+%/i)).toBeNull();
    expect(screen.getByText(/vfs_mutate\(\.\.\.\)/i)).toBeTruthy();
  });
});
