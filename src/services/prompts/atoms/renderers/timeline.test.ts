import { describe, expect, it } from "vitest";
import {
  renderTimelineFull,
  renderTimelineHidden,
  renderTimelineVisible,
} from "./timeline";

describe("timeline renderer", () => {
  const event = {
    id: "evt:1",
    name: "The Blackout",
    gameTime: "day-12 dusk",
    category: "incident",
    visible: {
      description: "District lights fail simultaneously",
      causedBy: "unknown",
    },
    hidden: {
      trueDescription: "Power siphoned into ritual engine",
      trueCausedBy: "fac:veil",
      consequences: "city unrest",
    },
  } as any;

  it("renders visible event payload", () => {
    const output = renderTimelineVisible({ event });

    expect(output).toContain('<timeline_event id="evt:1" layer="visible">');
    expect(output).toContain("name: The Blackout");
    expect(output).toContain("causedBy: unknown");
  });

  it("renders hidden event details and empty fallback", () => {
    const hidden = renderTimelineHidden({ event });
    expect(hidden).toContain('<timeline_event id="evt:1" layer="hidden">');
    expect(hidden).toContain("trueCausedBy: fac:veil");

    const noHidden = renderTimelineHidden({ event: { ...event, hidden: undefined } });
    expect(noHidden).toBe("");
  });

  it("renders full view with visible and hidden sections", () => {
    const output = renderTimelineFull({ event });

    expect(output).toContain('<timeline_event id="evt:1" layer="full">');
    expect(output).toContain("<visible>");
    expect(output).toContain("<hidden>");
    expect(output).toContain("consequences: city unrest");
  });

  it("uses visible-only full output when hidden is absent", () => {
    const output = renderTimelineFull({ event: { ...event, hidden: undefined } });

    expect(output).toContain('layer="visible"');
    expect(output).not.toContain("<hidden>");
  });
});
