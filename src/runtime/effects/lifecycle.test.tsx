// @vitest-environment jsdom

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const showToastMock = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.defaultValue) {
        return String(options.defaultValue);
      }
      return key;
    },
  }),
}));

vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

import { useRuntimeLifecycleEffects } from "./lifecycle";

const createState = (overrides?: Partial<any>) => ({
  aiSettings: {
    embedding: {
      enabled: true,
      providerId: "p1",
      modelId: "m1",
      dimensions: 1024,
    },
  },
  rag: {
    isInitialized: false,
    isLoading: false,
    modelMismatch: null,
    storageOverflow: null,
  },
  gameState: {
    outline: { title: "Chronicles" },
    nodes: {
      a: { id: "a" },
      b: { id: "b" },
    },
    forkId: 2,
    forkTree: {
      nodes: { 0: { id: 0, parentId: null } },
    },
  },
  currentSlotId: "slot-1",
  vfsSession: {} as any,
  ...overrides,
});

const createActions = () => ({
  rag: {
    initialize: vi.fn(async () => true),
    terminate: vi.fn(),
    switchSave: vi.fn(async () => true),
    indexInitialEntities: vi.fn(async () => undefined),
    handleModelMismatch: vi.fn(async () => undefined),
    handleStorageOverflow: vi.fn(async () => undefined),
  },
  handleSaveSettings: vi.fn(),
});

const renderLifecycle = (state: any, actions: any) => {
  const Probe = ({ s, a }: { s: any; a: any }) => {
    useRuntimeLifecycleEffects({ state: s, actions: a });
    return React.createElement("div");
  };

  const view = render(React.createElement(Probe, { s: state, a: actions }));
  return {
    rerender: (nextState: any, nextActions: any = actions) =>
      view.rerender(React.createElement(Probe, { s: nextState, a: nextActions })),
  };
};

describe("useRuntimeLifecycleEffects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("confirm", vi.fn(() => false));
  });

  it("initializes rag when embedding is enabled and not initialized", async () => {
    const state = createState();
    const actions = createActions();

    const { rerender } = renderLifecycle(state, actions);

    await waitFor(() => {
      expect(actions.rag.initialize).toHaveBeenCalledWith(state.aiSettings);
    });

    rerender(
      createState({
        rag: {
          ...state.rag,
          isInitialized: true,
        },
      }),
    );

    expect(actions.rag.initialize).toHaveBeenCalledTimes(1);
  });

  it("terminates rag when embedding gets disabled while initialized", async () => {
    const actions = createActions();

    renderLifecycle(
      createState({
        aiSettings: {
          embedding: { enabled: false, providerId: "p1", modelId: "m1", dimensions: 1024 },
        },
        rag: {
          isInitialized: true,
          isLoading: false,
          modelMismatch: null,
          storageOverflow: null,
        },
      }),
      actions,
    );

    await waitFor(() => {
      expect(actions.rag.terminate).toHaveBeenCalled();
    });
  });

  it("indexes existing content when embedding toggles from off to on and user confirms", async () => {
    (window.confirm as any as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const actions = createActions();

    const { rerender } = renderLifecycle(
      createState({
        aiSettings: {
          embedding: { enabled: false, providerId: "p1", modelId: "m1", dimensions: 1024 },
        },
        rag: {
          isInitialized: true,
          isLoading: false,
          modelMismatch: null,
          storageOverflow: null,
        },
      }),
      actions,
    );

    rerender(
      createState({
        rag: {
          isInitialized: true,
          isLoading: false,
          modelMismatch: null,
          storageOverflow: null,
        },
      }),
    );

    await waitFor(() => {
      expect(actions.rag.switchSave).toHaveBeenCalledWith(
        "slot-1",
        2,
        expect.objectContaining({ nodes: expect.any(Object) }),
      );
      expect(actions.rag.indexInitialEntities).toHaveBeenCalledWith(
        expect.objectContaining({ outline: expect.any(Object) }),
        "slot-1",
        expect.anything(),
      );
      expect(showToastMock).toHaveBeenCalledWith(
        "runtime.indexedExistingDocuments",
        "info",
      );
    });
  });

  it("shows error toast when indexing existing content fails", async () => {
    (window.confirm as any as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const actions = createActions();
    actions.rag.switchSave.mockRejectedValue(new Error("switch failed"));

    const { rerender } = renderLifecycle(
      createState({
        aiSettings: {
          embedding: { enabled: false, providerId: "p1", modelId: "m1", dimensions: 1024 },
        },
        rag: {
          isInitialized: true,
          isLoading: false,
          modelMismatch: null,
          storageOverflow: null,
        },
      }),
      actions,
    );

    rerender(
      createState({
        rag: {
          isInitialized: true,
          isLoading: false,
          modelMismatch: null,
          storageOverflow: null,
        },
      }),
    );

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        "runtime.failedToIndexExistingContent",
        "error",
      );
    });
  });

  it("handles model mismatch actions across rebuild/disable/continue branches", async () => {
    const actionsA = createActions();
    (window.confirm as any as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(true);

    renderLifecycle(
      createState({
        rag: {
          isInitialized: true,
          isLoading: false,
          modelMismatch: {
            storedModel: "old",
            currentModel: "new",
          },
          storageOverflow: null,
        },
      }),
      actionsA,
    );

    await waitFor(() => {
      expect(actionsA.rag.handleModelMismatch).toHaveBeenCalledWith("rebuild");
    });

    const actionsB = createActions();
    (window.confirm as any as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    renderLifecycle(
      createState({
        rag: {
          isInitialized: true,
          isLoading: false,
          modelMismatch: {
            storedModel: "old",
            currentModel: "new",
          },
          storageOverflow: null,
        },
      }),
      actionsB,
    );

    await waitFor(() => {
      expect(actionsB.rag.handleModelMismatch).toHaveBeenCalledWith("disable");
      expect(actionsB.handleSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          embedding: expect.objectContaining({ enabled: false }),
        }),
      );
    });

    const actionsC = createActions();
    (window.confirm as any as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    renderLifecycle(
      createState({
        rag: {
          isInitialized: true,
          isLoading: false,
          modelMismatch: {
            storedModel: "old",
            currentModel: "new",
          },
          storageOverflow: null,
        },
      }),
      actionsC,
    );

    await waitFor(() => {
      expect(actionsC.rag.handleModelMismatch).toHaveBeenCalledWith("continue");
    });
  });

  it("handles storage overflow confirmation", async () => {
    (window.confirm as any as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const actions = createActions();

    renderLifecycle(
      createState({
        rag: {
          isInitialized: true,
          isLoading: false,
          modelMismatch: null,
          storageOverflow: {
            currentTotal: 120,
            maxTotal: 100,
            suggestedDeletions: ["slot-old"],
          },
        },
      }),
      actions,
    );

    await waitFor(() => {
      expect(actions.rag.handleStorageOverflow).toHaveBeenCalledWith([
        "slot-old",
      ]);
    });
  });
});
