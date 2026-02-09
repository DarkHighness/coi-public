import { beforeEach, describe, expect, it, vi } from "vitest";

const getRAGServiceMock = vi.hoisted(() => vi.fn());
const extractDocumentsFromStateMock = vi.hoisted(() => vi.fn());

vi.mock("../../services/rag", () => ({
  getRAGService: getRAGServiceMock,
}));

vi.mock("../../services/rag/documentExtraction", () => ({
  extractDocumentsFromState: extractDocumentsFromStateMock,
}));

import {
  applyCustomContextThemeOverrides,
  indexInitialEntities,
  updateRAGDocumentsBackground,
} from "./ragDocuments";

describe("ragDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies narrative_style override from custom context", () => {
    const base = { narrativeStyle: "base-style", palette: "dark" } as any;
    const result = applyCustomContextThemeOverrides(
      base,
      `<context>\n<narrative_style> noir-thriller </narrative_style>\n</context>`,
    );

    expect(result).toEqual({
      narrativeStyle: "noir-thriller",
      palette: "dark",
    });
    expect(result).not.toBe(base);
  });

  it("returns original theme config when override is absent", () => {
    const base = { narrativeStyle: "base-style" } as any;
    const result = applyCustomContextThemeOverrides(base, "<context></context>");

    expect(result).toBe(base);
  });

  it("skips background update when no changed entities", async () => {
    await updateRAGDocumentsBackground([], { saveId: "s1" } as any);

    expect(getRAGServiceMock).not.toHaveBeenCalled();
    expect(extractDocumentsFromStateMock).not.toHaveBeenCalled();
  });

  it("skips background update when service is unavailable", async () => {
    getRAGServiceMock.mockReturnValue(null);

    await updateRAGDocumentsBackground(
      [{ id: "npc:1", type: "npc" }],
      { saveId: "s1" } as any,
    );

    expect(extractDocumentsFromStateMock).not.toHaveBeenCalled();
  });

  it("pushes mapped documents with save/fork/turn metadata", async () => {
    const service = {
      addDocuments: vi.fn(async () => ({ count: 1 })),
    };
    getRAGServiceMock.mockReturnValue(service);
    extractDocumentsFromStateMock.mockReturnValue([
      { entityId: "npc:1", type: "npc", content: "A", importance: 0.9 },
    ]);

    await updateRAGDocumentsBackground(
      [{ id: "npc:1", type: "npc" }],
      {
        saveId: "save-12",
        forkId: 4,
        turnNumber: 21,
      } as any,
    );

    expect(extractDocumentsFromStateMock).toHaveBeenCalledWith(
      expect.objectContaining({ saveId: "save-12" }),
      ["npc:1"],
    );
    expect(service.addDocuments).toHaveBeenCalledWith([
      {
        entityId: "npc:1",
        type: "npc",
        content: "A",
        importance: 0.9,
        saveId: "save-12",
        forkId: 4,
        turnNumber: 21,
      },
    ]);
  });

  it("returns early when indexing initial entities without service", async () => {
    getRAGServiceMock.mockReturnValue(null);

    await indexInitialEntities({} as any, "save-a");

    expect(extractDocumentsFromStateMock).not.toHaveBeenCalled();
  });

  it("indexes initial outline/entity ids into service", async () => {
    const service = {
      switchSave: vi.fn(async () => ({ success: true })),
      addDocuments: vi.fn(async () => ({ count: 2 })),
    };

    getRAGServiceMock.mockReturnValue(service);
    extractDocumentsFromStateMock.mockReturnValue([
      { entityId: "outline:full", type: "outline", content: "outline" },
      { entityId: "npc:1", type: "npc", content: "npc" },
    ]);

    const state = {
      forkId: 2,
      turnNumber: 5,
      forkTree: {
        nodes: { 0: { id: 0, parentId: null } },
      },
      outline: { title: "Chronicles" },
      inventory: [{ id: "inv:1" }],
      npcs: [{ id: "npc:1" }],
      locations: [{ id: "loc:1" }],
      quests: [{ id: "quest:1" }],
      knowledge: [{ id: "know:1" }],
      factions: [{ id: "fac:1" }],
      timeline: [{ id: "evt:1" }],
    } as any;

    await indexInitialEntities(state, "save-a");

    expect(service.switchSave).toHaveBeenCalledWith("save-a", 2, state.forkTree);
    expect(extractDocumentsFromStateMock).toHaveBeenCalledWith(
      state,
      expect.arrayContaining([
        "outline:full",
        "outline:world",
        "outline:goal",
        "outline:premise",
        "outline:character",
        "inv:1",
        "npc:1",
        "loc:1",
        "quest:1",
        "know:1",
        "fac:1",
        "evt:1",
      ]),
    );

    expect(service.addDocuments).toHaveBeenCalledWith([
      {
        entityId: "outline:full",
        type: "outline",
        content: "outline",
        saveId: "save-a",
        forkId: 2,
        turnNumber: 5,
      },
      {
        entityId: "npc:1",
        type: "npc",
        content: "npc",
        saveId: "save-a",
        forkId: 2,
        turnNumber: 5,
      },
    ]);
  });

  it("stops indexing when document extraction returns empty", async () => {
    const service = {
      switchSave: vi.fn(async () => ({ success: true })),
      addDocuments: vi.fn(async () => ({ count: 0 })),
    };

    getRAGServiceMock.mockReturnValue(service);
    extractDocumentsFromStateMock.mockReturnValue([]);

    await indexInitialEntities(
      {
        forkTree: { nodes: { 0: { id: 0, parentId: null } } },
        outline: { title: "No docs" },
      } as any,
      "save-empty",
    );

    expect(service.switchSave).toHaveBeenCalled();
    expect(service.addDocuments).not.toHaveBeenCalled();
  });
});
