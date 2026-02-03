import { describe, it, expect } from "vitest";
import { getSegmentsForAI } from "./storyUtils";
import type { StorySegment } from "../types";

const makeSegments = (count: number): StorySegment[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `seg-${i}`,
    parentId: i === 0 ? null : `seg-${i - 1}`,
    text: `seg ${i}`,
    choices: [],
    role: "model",
    timestamp: Date.now(),
    segmentIdx: i,
    ending: "continue",
  }));

describe("getSegmentsForAI", () => {
  it("keeps a small overlap when lastSummarizedIndex is beyond the latest segmentIdx", () => {
    const segments = makeSegments(10); // idx 0..9
    const result = getSegmentsForAI(segments, 10, 4);
    expect(result.map((s) => s.segmentIdx)).toEqual([6, 7, 8, 9]);
  });

  it("returns all segments if overlap is larger than history", () => {
    const segments = makeSegments(3); // idx 0..2
    const result = getSegmentsForAI(segments, 999, 10);
    expect(result.map((s) => s.segmentIdx)).toEqual([0, 1, 2]);
  });

  it("drops summarized prefix while keeping overlap before summary boundary", () => {
    const segments = makeSegments(16); // idx 0..15
    const result = getSegmentsForAI(segments, 10, 4);
    expect(result[0].segmentIdx).toBe(6);
    expect(result[result.length - 1].segmentIdx).toBe(15);
  });

  it("returns all segments when no summary exists", () => {
    const segments = makeSegments(5);
    const result = getSegmentsForAI(segments, 0, 4);
    expect(result.map((s) => s.segmentIdx)).toEqual([0, 1, 2, 3, 4]);
  });
});

