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
          relationshipType: act.visible?.relationshipType || "Neutral",
          currentImpression: act.visible?.currentImpression,
          affinity: act.visible?.affinity || 50,
          affinityKnown: act.visible?.affinityKnown ?? true,
        },
        hidden: {
          realPersonality: act.hidden?.realPersonality || "Unknown",
          realMotives: act.hidden?.realMotives || "Unknown",
          secrets: act.hidden?.secrets || [],
          trueAffinity: act.hidden?.trueAffinity || act.visible?.affinity || 50,
          relationshipType: act.hidden?.relationshipType || "Neutral",
          status: act.hidden?.status || "Normal",
        },
        createdAt: Date.now(),
        lastModified: Date.now(),
        notes: act.notes,
        unlocked: act.unlocked ?? false, // SPECIAL: AI sets true only with mind-reading ability
        highlight: true,
      });
    } else if (act.action === "remove" && idx !== -1) {
      newRelationships.splice(idx, 1);
    } else if (
      (act.action === "update" || act.action === "add") &&
      idx !== -1
    ) {
      // Allow 'add' to update if exists
      let hasVisibleChange = false;

      // Update visible layer
      if (act.visible?.description) {
        newRelationships[idx].visible.description = act.visible.description;
        hasVisibleChange = true;
      }
      if (act.visible?.relationshipType) {
        newRelationships[idx].visible.relationshipType =
          act.visible.relationshipType;
        hasVisibleChange = true;
      }
      if (act.visible?.appearance) {
        newRelationships[idx].visible.appearance = act.visible.appearance;
        hasVisibleChange = true;
      }
      if (act.visible?.currentImpression) {
        newRelationships[idx].visible.currentImpression =
          act.visible.currentImpression;
        hasVisibleChange = true;
      }
      if (act.visible?.affinity !== undefined) {
        newRelationships[idx].visible.affinity = act.visible.affinity;
        hasVisibleChange = true;
      }
      if (act.visible?.affinityKnown !== undefined) {
        newRelationships[idx].visible.affinityKnown = act.visible.affinityKnown;
        hasVisibleChange = true;
      }

      // Update hidden layer (only highlights if unlocked)
      if (act.hidden?.realPersonality) {
        newRelationships[idx].hidden.realPersonality =
          act.hidden.realPersonality;
        if (newRelationships[idx].unlocked) {
          hasVisibleChange = true;
        }
      }
      if (act.hidden?.realMotives) {
        newRelationships[idx].hidden.realMotives = act.hidden.realMotives;
        if (newRelationships[idx].unlocked) {
          hasVisibleChange = true;
        }
      }
      if (act.hidden?.secrets) {
        newRelationships[idx].hidden.secrets = act.hidden.secrets;
        if (newRelationships[idx].unlocked) {
          hasVisibleChange = true;
        }
      }
      if (act.hidden?.trueAffinity !== undefined) {
        newRelationships[idx].hidden.trueAffinity = act.hidden.trueAffinity;
        if (newRelationships[idx].unlocked) {
          hasVisibleChange = true;
        }
      }
      if (act.hidden?.relationshipType) {
        newRelationships[idx].hidden.relationshipType =
          act.hidden.relationshipType;
        if (newRelationships[idx].unlocked) {
          hasVisibleChange = true;
        }
      }
      if (act.hidden?.status) {
        newRelationships[idx].hidden.status = act.hidden.status;
        if (newRelationships[idx].unlocked) {
          hasVisibleChange = true;
        }
      }

      // Update unlocked state (SPECIAL: requires mind-reading/psychic abilities)
      if (act.unlocked !== undefined) {
        const wasUnlocked = newRelationships[idx].unlocked;
        newRelationships[idx].unlocked = act.unlocked;
        if (!wasUnlocked && act.unlocked) {
          hasVisibleChange = true;
        }
      }

      if (act.notes) {
        newRelationships[idx].notes = act.notes;
        hasVisibleChange = true;
      }

      newRelationships[idx].highlight = hasVisibleChange;
      newRelationships[idx].lastModified = Date.now();
    } else if (act.action === "update" && idx === -1) {
      console.warn(
        `[processRelationshipActions] Update failed: "${act.name}" not found`,
      );
    }
  });

  return { relationships: newRelationships, nextIds: updatedNextIds };
}
