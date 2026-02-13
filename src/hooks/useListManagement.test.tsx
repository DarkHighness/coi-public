// @vitest-environment jsdom

import React from "react";
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useListManagement } from "./useListManagement";

describe("useListManagement", () => {
  const items = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "c", name: "C" },
  ];

  it("initializes missing customOrder entries", () => {
    const onUpdate = vi.fn();
    const listState = { pinnedIds: [], customOrder: [], hiddenIds: [] };

    const Harness = () => {
      useListManagement(items, listState as any, onUpdate);
      return React.createElement("div");
    };

    render(React.createElement(Harness));

    expect(onUpdate).toHaveBeenCalledWith({
      pinnedIds: [],
      customOrder: ["a", "b", "c"],
      hiddenIds: [],
    });
  });

  it("toggles pinned ids", () => {
    const onUpdate = vi.fn();
    const listState = { pinnedIds: [], customOrder: ["a", "b"], hiddenIds: [] };

    let api: ReturnType<typeof useListManagement<any>> | null = null;
    const Harness = () => {
      api = useListManagement(items, listState as any, onUpdate);
      return React.createElement("div");
    };

    render(React.createElement(Harness));

    act(() => {
      api!.togglePin("a");
    });

    expect(onUpdate).toHaveBeenCalledWith({
      pinnedIds: ["a"],
      customOrder: ["a", "b"],
      hiddenIds: [],
    });
  });

  it("toggles hidden ids", () => {
    const onUpdate = vi.fn();
    const listState = { pinnedIds: [], customOrder: ["a", "b"], hiddenIds: [] };

    let api: ReturnType<typeof useListManagement<any>> | null = null;
    const Harness = () => {
      api = useListManagement(items, listState as any, onUpdate);
      return React.createElement("div");
    };

    render(React.createElement(Harness));

    act(() => {
      api!.toggleHide("b");
    });

    expect(onUpdate).toHaveBeenCalledWith({
      pinnedIds: [],
      customOrder: ["a", "b"],
      hiddenIds: ["b"],
    });
  });

  it("reorders items with drag/hover ids", () => {
    const onUpdate = vi.fn();
    const listState = {
      pinnedIds: [],
      customOrder: ["a", "b", "c"],
      hiddenIds: [],
    };

    let api: ReturnType<typeof useListManagement<any>> | null = null;
    const Harness = () => {
      api = useListManagement(items, listState as any, onUpdate);
      return React.createElement("div");
    };

    render(React.createElement(Harness));

    act(() => {
      api!.reorderItem("c", "a");
    });

    expect(onUpdate).toHaveBeenCalledWith({
      pinnedIds: [],
      customOrder: ["c", "a", "b"],
      hiddenIds: [],
    });
  });

  it("returns visibleItems with hidden removed and pinned sorted first", () => {
    const onUpdate = vi.fn();
    const listState = {
      pinnedIds: ["b"],
      customOrder: ["a", "b", "c"],
      hiddenIds: ["a"],
    };

    let api: ReturnType<typeof useListManagement<any>> | null = null;
    const Harness = () => {
      api = useListManagement(items, listState as any, onUpdate);
      return React.createElement("div");
    };

    render(React.createElement(Harness));

    expect(api!.visibleItems.map((i) => i.id)).toEqual(["b", "c"]);
    expect(api!.allItems.map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(api!.isPinned("b")).toBe(true);
    expect(api!.isHidden("a")).toBe(true);
  });
});
