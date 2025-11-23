import { CharacterStatus, CharacterUpdates } from "../../types";

/**
 * Process character actions (attributes, skills, status updates)
 */
export function processCharacterActions(
  currentCharacter: CharacterStatus,
  updates: CharacterUpdates | undefined
): CharacterStatus {
  if (!updates) {
    return currentCharacter;
  }

  const newCharacter = { ...currentCharacter };

  // 1. Profile Updates
  if (updates.profile) {
    if (updates.profile.status) newCharacter.status = updates.profile.status;
    if (updates.profile.appearance) newCharacter.appearance = updates.profile.appearance;
    if (updates.profile.profession) newCharacter.profession = updates.profile.profession;
    if (updates.profile.background) newCharacter.background = updates.profile.background;
    if (updates.profile.race) newCharacter.race = updates.profile.race;
  }

  // 2. Attribute Updates
  if (updates.attributes) {
    updates.attributes.forEach((act) => {
      const idx = newCharacter.attributes.findIndex(
        (a) => a.label === act.name
      );

      if (act.action === "add" && idx === -1) {
        newCharacter.attributes.push({
          label: act.name,
          value: act.value || 0,
          maxValue: act.maxValue || 100,
          color: (act.color as any) || "gray",
        });
      } else if (act.action === "remove" && idx !== -1) {
        newCharacter.attributes.splice(idx, 1);
      } else if (act.action === "update" && idx !== -1) {
        if (act.value !== undefined) {
          newCharacter.attributes[idx].value = act.value;
        }
        if (act.maxValue !== undefined) {
          newCharacter.attributes[idx].maxValue = act.maxValue;
        }
        if (act.color) {
          newCharacter.attributes[idx].color = act.color as any;
        }
      }
    });
  }

  // 3. Skill Updates
  if (updates.skills) {
    updates.skills.forEach((act) => {
      const idx = newCharacter.skills.findIndex((s) => s.name === act.name);

      if (act.action === "add" && idx === -1) {
        newCharacter.skills.push({
          id: Date.now() + Math.random(), // Temporary ID
          name: act.name,
          level: act.level || "Novice",
          visible: {
            description: act.description || "",
            knownEffects: [],
          },
          hidden: {
            trueDescription: "",
            hiddenEffects: [],
            drawbacks: [],
          },
        });
      } else if (act.action === "remove" && idx !== -1) {
        newCharacter.skills.splice(idx, 1);
      } else if (act.action === "update" && idx !== -1) {
        if (act.level) newCharacter.skills[idx].level = act.level;
        if (act.description) {
          newCharacter.skills[idx].visible.description = act.description;
        }
      }
    });
  }

  return newCharacter;
}
