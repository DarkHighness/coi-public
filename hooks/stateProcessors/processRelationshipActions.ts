import { Relationship, RelationshipAction, GameState } from "../../types";

/**
 * Process relationship actions with deduplication and ID management
 */
export function processRelationshipActions(
  currentRelationships: Relationship[],
  actions: RelationshipAction[] | undefined,
  nextIds: GameState["nextIds"],
): { relationships: Relationship[]; nextIds: GameState["nextIds"] } {
  if (!actions || actions.length === 0) {
    return { relationships: currentRelationships, nextIds };
  }

  let newRelationships = [...currentRelationships];
  const updatedNextIds = { ...nextIds };

  actions.forEach((act) => {
    const idx = newRelationships.findIndex(
      (r) => (act.id && r.id === act.id) || r.name === act.name,
    );

    if (act.action === "add" && idx === -1) {
      const newId = act.id || updatedNextIds.npc++;
      newRelationships.push({
        id: newId,
        name: act.name,
        visible: {
          description: act.visible?.description || "Unknown",
          appearance: act.visible?.appearance,
          status: act.visible?.status || "Neutral",
          currentImpression: act.visible?.currentImpression,
        },
        hidden: {
          realPersonality: act.hidden?.realPersonality || "Unknown",
          realMotives: act.hidden?.realMotives || "Unknown",
          secrets: act.hidden?.secrets || [],
          trueAffinity: act.hidden?.trueAffinity || act.affinity || 50,
        },
        relationshipType: act.relationshipType || "Neutral",
        affinity: act.affinity || 50,
        affinityKnown: act.affinityKnown ?? true,
        createdAt: Date.now(),
        lastModified: Date.now(),
        notes: act.notes,
      });
    } else if (act.action === "remove" && idx !== -1) {
      newRelationships.splice(idx, 1);
    } else if (
      (act.action === "update" || act.action === "add") &&
      idx !== -1
    ) {
      // Allow 'add' to update if exists

      // Update visible layer
      if (act.visible?.description) {
        newRelationships[idx].visible.description = act.visible.description;
      }
      if (act.visible?.status) {
        newRelationships[idx].visible.status = act.visible.status;
      }
      if (act.visible?.appearance) {
        newRelationships[idx].visible.appearance = act.visible.appearance;
      }
      if (act.visible?.currentImpression) {
        newRelationships[idx].visible.currentImpression =
          act.visible.currentImpression;
      }

      // Update hidden layer
      if (act.hidden?.realPersonality) {
        newRelationships[idx].hidden.realPersonality =
          act.hidden.realPersonality;
      }
      if (act.hidden?.realMotives) {
        newRelationships[idx].hidden.realMotives = act.hidden.realMotives;
      }
      if (act.hidden?.secrets) {
        newRelationships[idx].hidden.secrets = act.hidden.secrets;
      }
      if (act.hidden?.trueAffinity !== undefined) {
        newRelationships[idx].hidden.trueAffinity = act.hidden.trueAffinity;
      }

      // Update affinity and metadata
      if (act.affinity !== undefined) {
        newRelationships[idx].affinity = act.affinity;
      }
      if (act.affinityKnown !== undefined) {
        newRelationships[idx].affinityKnown = act.affinityKnown;
      }
      if (act.relationshipType) {
        newRelationships[idx].relationshipType = act.relationshipType;
      }
      if (act.notes) {
        newRelationships[idx].notes = act.notes;
      }

      newRelationships[idx].lastModified = Date.now();
    } else if (act.action === "update" && idx === -1) {
      console.warn(
        `[processRelationshipActions] Update failed: "${act.name}" not found`,
      );
    }
  });

  return { relationships: newRelationships, nextIds: updatedNextIds };
}
