import { CharacterStatus, CharacterUpdates } from "../../types";

/**
 * Process character actions (attributes, skills, status updates)
 */
export function processCharacterActions(
  currentCharacter: CharacterStatus,
  updates: CharacterUpdates | undefined,
): CharacterStatus {
  if (!updates) {
    return currentCharacter;
  }

  const newCharacter = { ...currentCharacter };

  // 1. Profile Updates
  if (updates.profile) {
    if (updates.profile.status) newCharacter.status = updates.profile.status;
    if (updates.profile.appearance)
      newCharacter.appearance = updates.profile.appearance;
    if (updates.profile.profession)
      newCharacter.profession = updates.profile.profession;
    if (updates.profile.background)
      newCharacter.background = updates.profile.background;
    if (updates.profile.race) newCharacter.race = updates.profile.race;
  }

  // 2. Attribute Updates
  if (updates.attributes) {
    updates.attributes.forEach((act) => {
      const idx = newCharacter.attributes.findIndex(
        (a) => a.label === act.name,
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

  // 4. Condition Updates
  if (updates.conditions) {
    updates.conditions.forEach((act) => {
      const idx = newCharacter.conditions.findIndex(
        (c) => (act.id && c.id === act.id) || c.name === act.name,
      );

      if (act.action === "add" && idx === -1) {
        newCharacter.conditions.push({
          id: act.id || Date.now() + Math.random(),
          name: act.name,
          type: act.type || "neutral",
          visible: {
            description: act.visible?.description || "Unknown condition",
            perceivedSeverity: act.visible?.perceivedSeverity || "Unknown",
          },
          hidden: {
            trueCause: act.hidden?.trueCause || "Unknown",
            actualSeverity: act.hidden?.actualSeverity || 1,
            progression: act.hidden?.progression || "Stable",
            cure: act.hidden?.cure,
          },
          effects: {
            visible: act.effects?.visible || [],
            hidden: act.effects?.hidden || [],
          },
          startTime: Date.now(),
        });
      } else if (act.action === "remove" && idx !== -1) {
        newCharacter.conditions.splice(idx, 1);
      } else if (act.action === "update" && idx !== -1) {
        if (act.type) newCharacter.conditions[idx].type = act.type;

        if (act.visible?.description)
          newCharacter.conditions[idx].visible.description =
            act.visible.description;
        if (act.visible?.perceivedSeverity)
          newCharacter.conditions[idx].visible.perceivedSeverity =
            act.visible.perceivedSeverity;

        if (act.hidden?.trueCause)
          newCharacter.conditions[idx].hidden.trueCause = act.hidden.trueCause;
        if (act.hidden?.actualSeverity)
          newCharacter.conditions[idx].hidden.actualSeverity =
            act.hidden.actualSeverity;
        if (act.hidden?.progression)
          newCharacter.conditions[idx].hidden.progression =
            act.hidden.progression;
        if (act.hidden?.cure)
          newCharacter.conditions[idx].hidden.cure = act.hidden.cure;

        if (act.effects?.visible)
          newCharacter.conditions[idx].effects.visible = act.effects.visible;
        if (act.effects?.hidden)
          newCharacter.conditions[idx].effects.hidden = act.effects.hidden;
      }
    });
  }

  // 5. Hidden Trait Updates
  if (updates.hiddenTraits) {
    if (!newCharacter.hiddenTraits) newCharacter.hiddenTraits = [];

    updates.hiddenTraits.forEach((act) => {
      const idx = newCharacter.hiddenTraits!.findIndex(
        (t) => (act.id && t.id === act.id) || t.name === act.name,
      );

      if (act.action === "add" && idx === -1) {
        newCharacter.hiddenTraits!.push({
          id: act.id || Date.now() + Math.random(),
          name: act.name,
          description: act.description || "Unknown trait",
          effects: act.effects || [],
          triggerConditions: act.triggerConditions || [],
          discovered: act.discovered || false,
        });
      } else if (act.action === "remove" && idx !== -1) {
        newCharacter.hiddenTraits!.splice(idx, 1);
      } else if (act.action === "update" && idx !== -1) {
        if (act.description)
          newCharacter.hiddenTraits![idx].description = act.description;
        if (act.effects) newCharacter.hiddenTraits![idx].effects = act.effects;
        if (act.triggerConditions)
          newCharacter.hiddenTraits![idx].triggerConditions =
            act.triggerConditions;
        if (act.discovered !== undefined)
          newCharacter.hiddenTraits![idx].discovered = act.discovered;
      }
    });
  }

  return newCharacter;
}
