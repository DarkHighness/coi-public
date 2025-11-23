import { Quest, QuestAction, GameState } from "../../types";

/**
 * Process quest actions with deduplication and ID management
 */
export function processQuestActions(
  currentQuests: Quest[],
  actions: QuestAction[] | undefined,
  nextIds: GameState["nextIds"],
): { quests: Quest[]; nextIds: GameState["nextIds"] } {
  if (!actions || actions.length === 0) {
    return { quests: currentQuests, nextIds };
  }

  let newQuests = [...currentQuests];
  const updatedNextIds = { ...nextIds };

  actions.forEach((act) => {
    // Handle legacy string IDs
    const actId = typeof act.id === "string" ? parseInt(act.id) : act.id;
    const idx = newQuests.findIndex(
      (q) => (actId && q.id === actId) || q.title === act.title,
    );

    if (act.action === "add" && idx === -1) {
      const newId = actId || updatedNextIds.quest++;
      newQuests.push({
        id: newId,
        title: act.title || "Unknown Quest",
        type: act.type || "main",
        status: "active",
        visible: {
          description: act.visible?.description || "",
          objectives: act.visible?.objectives || [],
        },
        hidden: {
          trueDescription: act.hidden?.trueDescription || "",
          trueObjectives: act.hidden?.trueObjectives || [],
          secretOutcome: act.hidden?.secretOutcome || "",
        },
        createdAt: Date.now(),
        lastModified: Date.now(),
      });
    } else if (idx !== -1) {
      if (act.action === "update") {
        if (act.title) newQuests[idx].title = act.title;
        if (act.type) newQuests[idx].type = act.type;

        if (act.visible?.description || act.visible?.objectives) {
          if (!newQuests[idx].visible) {
            newQuests[idx].visible = { description: "", objectives: [] };
          }
          if (act.visible.description)
            newQuests[idx].visible.description = act.visible.description;
          if (act.visible.objectives)
            newQuests[idx].visible.objectives = act.visible.objectives;
        }

        if (
          act.hidden?.trueDescription ||
          act.hidden?.trueObjectives ||
          act.hidden?.secretOutcome
        ) {
          if (!newQuests[idx].hidden) {
            newQuests[idx].hidden = {
              trueDescription: "",
              trueObjectives: [],
              secretOutcome: "",
            };
          }
          if (act.hidden.trueDescription)
            newQuests[idx].hidden.trueDescription = act.hidden.trueDescription;
          if (act.hidden.trueObjectives)
            newQuests[idx].hidden.trueObjectives = act.hidden.trueObjectives;
          if (act.hidden.secretOutcome)
            newQuests[idx].hidden.secretOutcome = act.hidden.secretOutcome;
        }

        newQuests[idx].lastModified = Date.now();
      } else if (act.action === "complete") {
        newQuests[idx].status = "completed";
        newQuests[idx].lastModified = Date.now();
      } else if (act.action === "fail") {
        newQuests[idx].status = "failed";
        newQuests[idx].lastModified = Date.now();
      }
    } else if (act.action !== "add") {
      console.warn(
        `[processQuestActions] Action "${act.action}" failed: quest "${act.id}" not found`,
      );
    }
  });

  return { quests: newQuests, nextIds: updatedNextIds };
}
