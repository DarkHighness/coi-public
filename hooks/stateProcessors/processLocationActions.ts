import { Location, LocationAction, GameState } from "../../types";

/**
 * Process location actions with deduplication and ID management
 */
export function processLocationActions(
  currentLocations: Location[],
  currentLocation: string,
  actions: LocationAction[] | undefined,
  nextIds: GameState["nextIds"],
): {
  locations: Location[];
  currentLocation: string;
  nextIds: GameState["nextIds"];
} {
  if (!actions || actions.length === 0) {
    return { locations: currentLocations, currentLocation, nextIds };
  }

  let newLocations = [...currentLocations];
  let newCurrentLocation = currentLocation;
  const updatedNextIds = { ...nextIds };

  actions.forEach((act) => {
    // Update current location
    if (act.type === "current" && act.action === "update") {
      newCurrentLocation = act.name;
    }

    // Rich Location Update/Add
    const locIdx = newLocations.findIndex(
      (l) => (act.id && l.id === act.id) || l.name === act.name,
    );

    if (locIdx === -1) {
      // Add new location
      if (act.visible?.description) {
        const newId = act.id || updatedNextIds.location++;
        newLocations.push({
          id: newId,
          name: act.name,
          visible: {
            description: act.visible?.description || "Unknown",
            knownFeatures: act.visible?.knownFeatures || [],
          },
          hidden: {
            fullDescription: act.hidden?.fullDescription || "Unknown",
            hiddenFeatures: act.hidden?.hiddenFeatures || [],
            secrets: act.hidden?.secrets || [],
          },
          lore: act.lore,
          isVisited: act.type === "current",
          environment: act.environment,
          notes: act.notes,
          createdAt: Date.now(),
          unlocked: act.unlocked ?? false, // AI decides if secrets are already known
          highlight: true,
        });
      }
    } else {
      // Update existing location
      let hasVisibleChange = false;

      // Update visible layer
      if (act.visible?.description || act.visible?.knownFeatures) {
        if (!newLocations[locIdx].visible) {
          newLocations[locIdx].visible = {
            description: "Unknown",
            knownFeatures: [],
          };
        }
        if (act.visible.description) {
          newLocations[locIdx].visible.description = act.visible.description;
          hasVisibleChange = true;
        }
        if (act.visible.knownFeatures) {
          newLocations[locIdx].visible.knownFeatures =
            act.visible.knownFeatures;
          hasVisibleChange = true;
        }
      }

      // Update hidden layer
      if (
        act.hidden?.fullDescription ||
        act.hidden?.hiddenFeatures ||
        act.hidden?.secrets
      ) {
        if (!newLocations[locIdx].hidden) {
          newLocations[locIdx].hidden = {
            fullDescription: "Unknown",
            hiddenFeatures: [],
            secrets: [],
          };
        }
        if (act.hidden.fullDescription) {
          newLocations[locIdx].hidden.fullDescription =
            act.hidden.fullDescription;
          if (newLocations[locIdx].unlocked) {
            hasVisibleChange = true;
          }
        }
        if (act.hidden.hiddenFeatures) {
          newLocations[locIdx].hidden.hiddenFeatures =
            act.hidden.hiddenFeatures;
          if (newLocations[locIdx].unlocked) {
            hasVisibleChange = true;
          }
        }
        if (act.hidden.secrets) {
          newLocations[locIdx].hidden.secrets = act.hidden.secrets;
          if (newLocations[locIdx].unlocked) {
            hasVisibleChange = true;
          }
        }
      }

      // Update unlocked state
      if (act.unlocked !== undefined) {
        const wasUnlocked = newLocations[locIdx].unlocked;
        newLocations[locIdx].unlocked = act.unlocked;
        if (!wasUnlocked && act.unlocked) {
          hasVisibleChange = true;
        }
      }

      // Update metadata
      if (act.lore) {
        newLocations[locIdx].lore = act.lore;
        hasVisibleChange = true;
      }
      if (act.type === "current") {
        newLocations[locIdx].isVisited = true;
        if (!newLocations[locIdx].discoveredAt) {
          newLocations[locIdx].discoveredAt = Date.now();
        }
      }
      if (act.environment) {
        newLocations[locIdx].environment = act.environment;
        hasVisibleChange = true;
      }
      if (act.notes) {
        newLocations[locIdx].notes = act.notes;
        hasVisibleChange = true;
      }

      newLocations[locIdx].highlight = hasVisibleChange;
    }
  });

  return {
    locations: newLocations,
    currentLocation: newCurrentLocation,
    nextIds: updatedNextIds,
  };
}
