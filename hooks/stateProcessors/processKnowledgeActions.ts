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
          unlocked: action.unlocked ?? false, // AI decides if player already knows the truth
          highlight: true,
        });
      }
    } else if (action.action === "update") {
      const index = newKnowledge.findIndex(
        (k) => (action.id && k.id === action.id) || k.title === action.title,
      );

      if (index !== -1) {
        let hasVisibleChange = false;

        // Update visible layer
        if (action.visible?.description) {
          newKnowledge[index].visible.description = action.visible.description;
          hasVisibleChange = true;
        }
        if (action.visible?.details) {
          newKnowledge[index].visible.details = action.visible.details;
          hasVisibleChange = true;
        }

        // Update hidden layer
        if (action.hidden?.fullTruth) {
          newKnowledge[index].hidden.fullTruth = action.hidden.fullTruth;
          if (newKnowledge[index].unlocked) {
            hasVisibleChange = true;
          }
        }
        if (action.hidden?.misconceptions) {
          newKnowledge[index].hidden.misconceptions =
            action.hidden.misconceptions;
          if (newKnowledge[index].unlocked) {
            hasVisibleChange = true;
          }
        }
        if (action.hidden?.toBeRevealed) {
          newKnowledge[index].hidden.toBeRevealed = action.hidden.toBeRevealed;
          if (newKnowledge[index].unlocked) {
            hasVisibleChange = true;
          }
        }

        // Update unlocked state
        if (action.unlocked !== undefined) {
          const wasUnlocked = newKnowledge[index].unlocked;
          newKnowledge[index].unlocked = action.unlocked;
          if (!wasUnlocked && action.unlocked) {
            hasVisibleChange = true;
          }
        }

        // Update metadata
        if (action.relatedTo) {
          newKnowledge[index].relatedTo = action.relatedTo;
          hasVisibleChange = true;
        }

        newKnowledge[index].highlight = hasVisibleChange;
        newKnowledge[index].lastModified = Date.now();
      }
    }
  });

  return { knowledge: newKnowledge, nextIds: updatedNextIds };
}
