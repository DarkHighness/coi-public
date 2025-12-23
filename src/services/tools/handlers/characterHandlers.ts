/**
 * Character Tool Handlers
 * Handles profile, attributes, skills, conditions, and traits
 */

import {
  QUERY_CHARACTER_PROFILE_TOOL,
  QUERY_CHARACTER_ATTRIBUTES_TOOL,
  QUERY_CHARACTER_SKILLS_TOOL,
  QUERY_CHARACTER_CONDITIONS_TOOL,
  QUERY_CHARACTER_TRAITS_TOOL,
  ADD_CHARACTER_ATTRIBUTE_TOOL,
  UPDATE_CHARACTER_ATTRIBUTE_TOOL,
  REMOVE_CHARACTER_ATTRIBUTE_TOOL,
  ADD_CHARACTER_SKILL_TOOL,
  UPDATE_CHARACTER_SKILL_TOOL,
  REMOVE_CHARACTER_SKILL_TOOL,
  ADD_CHARACTER_CONDITION_TOOL,
  UPDATE_CHARACTER_CONDITION_TOOL,
  REMOVE_CHARACTER_CONDITION_TOOL,
  ADD_CHARACTER_TRAIT_TOOL,
  UPDATE_CHARACTER_TRAIT_TOOL,
  REMOVE_CHARACTER_TRAIT_TOOL,
  UPDATE_CHARACTER_PROFILE_TOOL,
  getTypedArgs,
} from "../../tools";
import { registerToolHandler } from "../toolHandlerRegistry";
import { createSuccess, createError } from "../../gameDatabase";

// ============================================================================
// Query Handlers
// ============================================================================

registerToolHandler(QUERY_CHARACTER_PROFILE_TOOL, (args, ctx) => {
  const char = ctx.db.getCharacter();
  return createSuccess(
    {
      name: char.name,
      title: char.title,
      status: char.status,
      appearance: char.appearance,
      profession: char.profession,
      background: char.background,
      race: char.race,
    },
    "Character profile retrieved",
  );
});

registerToolHandler(QUERY_CHARACTER_ATTRIBUTES_TOOL, (args, ctx) => {
  return ctx.db.query("character", "attributes");
});

registerToolHandler(QUERY_CHARACTER_SKILLS_TOOL, (args, ctx) => {
  return ctx.db.query("character", "skills", args.query as string, {
    page: args.page as number,
    limit: args.limit as number,
  });
});

registerToolHandler(QUERY_CHARACTER_CONDITIONS_TOOL, (args, ctx) => {
  return ctx.db.query("character", "conditions", args.query as string, {
    page: args.page as number,
    limit: args.limit as number,
  });
});

registerToolHandler(QUERY_CHARACTER_TRAITS_TOOL, (args, ctx) => {
  return ctx.db.query("character", "hiddenTraits", args.query as string, {
    page: args.page as number,
    limit: args.limit as number,
  });
});

// ============================================================================
// Profile Update
// ============================================================================

registerToolHandler(UPDATE_CHARACTER_PROFILE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("update_character_profile", args);
  ctx.db.updateCharacterProfile(typedArgs);
  return createSuccess({ updated: Object.keys(typedArgs) }, "Profile updated");
});

// ============================================================================
// Attribute Handlers (Tool uses 'name', Entity uses 'label')
// ============================================================================

registerToolHandler(ADD_CHARACTER_ATTRIBUTE_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("add_character_attribute", args);

  if (!typedArgs.name) {
    return createError("Attribute name is required", "INVALID_DATA");
  }

  // Tool uses 'name', but entity uses 'label'
  if (db.getCharacterAttributeByLabel(typedArgs.name)) {
    return createError(
      `Attribute "${typedArgs.name}" already exists`,
      "ALREADY_EXISTS",
    );
  }

  db.addCharacterAttribute({
    label: typedArgs.name, // Map 'name' to 'label'
    value: typedArgs.value ?? 0,
    maxValue: typedArgs.maxValue ?? 100,
    color: typedArgs.color || "blue",
  });

  return createSuccess(
    { label: typedArgs.name },
    `Added attribute: ${typedArgs.name}`,
  );
});

registerToolHandler(UPDATE_CHARACTER_ATTRIBUTE_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("update_character_attribute", args);

  if (!typedArgs.name) {
    return createError("Attribute name is required", "INVALID_DATA");
  }

  // Tool uses 'name', but entity uses 'label'
  if (
    !db.updateCharacterAttribute(typedArgs.name, {
      value: typedArgs.value,
      maxValue: typedArgs.maxValue,
      color: typedArgs.color,
    })
  ) {
    return createError(`Attribute "${typedArgs.name}" not found`, "NOT_FOUND");
  }

  return createSuccess(
    { label: typedArgs.name },
    `Updated attribute: ${typedArgs.name}`,
  );
});

registerToolHandler(REMOVE_CHARACTER_ATTRIBUTE_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("remove_character_attribute", args);

  if (!typedArgs.name) {
    return createError("Attribute name is required", "INVALID_DATA");
  }

  // Tool uses 'name', but entity uses 'label'
  if (!db.removeCharacterAttribute(typedArgs.name)) {
    return createError(`Attribute "${typedArgs.name}" not found`, "NOT_FOUND");
  }

  return createSuccess(
    { removed: typedArgs.name },
    `Removed attribute: ${typedArgs.name}`,
  );
});

// ============================================================================
// Skill Handlers
// ============================================================================

registerToolHandler(ADD_CHARACTER_SKILL_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("add_character_skill", args);

  if (!typedArgs.id || !typedArgs.name) {
    return createError("Skill ID and name are required", "INVALID_DATA");
  }

  if (db.getCharacterSkillById(typedArgs.id)) {
    return createError(
      `Skill "${typedArgs.id}" already exists`,
      "ALREADY_EXISTS",
    );
  }

  // Entity's hidden schema: { trueDescription, hiddenEffects, drawbacks }
  db.addCharacterSkill({
    id: typedArgs.id,
    name: typedArgs.name,
    level: typedArgs.level || "Novice",
    visible: typedArgs.visible || { description: "", knownEffects: [] },
    hidden: typedArgs.hidden || { trueDescription: "", hiddenEffects: [] },
    category: typedArgs.category,
    icon: typedArgs.icon,
    notes: typedArgs.notes,
    unlocked: false,
    highlight: true,
  });

  return createSuccess(
    { id: typedArgs.id, name: typedArgs.name },
    `Added skill: ${typedArgs.name}`,
  );
});

registerToolHandler(UPDATE_CHARACTER_SKILL_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("update_character_skill", args);

  if (!typedArgs.id) {
    return createError("Skill ID is required", "INVALID_DATA");
  }

  if (!db.updateCharacterSkill(typedArgs.id, typedArgs)) {
    return createError(`Skill "${typedArgs.id}" not found`, "NOT_FOUND");
  }

  return createSuccess({ id: typedArgs.id }, `Updated skill: ${typedArgs.id}`);
});

registerToolHandler(REMOVE_CHARACTER_SKILL_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("remove_character_skill", args);

  if (!typedArgs.id) {
    return createError("Skill ID is required", "INVALID_DATA");
  }

  if (!db.removeCharacterSkill(typedArgs.id)) {
    return createError(`Skill "${typedArgs.id}" not found`, "NOT_FOUND");
  }

  return createSuccess(
    { removed: typedArgs.id },
    `Removed skill: ${typedArgs.id}`,
  );
});

// ============================================================================
// Condition Handlers
// ============================================================================

registerToolHandler(ADD_CHARACTER_CONDITION_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("add_character_condition", args);

  if (!typedArgs.id || !typedArgs.name) {
    return createError("Condition ID and name are required", "INVALID_DATA");
  }

  if (db.getCharacterConditionById(typedArgs.id)) {
    return createError(
      `Condition "${typedArgs.id}" already exists`,
      "ALREADY_EXISTS",
    );
  }

  // Entity's visible: { description, perceivedSeverity }
  // Entity's hidden: { trueCause, actualSeverity, progression, cure }
  db.addCharacterCondition({
    id: typedArgs.id,
    name: typedArgs.name,
    type: typedArgs.type || "normal",
    visible: typedArgs.visible || { description: "" },
    hidden: typedArgs.hidden || { trueCause: "" },
    effects: typedArgs.effects,
    icon: typedArgs.icon,
    unlocked: false,
    highlight: true,
  });

  return createSuccess(
    { id: typedArgs.id, name: typedArgs.name },
    `Added condition: ${typedArgs.name}`,
  );
});

registerToolHandler(UPDATE_CHARACTER_CONDITION_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("update_character_condition", args);

  if (!typedArgs.id) {
    return createError("Condition ID is required", "INVALID_DATA");
  }

  if (!db.updateCharacterCondition(typedArgs.id, typedArgs)) {
    return createError(`Condition "${typedArgs.id}" not found`, "NOT_FOUND");
  }

  return createSuccess(
    { id: typedArgs.id },
    `Updated condition: ${typedArgs.id}`,
  );
});

registerToolHandler(REMOVE_CHARACTER_CONDITION_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("remove_character_condition", args);

  if (!typedArgs.id) {
    return createError("Condition ID is required", "INVALID_DATA");
  }

  if (!db.removeCharacterCondition(typedArgs.id)) {
    return createError(`Condition "${typedArgs.id}" not found`, "NOT_FOUND");
  }

  return createSuccess(
    { removed: typedArgs.id },
    `Removed condition: ${typedArgs.id}`,
  );
});

// ============================================================================
// Hidden Trait Handlers
// ============================================================================

registerToolHandler(ADD_CHARACTER_TRAIT_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("add_character_trait", args);

  if (!typedArgs.id || !typedArgs.name) {
    return createError("Trait ID and name are required", "INVALID_DATA");
  }

  if (db.getCharacterTraitById(typedArgs.id)) {
    return createError(
      `Trait "${typedArgs.id}" already exists`,
      "ALREADY_EXISTS",
    );
  }

  db.addCharacterTrait({
    id: typedArgs.id,
    name: typedArgs.name,
    description: typedArgs.description || "",
    effects: typedArgs.effects || [],
    triggerConditions: typedArgs.triggerConditions,
    unlocked: false,
    highlight: true,
  });

  return createSuccess(
    { id: typedArgs.id, name: typedArgs.name },
    `Added trait: ${typedArgs.name}`,
  );
});

registerToolHandler(UPDATE_CHARACTER_TRAIT_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("update_character_trait", args);

  if (!typedArgs.id) {
    return createError("Trait ID is required", "INVALID_DATA");
  }

  if (!db.updateCharacterTrait(typedArgs.id, typedArgs)) {
    return createError(`Trait "${typedArgs.id}" not found`, "NOT_FOUND");
  }

  return createSuccess({ id: typedArgs.id }, `Updated trait: ${typedArgs.id}`);
});

registerToolHandler(REMOVE_CHARACTER_TRAIT_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("remove_character_trait", args);

  if (!typedArgs.id) {
    return createError("Trait ID is required", "INVALID_DATA");
  }

  if (!db.removeCharacterTrait(typedArgs.id)) {
    return createError(`Trait "${typedArgs.id}" not found`, "NOT_FOUND");
  }

  return createSuccess(
    { removed: typedArgs.id },
    `Removed trait: ${typedArgs.id}`,
  );
});
