import { KnowledgeEntry, KnowledgeAction, GameState } from "../../types";

/**
 * Process knowledge actions with deduplication and ID management
 */
export function processKnowledgeActions(
  currentKnowledge: KnowledgeEntry[],
  actions: KnowledgeAction[] | undefined,
  nextIds: GameState["nextIds"],
  currentTime: string,
): { knowledge: KnowledgeEntry[]; nextIds: GameState["nextIds"] } {
  if (!actions || actions.length === 0) {
    return { knowledge: currentKnowledge, nextIds };
  }

  let newKnowledge = [...currentKnowledge];
  const updatedNextIds = { ...nextIds };

  actions.forEach((action) => {
    if (action.action === "add") {
      // Check for duplicates by ID or Title
      const exists = newKnowledge.find(
        (k) => (action.id && k.id === action.id) || k.title === action.title,
      );

      if (!exists) {
        newKnowledge.push({
          id: action.id || updatedNextIds.knowledge++,
          title: action.title,
          category: action.category,
          visible: {
            description: action.visible?.description || "",
            details: action.visible?.details,
          },
          hidden: {
            fullTruth: action.hidden?.fullTruth || "Unknown",
            misconceptions: action.hidden?.misconceptions,
            toBeRevealed: action.hidden?.toBeRevealed,
          },
          discoveredAt: action.discoveredAt || currentTime,
          createdAt: Date.now(),
          lastModified: Date.now(),
          relatedTo: action.relatedTo,
        });
      }
    } else if (action.action === "update") {
      const index = newKnowledge.findIndex(
        (k) => (action.id && k.id === action.id) || k.title === action.title,
      );

      if (index !== -1) {
        // Update visible layer
        if (action.visible?.description) {
          newKnowledge[index].visible.description = action.visible.description;
        }
        if (action.visible?.details) {
          newKnowledge[index].visible.details = action.visible.details;
        }

        // Update hidden layer
        if (action.hidden?.fullTruth) {
          newKnowledge[index].hidden.fullTruth = action.hidden.fullTruth;
        }
        if (action.hidden?.misconceptions) {
          newKnowledge[index].hidden.misconceptions =
            action.hidden.misconceptions;
        }
        if (action.hidden?.toBeRevealed) {
          newKnowledge[index].hidden.toBeRevealed = action.hidden.toBeRevealed;
        }

        // Update metadata
        if (action.relatedTo) {
          newKnowledge[index].relatedTo = action.relatedTo;
        }
        newKnowledge[index].lastModified = Date.now();
      }
    }
  });

  return { knowledge: newKnowledge, nextIds: updatedNextIds };
}
