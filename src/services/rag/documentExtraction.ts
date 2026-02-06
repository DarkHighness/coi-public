import type {
  GameState,
  StorySegment,
  InventoryItem,
  Location,
  KnowledgeEntry,
  Quest,
  TimelineEvent,
  NPC,
  StoryOutline,
  Skill,
  Condition,
  HiddenTrait,
  CharacterAttribute,
  Faction,
} from "../../types";
import type { DocumentType } from "./types";

interface ExtractedDocument {
  entityId: string;
  type: DocumentType;
  content: string;
  importance?: number;
  unlocked?: boolean;
}

export function extractDocumentsFromState(
  state: GameState,
  changedEntityIds: string[],
): ExtractedDocument[] {
  const documents: ExtractedDocument[] = [];

  for (const entityId of changedEntityIds) {
    const [type, id] = entityId.split(":");

    switch (type) {
      case "story": {
        const node = state.nodes[id];
        if (node && node.text) {
          documents.push({
            entityId,
            type: "story",
            content: extractStoryContent(node),
            importance: 0.8,
          });
        }
        break;
      }

      case "npc": {
        const npc =
          state.npcs?.find((n) => n.id === entityId) ||
          (id ? state.npcs?.find((n) => n.id === `char:${id}`) : undefined);
        if (npc) {
          documents.push({
            entityId,
            type: "npc",
            content: extractNPCContent(npc),
            importance: 0.9,
          });
        }
        break;
      }

      case "char": {
        const actorId = entityId;
        const actorProfile =
          state.actors?.find((b) => b?.profile?.id === actorId)?.profile ||
          state.npcs?.find((n) => n.id === actorId);
        if (actorProfile) {
          documents.push({
            entityId,
            type: actorProfile.kind === "npc" ? "npc" : "outline",
            content: extractNPCContent(actorProfile as any),
            importance: actorProfile.kind === "npc" ? 0.9 : 0.7,
          });
        }
        break;
      }

      case "loc":
      case "location": {
        const location = state.locations?.find((l) => l.id === entityId);
        if (location) {
          documents.push({
            entityId,
            type: "location",
            content: extractLocationContent(location),
            importance: 0.7,
          });
        }
        break;
      }

      case "inv":
      case "item": {
        const item =
          state.inventory?.find((i) => i.id === entityId) ||
          Object.values(state.locationItemsByLocationId || {})
            .flat()
            .find((i) => i?.id === entityId);
        if (item) {
          documents.push({
            entityId,
            type: "item",
            content: extractItemContent(item),
            importance: 0.6,
            unlocked: item.unlocked,
          });
        }
        break;
      }

      case "know":
      case "knowledge": {
        const knowledge = state.knowledge?.find((k) => k.id === entityId);
        if (knowledge) {
          documents.push({
            entityId,
            type: "knowledge",
            content: extractKnowledgeContent(knowledge),
            importance: 0.5,
            unlocked: knowledge.unlocked,
          });
        }
        break;
      }

      case "quest": {
        const quest = state.quests?.find((q) => q.id === entityId);
        if (quest) {
          documents.push({
            entityId,
            type: "quest",
            content: extractQuestContent(quest),
            importance: quest.status === "active" ? 0.9 : 0.5,
          });
        }
        break;
      }

      case "evt":
      case "event": {
        const event = state.timeline?.find((e) => e.id === entityId);
        if (event) {
          documents.push({
            entityId,
            type: "event",
            content: extractEventContent(event),
            importance: 0.6,
          });
        }
        break;
      }

      case "outline": {
        // Outline documents use special IDs like "outline:world", "outline:goal", etc.
        if (state.outline) {
          const content = extractOutlineContent(state.outline, state.worldInfo, id);
          if (content) {
            documents.push({
              entityId,
              type: "outline",
              content,
              importance: 1.0, // Highest importance for core story outline
            });
          }
        }
        break;
      }

      case "skill": {
        const skill = state.character?.skills?.find(
          (s) => s.id === entityId || s.name === id,
        );
        if (skill) {
          documents.push({
            entityId,
            type: "outline", // Using 'outline' type as skills are part of character
            content: extractSkillContent(skill),
            importance: 0.7,
            unlocked: skill.unlocked,
          });
        }
        break;
      }

      case "condition": {
        const condition = state.character?.conditions?.find(
          (c) => c.id === entityId || c.name === id,
        );
        if (condition) {
          documents.push({
            entityId,
            type: "outline", // Using 'outline' type as conditions are part of character
            content: extractConditionContent(condition),
            importance: 0.8,
            unlocked: condition.unlocked,
          });
        }
        break;
      }

      case "trait": {
        const trait = state.character?.hiddenTraits?.find(
          (t) => t.id === entityId || t.name === id,
        );
        if (trait) {
          documents.push({
            entityId,
            type: "outline", // Using 'outline' type as traits are part of character
            content: extractHiddenTraitContent(trait),
            importance: 0.9,
            unlocked: trait.unlocked,
          });
        }
        break;
      }

      case "attr":
      case "attribute": {
        const attr = state.character?.attributes?.find((a) => a.label === id);
        if (attr) {
          documents.push({
            entityId,
            type: "outline", // Using 'outline' type as attributes are part of character
            content: extractAttributeContent(attr),
            importance: 0.6,
          });
        }
        break;
      }

      case "fac":
      case "faction": {
        const faction = state.factions?.find((f) => f.id === entityId);
        if (faction) {
          documents.push({
            entityId,
            type: "outline", // Using 'outline' type as factions are world-level entities
            content: extractFactionContent(faction),
            importance: 0.8,
            unlocked: faction.unlocked,
          });
        }
        break;
      }
    }
  }

  return documents;
}

function extractStoryContent(node: StorySegment): string {
  const parts: string[] = [];
  const turn = node.stateSnapshot?.turnNumber || "Unknown";

  parts.push(`<segment id="${node.id}" turn="${turn}">`);

  if (node.role === "user") {
    parts.push(`  <player_action>\n    ${node.text}\n  </player_action>`);
  } else {
    parts.push(`  <narrative>\n    ${node.text}\n  </narrative>`);
  }

  // Contextual Info
  if (node.stateSnapshot) {
    parts.push("  <context>");
    if (node.stateSnapshot.currentLocation) {
      parts.push(
        `    <location>${node.stateSnapshot.currentLocation}</location>`,
      );
    }
    if (node.stateSnapshot.time) {
      parts.push(`    <time>${JSON.stringify(node.stateSnapshot.time)}</time>`);
    }
    if (node.atmosphere) {
      parts.push(
        `    <atmosphere>${JSON.stringify(node.atmosphere)}</atmosphere>`,
      );
    }
    parts.push("  </context>");
  }

  parts.push("</segment>");
  return parts.join("\n");
}

function extractNPCContent(npc: NPC): string {
  const parts: string[] = [];
  parts.push(`<npc id="${npc.id}">`);

  // Icon
  if (npc.icon) parts.push(`  <icon>${npc.icon}</icon>`);

  // Visible info
  if (npc.visible) {
    parts.push("  <visible>");
    if (npc.visible.name) parts.push(`    <name>${npc.visible.name}</name>`);
    if (npc.visible.title) parts.push(`    <title>${npc.visible.title}</title>`);
    if (npc.visible.roleTag)
      parts.push(`    <role_tag>${npc.visible.roleTag}</role_tag>`);
    if (npc.visible.profession)
      parts.push(`    <profession>${npc.visible.profession}</profession>`);
    if (npc.visible.race) parts.push(`    <race>${npc.visible.race}</race>`);
    if (npc.visible.description)
      parts.push(`    <description>${npc.visible.description}</description>`);
    if (npc.visible.appearance)
      parts.push(`    <appearance>${npc.visible.appearance}</appearance>`);
    if (npc.visible.status)
      parts.push(
        `    <perceived_status>${npc.visible.status}</perceived_status>`,
      );
    if (npc.visible.voice) parts.push(`    <voice>${npc.visible.voice}</voice>`);
    if (npc.visible.mannerism)
      parts.push(`    <mannerism>${npc.visible.mannerism}</mannerism>`);
    if (npc.visible.mood) parts.push(`    <mood>${npc.visible.mood}</mood>`);
    parts.push("  </visible>");
  }

  // Location info
  if (npc.currentLocation)
    parts.push(`  <current_location>${npc.currentLocation}</current_location>`);

  // Hidden info (Always visible to AI/GM)
  if (npc.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (npc.hidden.trueName)
      parts.push(`    <true_name>${npc.hidden.trueName}</true_name>`);
    if (npc.hidden.realPersonality)
      parts.push(
        `    <true_personality>${npc.hidden.realPersonality}</true_personality>`,
      );
    if (npc.hidden.realMotives)
      parts.push(`    <true_motives>${npc.hidden.realMotives}</true_motives>`);
    if (npc.hidden.routine)
      parts.push(`    <routine>${npc.hidden.routine}</routine>`);
    if (npc.hidden.currentThought)
      parts.push(
        `    <current_thought>${npc.hidden.currentThought}</current_thought>`,
      );
    if (npc.hidden.secrets?.length)
      parts.push(`    <secrets>${npc.hidden.secrets.join("; ")}</secrets>`);
    if (npc.hidden.status)
      parts.push(`    <actual_status>${npc.hidden.status}</actual_status>`);
    parts.push("  </hidden>");
  }

  if (Array.isArray(npc.relations) && npc.relations.length > 0) {
    parts.push("  <relations>");
    for (const rel of npc.relations) {
      parts.push(
        `    <relation kind="${(rel as any).kind}" to="${JSON.stringify((rel as any).to)}">${JSON.stringify(rel)}</relation>`,
      );
    }
    parts.push("  </relations>");
  }

  parts.push("</npc>");
  return parts.join("\n");
}

function extractLocationContent(location: Location): string {
  const parts: string[] = [];
  parts.push(`<location id="${location.id}">`);

  if (location.name) parts.push(`  <name>${location.name}</name>`);
  if (location.icon) parts.push(`  <icon>${location.icon}</icon>`);

  if (location.visible) {
    parts.push("  <visible>");
    if (location.visible.description)
      parts.push(
        `    <description>${location.visible.description}</description>`,
      );
    if (location.visible.knownFeatures?.length) {
      parts.push(
        `    <features>${location.visible.knownFeatures.join("; ")}</features>`,
      );
    }
    if (location.visible?.resources?.length)
      parts.push(
        `    <resources>${location.visible.resources.join("; ")}</resources>`,
      );
    if (location.visible?.environment)
      parts.push(
        `    <environment>${location.visible.environment}</environment>`,
      );
    if (location.visible?.ambience)
      parts.push(`    <ambience>${location.visible.ambience}</ambience>`);
    if (location.visible?.weather)
      parts.push(`    <weather>${location.visible.weather}</weather>`);
    parts.push("  </visible>");
  }

  if (location.lore) parts.push(`  <lore>${location.lore}</lore>`);

  // Hidden info (Always visible to AI/GM)
  if (location.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (location.hidden.fullDescription)
      parts.push(
        `    <true_description>${location.hidden.fullDescription}</true_description>`,
      );
    if (location.hidden.hiddenFeatures?.length)
      parts.push(
        `    <hidden_features>${location.hidden.hiddenFeatures.join("; ")}</hidden_features>`,
      );
    if (location.hidden.dangers?.length)
      parts.push(
        `    <dangers>${location.hidden.dangers.join("; ")}</dangers>`,
      );
    if (location.hidden.secrets?.length)
      parts.push(
        `    <secrets>${location.hidden.secrets.join("; ")}</secrets>`,
      );
    parts.push("  </hidden>");
  }

  parts.push("</location>");
  return parts.join("\n");
}

function extractItemContent(item: InventoryItem): string {
  const parts: string[] = [];
  parts.push(`<item id="${item.id}">`);

  if (item.name) parts.push(`  <name>${item.name}</name>`);
  if (item.icon) parts.push(`  <icon>${item.icon}</icon>`);

  if (item.visible) {
    parts.push("  <visible>");
    if (item.visible.description)
      parts.push(`    <description>${item.visible.description}</description>`);
    if (item.visible.usage)
      parts.push(`    <usage>${item.visible.usage}</usage>`);
    if (item.visible.observation)
      parts.push(
        `    <player_notes_about_item>${item.visible.observation}</player_notes_about_item>`,
      );
    parts.push("  </visible>");
  }

  if (item.lore) parts.push(`  <lore>${item.lore}</lore>`);

  // Hidden info (Always visible to AI/GM)
  if (item.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (item.hidden.truth)
      parts.push(`    <truth>${item.hidden.truth}</truth>`);
    if (item.hidden.secrets?.length)
      parts.push(`    <secrets>${item.hidden.secrets.join("; ")}</secrets>`);
    parts.push("  </hidden>");
  }

  parts.push("</item>");
  return parts.join("\n");
}

function extractKnowledgeContent(knowledge: KnowledgeEntry): string {
  const parts: string[] = [];
  parts.push(`<knowledge id="${knowledge.id}">`);

  if (knowledge.title) parts.push(`  <topic>${knowledge.title}</topic>`);
  if (knowledge.category)
    parts.push(`  <category>${knowledge.category}</category>`);
  if (knowledge.icon) parts.push(`  <icon>${knowledge.icon}</icon>`);

  if (knowledge.visible) {
    parts.push("  <visible>");
    if (knowledge.visible.description)
      parts.push(
        `    <description>${knowledge.visible.description}</description>`,
      );
    if (knowledge.visible.details)
      parts.push(`    <content>${knowledge.visible.details}</content>`);
    parts.push("  </visible>");
  }

  // Hidden info (Always visible to AI/GM)
  if (knowledge.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (knowledge.hidden.fullTruth)
      parts.push(`    <truth>${knowledge.hidden.fullTruth}</truth>`);
    if (knowledge.hidden.misconceptions?.length)
      parts.push(
        `    <misconceptions>${knowledge.hidden.misconceptions.join("; ")}</misconceptions>`,
      );
    if (knowledge.hidden.toBeRevealed?.length)
      parts.push(
        `    <implications>${knowledge.hidden.toBeRevealed.join("; ")}</implications>`,
      );
    parts.push("  </hidden>");
  }

  parts.push("</knowledge>");
  return parts.join("\n");
}

function extractQuestContent(quest: Quest): string {
  const parts: string[] = [];
  parts.push(`<quest id="${quest.id}" status="${quest.status}">`);

  if (quest.title) parts.push(`  <title>${quest.title}</title>`);
  if (quest.type) parts.push(`  <type>${quest.type}</type>`);
  if (quest.icon) parts.push(`  <icon>${quest.icon}</icon>`);

  if (quest.visible) {
    parts.push("  <visible>");
    if (quest.visible.description)
      parts.push(`    <description>${quest.visible.description}</description>`);
    if (quest.visible.objectives?.length)
      parts.push(
        `    <objectives>${quest.visible.objectives.join("; ")}</objectives>`,
      );
    parts.push("  </visible>");
  }

  // Hidden info (Always visible to AI/GM)
  if (quest.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (quest.hidden.trueDescription)
      parts.push(
        `    <true_description>${quest.hidden.trueDescription}</true_description>`,
      );
    if (quest.hidden.trueObjectives?.length)
      parts.push(
        `    <true_objectives>${quest.hidden.trueObjectives.join("; ")}</true_objectives>`,
      );
    if (quest.hidden.secretOutcome)
      parts.push(
        `    <secret_outcome>${quest.hidden.secretOutcome}</secret_outcome>`,
      );
    parts.push("  </hidden>");
  }

  parts.push("</quest>");
  return parts.join("\n");
}

function extractEventContent(event: TimelineEvent): string {
  const parts: string[] = [];
  parts.push(`<event id="${event.id}">`);

  if (event.gameTime) parts.push(`  <time>${event.gameTime}</time>`);
  if (event.category) parts.push(`  <category>${event.category}</category>`);
  if (event.icon) parts.push(`  <icon>${event.icon}</icon>`);
  if (event.involvedEntities?.length)
    parts.push(
      `  <involved_entities>${event.involvedEntities.join(", ")}</involved_entities>`,
    );
  if (event.chainId) parts.push(`  <chain_id>${event.chainId}</chain_id>`);

  if (event.visible) {
    parts.push("  <visible>");
    if (event.visible.description)
      parts.push(`    <description>${event.visible.description}</description>`);
    if (event.visible.causedBy)
      parts.push(`    <caused_by>${event.visible.causedBy}</caused_by>`);
    parts.push("  </visible>");
  }

  // Hidden info (Always visible to AI/GM)
  if (event.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (event.hidden.trueDescription)
      parts.push(
        `    <true_description>${event.hidden.trueDescription}</true_description>`,
      );
    if (event.hidden.trueCausedBy)
      parts.push(`    <true_cause>${event.hidden.trueCausedBy}</true_cause>`);
    if (event.hidden.consequences)
      parts.push(
        `    <consequences>${event.hidden.consequences}</consequences>`,
      );
    parts.push("  </hidden>");
  }

  parts.push("</event>");
  return parts.join("\n");
}

function extractOutlineContent(
  outline: StoryOutline,
  worldInfo: any | null,
  aspect: string,
): string {
  const parts: string[] = [];

  const effectiveWorldSetting = worldInfo?.worldSetting ?? outline.worldSetting;
  const effectiveMainGoal = worldInfo?.mainGoal ?? outline.mainGoal;
  const worldSettingUnlocked = Boolean(worldInfo?.worldSettingUnlocked);
  const mainGoalUnlocked = Boolean(worldInfo?.mainGoalUnlocked);

  switch (aspect) {
    case "world": {
      parts.push(`Story: ${outline.title}`);
      if (outline.premise) parts.push(`Premise: ${outline.premise}`);
      if (effectiveWorldSetting?.visible?.description) {
        parts.push(`World: ${effectiveWorldSetting.visible.description}`);
      }
      if (effectiveWorldSetting?.visible?.rules) {
        parts.push(`Rules: ${effectiveWorldSetting.visible.rules}`);
      }
      // Hidden world setting (for GM knowledge)
      if (worldSettingUnlocked && effectiveWorldSetting?.hidden) {
        if (effectiveWorldSetting.hidden.hiddenRules) {
          parts.push(
            `Hidden Rules: ${effectiveWorldSetting.hidden.hiddenRules}`,
          );
        }
        if (effectiveWorldSetting.hidden.secrets?.length) {
          parts.push(
            `World Secrets: ${effectiveWorldSetting.hidden.secrets.join(", ")}`,
          );
        }
      }
      break;
    }

    case "goal": {
      parts.push(`Story: ${outline.title}`);
      if (effectiveMainGoal?.visible?.description) {
        parts.push(`Main Goal: ${effectiveMainGoal.visible.description}`);
      }
      if (effectiveMainGoal?.visible?.conditions) {
        parts.push(`Win Conditions: ${effectiveMainGoal.visible.conditions}`);
      }
      // Hidden goal (for GM knowledge)
      if (mainGoalUnlocked && effectiveMainGoal?.hidden) {
        if (effectiveMainGoal.hidden.trueDescription) {
          parts.push(`True Goal: ${effectiveMainGoal.hidden.trueDescription}`);
        }
        if (effectiveMainGoal.hidden.trueConditions) {
          parts.push(
            `True Conditions: ${effectiveMainGoal.hidden.trueConditions}`,
          );
        }
      }
      break;
    }

    case "premise": {
      parts.push(`Story: ${outline.title}`);
      if (outline.initialTime) parts.push(`Time: ${outline.initialTime}`);
      if (outline.premise) parts.push(`Premise: ${outline.premise}`);
      break;
    }

    case "character": {
      parts.push(`Story: ${outline.title}`);
      const visible = outline.player?.profile?.visible;
      if (visible?.name) parts.push(`Name: ${visible.name}`);
      if (visible?.race) parts.push(`Race: ${visible.race}`);
      if (visible?.profession) parts.push(`Profession: ${visible.profession}`);
      if (visible?.background) parts.push(`Background: ${visible.background}`);
      if (visible?.appearance) parts.push(`Appearance: ${visible.appearance}`);
      break;
    }

    case "full":
    default: {
      // Full outline for comprehensive retrieval
      parts.push(`Story: ${outline.title}`);
      if (outline.initialTime) parts.push(`Time: ${outline.initialTime}`);
      if (outline.premise) parts.push(`Premise: ${outline.premise}`);
      if (effectiveWorldSetting?.visible?.description) {
        parts.push(`World: ${effectiveWorldSetting.visible.description}`);
      }
      if (effectiveMainGoal?.visible?.description) {
        parts.push(`Main Goal: ${effectiveMainGoal.visible.description}`);
      }
      const protagonist = outline.player?.profile?.visible;
      if (protagonist?.name) {
        parts.push(
          `Protagonist: ${protagonist.name}, ${protagonist.race ?? ""} ${protagonist.profession ?? ""}`.trim(),
        );
      }
      break;
    }
  }

  return parts.join("\n");
}

function extractSkillContent(skill: Skill): string {
  const parts: string[] = [];
  const id = skill.id || skill.name;
  parts.push(`<skill id="${id}">`);

  if (skill.name) parts.push(`  <name>${skill.name}</name>`);
  if (skill.level) parts.push(`  <level>${skill.level}</level>`);
  if (skill.category) parts.push(`  <category>${skill.category}</category>`);
  if (skill.icon) parts.push(`  <icon>${skill.icon}</icon>`);

  if (skill.visible) {
    parts.push("  <visible>");
    if (skill.visible.description)
      parts.push(`    <description>${skill.visible.description}</description>`);
    parts.push("  </visible>");
  }

  // Hidden info (Always visible to AI/GM)
  if (skill.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (skill.hidden.trueDescription)
      parts.push(
        `    <true_description>${skill.hidden.trueDescription}</true_description>`,
      );
    if (skill.hidden.hiddenEffects?.length)
      parts.push(
        `    <hidden_effects>${skill.hidden.hiddenEffects.join("; ")}</hidden_effects>`,
      );
    if (skill.hidden.drawbacks?.length)
      parts.push(
        `    <drawbacks>${skill.hidden.drawbacks.join("; ")}</drawbacks>`,
      );
    parts.push("  </hidden>");
  }

  parts.push("</skill>");
  return parts.join("\n");
}

function extractConditionContent(condition: Condition): string {
  const parts: string[] = [];
  const id = condition.id || condition.name;
  parts.push(`<condition id="${id}" type="${condition.type}">`);

  if (condition.name) parts.push(`  <name>${condition.name}</name>`);
  if (condition.icon) parts.push(`  <icon>${condition.icon}</icon>`);
  if (condition.severity)
    parts.push(`  <severity>${condition.severity}</severity>`);
  if (condition.startTime)
    parts.push(`  <start_time>${condition.startTime}</start_time>`);

  if (condition.visible) {
    parts.push("  <visible>");
    if (condition.visible.description)
      parts.push(
        `    <description>${condition.visible.description}</description>`,
      );
    if (condition.visible.perceivedSeverity)
      parts.push(
        `    <perceived_severity>${condition.visible.perceivedSeverity}</perceived_severity>`,
      );
    parts.push("  </visible>");
  }

  // Visible effects
  if (condition.effects?.visible?.length) {
    parts.push(
      `  <visible_effects>${condition.effects.visible.join("; ")}</visible_effects>`,
    );
  }

  // Hidden info (Always visible to AI/GM)
  if (condition.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (condition.hidden.trueCause)
      parts.push(`    <true_cause>${condition.hidden.trueCause}</true_cause>`);
    if (condition.hidden.actualSeverity)
      parts.push(
        `    <actual_severity>${condition.hidden.actualSeverity}</actual_severity>`,
      );
    if (condition.hidden.progression)
      parts.push(
        `    <progression>${condition.hidden.progression}</progression>`,
      );
    if (condition.hidden.cure)
      parts.push(`    <cure>${condition.hidden.cure}</cure>`);
    parts.push("  </hidden>");
  }

  // Hidden effects
  if (condition.effects?.hidden?.length) {
    parts.push(
      `  <hidden_effects>${condition.effects.hidden.join("; ")}</hidden_effects>`,
    );
  }

  parts.push("</condition>");
  return parts.join("\n");
}

function extractHiddenTraitContent(trait: HiddenTrait): string {
  const parts: string[] = [];
  const id = trait.id || trait.name;
  parts.push(`<hidden_trait id="${id}" unlocked="${trait.unlocked}">`);

  if (trait.name) parts.push(`  <name>${trait.name}</name>`);
  if (trait.icon) parts.push(`  <icon>${trait.icon}</icon>`);
  if (trait.description)
    parts.push(`  <description>${trait.description}</description>`);

  if (trait.effects?.length)
    parts.push(`  <effects>${trait.effects.join("; ")}</effects>`);

  if (trait.triggerConditions?.length)
    parts.push(
      `  <trigger_conditions>${trait.triggerConditions.join("; ")}</trigger_conditions>`,
    );

  parts.push("</hidden_trait>");
  return parts.join("\n");
}

function extractAttributeContent(attr: CharacterAttribute): string {
  const parts: string[] = [];
  parts.push(`<attribute label="${attr.label}">`);

  if (attr.icon) parts.push(`  <icon>${attr.icon}</icon>`);
  parts.push(`  <value>${attr.value}</value>`);
  parts.push(`  <max_value>${attr.maxValue}</max_value>`);
  if (attr.color) parts.push(`  <color>${attr.color}</color>`);

  parts.push("</attribute>");
  return parts.join("\n");
}

function extractFactionContent(faction: Faction): string {
  const parts: string[] = [];
  parts.push(`<faction id="${faction.id}">`);

  if (faction.name) parts.push(`  <name>${faction.name}</name>`);
  if (faction.icon) parts.push(`  <icon>${faction.icon}</icon>`);

  // Visible info
  if (faction.visible) {
    parts.push("  <visible>");
    if (faction.visible.agenda)
      parts.push(`    <agenda>${faction.visible.agenda}</agenda>`);
    if (faction.visible.influence)
      parts.push(`    <influence>${faction.visible.influence}</influence>`);
    if (faction.visible.members?.length) {
      const memberStrs = faction.visible.members.map(
        (m) => `${m.name}${m.title ? ` (${m.title})` : ""}`,
      );
      parts.push(`    <members>${memberStrs.join("; ")}</members>`);
    }
    if (faction.visible.relations?.length) {
      const relStrs = faction.visible.relations.map(
        (r) => `${r.target}: ${r.status}`,
      );
      parts.push(`    <relations>${relStrs.join("; ")}</relations>`);
    }
    parts.push("  </visible>");
  }

  // Hidden info (Always visible to AI/GM)
  if (faction.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (faction.hidden.agenda)
      parts.push(`    <secret_agenda>${faction.hidden.agenda}</secret_agenda>`);
    if (faction.hidden.influence)
      parts.push(
        `    <true_influence>${faction.hidden.influence}</true_influence>`,
      );
    if (faction.hidden.members?.length) {
      const memberStrs = faction.hidden.members.map(
        (m) => `${m.name}${m.title ? ` (${m.title})` : ""}`,
      );
      parts.push(
        `    <secret_members>${memberStrs.join("; ")}</secret_members>`,
      );
    }
    if (faction.hidden.relations?.length) {
      const relStrs = faction.hidden.relations.map(
        (r) => `${r.target}: ${r.status}`,
      );
      parts.push(
        `    <secret_relations>${relStrs.join("; ")}</secret_relations>`,
      );
    }
    parts.push("  </hidden>");
  }

  parts.push("</faction>");
  return parts.join("\n");
}
