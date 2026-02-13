import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { GameState } from "../../types";
import type { VfsSession } from "../../services/vfs/vfsSession";

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
  gameStateRef: MutableRefObject<GameState>;
  setGameState: Dispatch<SetStateAction<GameState>>;
  triggerSave: () => void;
  vfsSession: VfsSession;
}

export function createDomainUiActions({
  gameStateRef,
  setGameState,
  triggerSave,
  vfsSession,
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
    const applyEntityHighlightClear = (filePath: string) => {
      try {
        if (!vfsSession.readFile(filePath)) {
          return;
        }
        vfsSession.mergeJson(filePath, { highlight: false });
      } catch (error) {
        console.warn("[UI] Failed to clear highlight in VFS:", filePath, error);
      }
    };

    const applyCharacterHighlightClear = (
      section: "skills" | "conditions" | "hiddenTraits",
      match: { id?: string; name?: string },
    ) => {
      const current = gameStateRef.current.character;
      if (!current) {
        return;
      }

      const list = (current as any)[section] as Array<any> | undefined;
      if (!Array.isArray(list) || list.length === 0) {
        return;
      }

      const sectionDir: Record<string, string> = {
        skills: `world/characters/${gameStateRef.current.playerActorId || "char:player"}/skills`,
        conditions: `world/characters/${gameStateRef.current.playerActorId || "char:player"}/conditions`,
        hiddenTraits: `world/characters/${gameStateRef.current.playerActorId || "char:player"}/traits`,
      };
      const dir = sectionDir[section];

      const matches = (entry: any): boolean => {
        if (match.id && entry?.id && entry.id === match.id) return true;
        if (match.name && entry?.name && entry.name === match.name) return true;
        return false;
      };

      for (const entry of list) {
        if (!matches(entry)) continue;
        const id = entry?.id;
        if (typeof id !== "string" || id.trim().length === 0) {
          continue;
        }
        const filePath = `${dir}/${id}.json`;
        try {
          if (!vfsSession.readFile(filePath)) {
            continue;
          }
          vfsSession.mergeJson(filePath, { highlight: false });
        } catch (error) {
          console.warn(
            "[UI] Failed to clear highlight in VFS:",
            filePath,
            error,
          );
        }
      }

      setGameState((prev) => {
        if (!prev.character) {
          return prev;
        }
        const prevList = (prev.character as any)[section] as
          | Array<any>
          | undefined;
        if (!Array.isArray(prevList) || prevList.length === 0) {
          return prev;
        }
        const nextList = prevList.map((entry) =>
          matches(entry) ? { ...entry, highlight: false } : entry,
        );
        return {
          ...prev,
          character: {
            ...prev.character,
            [section]: nextList,
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
      const playerId = gameStateRef.current.playerActorId || "char:player";
      const filePathByKind: Record<string, string> = {
        inventory: `world/characters/${playerId}/inventory/${target.id}.json`,
        npcs: `world/characters/${target.id}/profile.json`,
        locations: `world/characters/${playerId}/views/locations/${target.id}.json`,
        knowledge: `world/characters/${playerId}/views/knowledge/${target.id}.json`,
        quests: `world/characters/${playerId}/views/quests/${target.id}.json`,
        factions: `world/characters/${playerId}/views/factions/${target.id}.json`,
        timeline: `world/characters/${playerId}/views/timeline/${target.id}.json`,
      };

      const filePath = filePathByKind[target.kind];
      if (filePath) {
        applyEntityHighlightClear(filePath);
      }

      setGameState((prev) => {
        const list = (prev as any)[target.kind] as Array<any> | undefined;
        if (!Array.isArray(list) || list.length === 0) {
          return prev;
        }
        const updated = list.map((entry) =>
          entry?.id === target.id ? { ...entry, highlight: false } : entry,
        );
        return {
          ...prev,
          [target.kind]: updated,
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
