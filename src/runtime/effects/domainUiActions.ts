import type { Dispatch, SetStateAction } from "react";
import type { AccessTimestamp, GameState } from "../../types";

type HighlightTarget =
  | {
      kind:
        | "inventory"
        | "npcs"
        | "locations"
        | "knowledge"
        | "quests"
        | "factions"
        | "timeline";
      id: string;
    }
  | {
      kind: "characterSkills" | "characterConditions" | "characterTraits";
      id?: string;
      name?: string;
    };

interface DomainUiActionsDeps {
  setGameState: Dispatch<SetStateAction<GameState>>;
  triggerSave: () => void;
}

type EntityPresentationKind =
  | "inventory"
  | "npcs"
  | "locations"
  | "knowledge"
  | "quests"
  | "factions"
  | "timeline"
  | "characterSkills"
  | "characterConditions"
  | "characterTraits";

type TopLevelHighlightKind = Exclude<
  HighlightTarget["kind"],
  "characterSkills" | "characterConditions" | "characterTraits"
>;

type HighlightableEntry = {
  id?: string;
  name?: string;
  highlight?: boolean;
  [key: string]: unknown;
};

const makeEntityPresentationKey = (
  kind: EntityPresentationKind,
  id: string,
): string => `${kind}:${id}`;

const createLastAccessStamp = (
  state: Pick<GameState, "forkId" | "turnNumber">,
): AccessTimestamp => ({
  forkId: typeof state.forkId === "number" ? state.forkId : 0,
  turnNumber: typeof state.turnNumber === "number" ? state.turnNumber : 0,
  timestamp: Date.now(),
});

const topLevelKindMap: Record<TopLevelHighlightKind, EntityPresentationKind> = {
  inventory: "inventory",
  npcs: "npcs",
  locations: "locations",
  knowledge: "knowledge",
  quests: "quests",
  factions: "factions",
  timeline: "timeline",
};

const characterSectionKindMap: Record<
  "skills" | "conditions" | "hiddenTraits",
  EntityPresentationKind
> = {
  skills: "characterSkills",
  conditions: "characterConditions",
  hiddenTraits: "characterTraits",
};

const getTopLevelEntries = (
  state: GameState,
  kind: TopLevelHighlightKind,
): HighlightableEntry[] => {
  const listByKind: Record<TopLevelHighlightKind, HighlightableEntry[]> = {
    inventory: state.inventory,
    npcs: state.npcs,
    locations: state.locations,
    knowledge: state.knowledge,
    quests: state.quests,
    factions: state.factions,
    timeline: state.timeline,
  };
  return listByKind[kind];
};

export function createDomainUiActions({
  setGameState,
  triggerSave,
}: DomainUiActionsDeps) {
  const updateNodeAudio = (nodeId: string, audioKey: string) => {
    setGameState((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: { ...prev.nodes[nodeId], audioKey },
      },
    }));
  };

  const clearHighlight = (target: HighlightTarget) => {
    const applyCharacterHighlightClear = (
      section: "skills" | "conditions" | "hiddenTraits",
      match: { id?: string; name?: string },
    ) => {
      setGameState((prev) => {
        if (!prev.character) {
          return prev;
        }

        const prevList = prev.character[section] as
          | HighlightableEntry[]
          | undefined;
        if (!Array.isArray(prevList) || prevList.length === 0) {
          return prev;
        }

        const matches = (entry: HighlightableEntry): boolean => {
          if (!entry || typeof entry !== "object") return false;
          if (match.id && entry?.id && entry.id === match.id) return true;
          if (match.name && entry?.name && entry.name === match.name) return true;
          return false;
        };

        const nextEntityPresentation = {
          ...(prev.uiState.entityPresentation ?? {}),
        };
        const lastAccess = createLastAccessStamp(prev);
        let changedList = false;
        let changedPresentation = false;

        const markPresentationCleared = (id: string) => {
          const key = makeEntityPresentationKey(
            characterSectionKindMap[section],
            id,
          );
          const prevState = nextEntityPresentation[key] ?? {};
          if (prevState.highlight === false) {
            return;
          }
          nextEntityPresentation[key] = {
            ...prevState,
            highlight: false,
            lastAccess,
          };
          changedPresentation = true;
        };

        if (match.id && match.id.trim().length > 0) {
          markPresentationCleared(match.id.trim());
        }

        const nextList = prevList.map((entry) => {
          if (!matches(entry)) {
            return entry;
          }
          changedList = true;
          if (typeof entry?.id === "string" && entry.id.trim().length > 0) {
            markPresentationCleared(entry.id.trim());
          }
          return { ...entry, highlight: false };
        });

        if (!changedList && !changedPresentation) {
          return prev;
        }

        return {
          ...prev,
          character: {
            ...prev.character,
            [section]: nextList,
          },
          uiState: {
            ...prev.uiState,
            entityPresentation: nextEntityPresentation,
          },
        };
      });
    };

    if (
      target.kind === "inventory" ||
      target.kind === "npcs" ||
      target.kind === "locations" ||
      target.kind === "knowledge" ||
      target.kind === "quests" ||
      target.kind === "factions" ||
      target.kind === "timeline"
    ) {
      setGameState((prev) => {
        const list = getTopLevelEntries(prev, target.kind);
        if (!Array.isArray(list) || list.length === 0) {
          return prev;
        }

        const nextEntityPresentation = {
          ...(prev.uiState.entityPresentation ?? {}),
        };
        const lastAccess = createLastAccessStamp(prev);
        const key = makeEntityPresentationKey(
          topLevelKindMap[target.kind],
          target.id,
        );
        const prevState = nextEntityPresentation[key] ?? {};
        nextEntityPresentation[key] = {
          ...prevState,
          highlight: false,
          lastAccess,
        };

        const updated = list.map((entry) =>
          entry?.id === target.id ? { ...entry, highlight: false } : entry,
        );

        return {
          ...prev,
          [target.kind]: updated,
          uiState: {
            ...prev.uiState,
            entityPresentation: nextEntityPresentation,
          },
        };
      });

      triggerSave();
      return;
    }

    if (target.kind === "characterSkills") {
      applyCharacterHighlightClear("skills", {
        id: target.id,
        name: target.name,
      });
      triggerSave();
      return;
    }

    if (target.kind === "characterConditions") {
      applyCharacterHighlightClear("conditions", {
        id: target.id,
        name: target.name,
      });
      triggerSave();
      return;
    }

    if (target.kind === "characterTraits") {
      applyCharacterHighlightClear("hiddenTraits", {
        id: target.id,
        name: target.name,
      });
      triggerSave();
    }
  };

  return {
    updateNodeAudio,
    clearHighlight,
  };
}
