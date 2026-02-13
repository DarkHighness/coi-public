// @vitest-environment jsdom

import React from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const isMobileRef = vi.hoisted(() => ({ value: false }));

vi.mock("../hooks/useMediaQuery", () => ({
  useIsMobile: () => isMobileRef.value,
}));

import { ToastProvider, useToast } from "./ToastContext";

describe("ToastContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    isMobileRef.value = false;
  });

  it("throws when useToast is used outside provider", () => {
    const Probe = () => {
      useToast();
      return React.createElement("div");
    };

    expect(() => render(React.createElement(Probe))).toThrow(
      "useToast must be used within a ToastProvider",
    );
  });

  it("supports show, remove, and clear operations", () => {
    let api: ReturnType<typeof useToast> | null = null;
    const t = (key: string) => key;

    const Probe = () => {
      api = useToast();
      return React.createElement(
        "div",
        null,
        api!.toasts.map((toast) =>
          React.createElement(
            "div",
            { key: toast.id },
            `${toast.type}:${toast.message}`,
          ),
        ),
      );
    };

    render(
      React.createElement(ToastProvider, null, React.createElement(Probe)),
    );

    act(() => {
      api!.showToast(t("toast.test.hello"));
      api!.showToast(t("toast.test.boom"), "error", 1000);
    });

    expect(screen.getByText("info:toast.test.hello")).toBeTruthy();
    expect(screen.getByText("error:toast.test.boom")).toBeTruthy();
    expect(api!.toasts).toHaveLength(2);

    const firstId = api!.toasts[0].id;
    act(() => {
      api!.removeToast(firstId);
    });

    expect(api!.toasts).toHaveLength(1);
    expect(screen.queryByText("info:toast.test.hello")).toBeNull();

    act(() => {
      api!.clearToasts();
    });

    expect(api!.toasts).toHaveLength(0);
  });

  it("pushes grouped state-change toast on mobile", () => {
    isMobileRef.value = true;
    let api: ReturnType<typeof useToast> | null = null;

    const Probe = () => {
      api = useToast();
      return React.createElement(
        "div",
        null,
        api!.toasts.map((toast) =>
          React.createElement(
            "div",
            { key: toast.id },
            `${toast.message}|${toast.items?.length || 0}`,
          ),
        ),
      );
    };

    render(
      React.createElement(ToastProvider, null, React.createElement(Probe)),
    );

    const t = (key: string) => key;

    act(() => {
      api!.pushStateChangeToasts(
        {
          itemsAdded: [{ name: "Lantern" }],
          questsAdded: [{ name: "Night Watch" }],
        } as any,
        t,
      );
    });

    expect(api!.toasts).toHaveLength(1);
    expect(api!.toasts[0].message).toBe("toast.stateUpdated");
    expect(api!.toasts[0].items).toHaveLength(2);
    expect(screen.getByText("toast.stateUpdated|2")).toBeTruthy();
  });

  it("pushes individual delayed toasts on desktop", () => {
    vi.useFakeTimers();
    isMobileRef.value = false;

    let api: ReturnType<typeof useToast> | null = null;

    const Probe = () => {
      api = useToast();
      return React.createElement(
        "div",
        null,
        api!.toasts.map((toast) =>
          React.createElement("div", { key: toast.id }, toast.message),
        ),
      );
    };

    render(
      React.createElement(ToastProvider, null, React.createElement(Probe)),
    );

    const t = (key: string, options?: Record<string, unknown>) => {
      if (key === "toast.itemAdded") return "Item added";
      if (key === "toast.questCompleted") return "Quest completed";
      if (key === "toast.singleItem") {
        return `${String(options?.action)}: ${String(options?.item)}`;
      }
      return key;
    };

    act(() => {
      api!.pushStateChangeToasts(
        {
          itemsAdded: [{ name: "Rope" }],
          questsCompleted: [{ name: "Harbor Duty" }, { name: "Dock Patrol" }],
        } as any,
        t,
      );
    });

    expect(api!.toasts).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(api!.toasts).toHaveLength(2);
    expect(api!.toasts[0].message).toContain("Item added: Rope");
    expect(api!.toasts[1].message).toBe("Quest completed");
    expect(api!.toasts[1].items).toEqual(["Harbor Duty", "Dock Patrol"]);
  });

  it("includes system toasts and ignores empty changes", () => {
    vi.useFakeTimers();
    let api: ReturnType<typeof useToast> | null = null;

    const Probe = () => {
      api = useToast();
      return React.createElement("div");
    };

    render(
      React.createElement(ToastProvider, null, React.createElement(Probe)),
    );

    act(() => {
      api!.pushStateChangeToasts({} as any, (key) => key);
    });
    expect(api!.toasts).toHaveLength(0);

    act(() => {
      api!.pushStateChangeToasts(
        {
          systemToasts: [{ message: "System warning", type: "warning" }],
        } as any,
        (key) => key,
      );
      vi.advanceTimersByTime(1);
    });

    expect(api!.toasts).toHaveLength(1);
    expect(api!.toasts[0].message).toBe("System warning");
    expect(api!.toasts[0].type).toBe("warning");
  });
});
