import { JsonSchema } from "./schemaUtils";

// --- Shared Schema Definitions ---

export const locationProperties: Record<string, JsonSchema> = {
  name: { type: "string", description: "Name of the location." },
  visible: {
    type: "object",
    properties: {
      description: { type: "string", description: "Visual description." },
      knownFeatures: { type: "array", items: { type: "string" } },
    },
    required: ["description", "knownFeatures"],
  },
  hidden: {
    type: "object",
    properties: {
      fullDescription: {
        type: "string",
        description: "True nature of the location.",
      },
      hiddenFeatures: { type: "array", items: { type: "string" } },
      secrets: { type: "array", items: { type: "string" } },
    },
    required: ["fullDescription", "hiddenFeatures", "secrets"],
  },
  environment: {
    type: "string",
    description: "Atmosphere/Environment tag.",
  },
  unlocked: {
    type: "boolean",
    description:
      "AI DECISION: Set true when story context reveals location's secrets (exploration, NPC info, discovery). Default false.",
  },
};

export const questProperties: Record<string, JsonSchema> = {
  title: { type: "string", description: "Quest title." },
  type: { type: "string", enum: ["main", "side", "hidden"] },
  visible: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "The apparent objective.",
      },
      objectives: { type: "array", items: { type: "string" } },
    },
    required: ["description", "objectives"],
  },
  hidden: {
    type: "object",
    properties: {
      trueDescription: {
        type: "string",
        description: "The hidden truth or real purpose.",
      },
      trueObjectives: { type: "array", items: { type: "string" } },
      secretOutcome: { type: "string" },
    },
    required: ["trueDescription", "secretOutcome"],
  },
  unlocked: {
    type: "boolean",
    description:
      "AI DECISION: Set true when quest's hidden purpose is revealed (clues, betrayal, completion). Default false.",
  },
};

export const relationshipProperties: Record<string, JsonSchema> = {
  known: {
    type: "boolean",
    description: "Whether the player knows this character.",
  },
  visible: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name/Title the player knows them by.",
      },
      description: {
        type: "string",
        description: "Public perception - how others view this NPC",
      },
      appearance: {
        type: "string",
        description: "Physical appearance details",
      },
      relationshipType: {
        type: "string",
        description:
          "Relationship status from player's perspective (e.g. Friend, Rival, Enemy, Mentor, Lover)",
      },
      currentImpression: {
        type: "string",
        description:
          "The NPC's current state from the protagonist's perspective (e.g. 'Looks exhausted', 'Smiling mysteriously', 'Seems hostile')",
      },
      personality: {
        type: "string",
        description:
          "Public perception of personality - what people SAY about them (may not reflect true nature in hidden.realPersonality)",
      },
      affinity: {
        type: "integer",
        description:
          "Affinity score 0-100. <30=hostile, 30-70=neutral, >70=friendly. MUST update when player actions significantly impact relationship.",
      },
      affinityKnown: {
        type: "boolean",
        description: "Whether the player knows the affinity level.",
      },
    },
    required: [
      "name",
      "description",
      "relationshipType",
      "appearance",
      "affinity",
    ],
  },
  hidden: {
    type: "object",
    properties: {
      trueName: {
        type: "string",
        description: "The character's real name (if different).",
      },
      realPersonality: {
        type: "string",
        description: "True personality - what they REALLY are like",
      },
      realMotives: {
        type: "string",
        description: "True underlying motives and goals",
      },
      secrets: { type: "array", items: { type: "string" } },
      trueAffinity: { type: "integer" },
      relationshipType: {
        type: "string",
        description:
          "Relationship status from NPC's perspective (e.g. Tool, Prey, Master, Secret Lover)",
      },
      status: {
        type: "string",
        description:
          "Current state/condition of the NPC (e.g. 'plotting', 'injured', 'waiting', 'traveling').",
      },
    },
    required: [
      "realPersonality",
      "realMotives",
      "trueAffinity",
      "relationshipType",
      "status",
    ],
  },
  notes: {
    type: "string",
    description:
      "NPC's observations of player's displayed knowledge/behavior. Record what player has SAID or SHOWN about their understanding, and how this affects NPC's perception.",
  },
  unlocked: {
    type: "boolean",
    description:
      "AI DECISION (STRICT): ONLY set true via mind-reading, telepathy, or psychic tech. NOT normal friendship/conversation. Default false.",
  },
};

export const relationshipSchema: JsonSchema = {
  type: "object",
  properties: relationshipProperties,
  required: ["visible"],
};

export const skillProperties: Record<string, JsonSchema> = {
  name: { type: "string", description: "Skill name" },
  level: {
    type: "string",
    description: "Skill level (e.g. Novice, Master, 1-100).",
  },
  visible: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "Publicly known description.",
      },
      knownEffects: { type: "array", items: { type: "string" } },
    },
    required: ["description", "knownEffects"],
  },
  hidden: {
    type: "object",
    properties: {
      trueDescription: { type: "string", description: "True nature/power." },
      hiddenEffects: { type: "array", items: { type: "string" } },
      drawbacks: { type: "array", items: { type: "string" } },
    },
    required: ["trueDescription", "hiddenEffects"],
  },
  category: { type: "string" },
  unlocked: {
    type: "boolean",
    description:
      "AI DECISION: Set true when skill's hidden nature is understood (mastery, teaching, revelation). Default false.",
  },
};

export const conditionProperties: Record<string, JsonSchema> = {
  name: { type: "string" },
  type: { type: "string", enum: ["buff", "debuff", "neutral"] },
  visible: {
    type: "object",
    properties: {
      description: { type: "string" },
      perceivedSeverity: { type: "string" },
    },
    required: ["description"],
  },
  hidden: {
    type: "object",
    properties: {
      trueCause: { type: "string" },
      actualSeverity: { type: "integer" },
      progression: { type: "string" },
      cure: { type: "string" },
    },
    required: ["trueCause"],
  },
  effects: {
    type: "object",
    properties: {
      visible: { type: "array", items: { type: "string" } },
      hidden: { type: "array", items: { type: "string" } },
    },
    required: ["visible", "hidden"],
  },
  duration: {
    type: "integer",
    description: "Duration in turns (optional).",
  },
  unlocked: {
    type: "boolean",
    description:
      "AI DECISION: Set true when true cause/cure revealed (diagnosis, analysis, discovery). Default false.",
  },
};

export const timelineEventProperties: Record<string, JsonSchema> = {
  id: { type: "string", description: "Unique ID for the event." },
  gameTime: { type: "string", description: "When the event happened." },
  category: {
    type: "string",
    enum: ["player_action", "npc_action", "world_event", "consequence"],
    description: "Category of the event.",
  },
  visible: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "Publicly known description of the event.",
      },
      causedBy: {
        type: "string",
        description: "Publicly known cause or instigator.",
      },
    },
    required: ["description"],
  },
  hidden: {
    type: "object",
    properties: {
      trueDescription: {
        type: "string",
        description: "The true nature of the event (GM knowledge).",
      },
      trueCausedBy: {
        type: "string",
        description: "The real instigator or cause.",
      },
      consequences: {
        type: "array",
        items: { type: "string" },
        description: "Hidden consequences or future implications.",
      },
    },
    required: ["trueDescription"],
  },
  involvedEntities: { type: "array", items: { type: "string" } },
  chainId: { type: "string", description: "Link to a CausalChain." },
  unlocked: {
    type: "boolean",
    description:
      "AI DECISION: Set true when event's true cause/consequences uncovered (investigation, witnessing). Default false.",
  },
  known: {
    type: "boolean",
    description:
      "Set to true if the player witnessed or heard about this event.",
  },
};

export const knowledgeProperties: Record<string, JsonSchema> = {
  title: { type: "string", description: "Title of the knowledge entry." },
  category: {
    type: "string",
    description:
      "Category for organization. Use: landscape, history, item, legend, faction, culture, magic, technology, or other",
    enum: [
      "landscape",
      "history",
      "item",
      "legend",
      "faction",
      "culture",
      "magic",
      "technology",
      "other",
    ],
  },
  visible: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "What is commonly known about this topic.",
      },
      details: {
        type: "string",
        description: "Additional details or context.",
      },
    },
    required: ["description"],
  },
  hidden: {
    type: "object",
    properties: {
      fullTruth: {
        type: "string",
        description: "The complete truth (GM knowledge).",
      },
      misconceptions: { type: "array", items: { type: "string" } },
      toBeRevealed: { type: "array", items: { type: "string" } },
    },
    required: ["fullTruth"],
  },
  unlocked: {
    type: "boolean",
    description:
      "AI DECISION: Set true when full truth discovered (research, authoritative source). Default false.",
  },
};

export const inventoryItemProperties: Record<string, JsonSchema> = {
  name: { type: "string", description: "Name of the item." },
  visible: {
    type: "object",
    properties: {
      description: { type: "string", description: "Visual description." },
      notes: { type: "string" },
    },
    required: ["description"],
  },
  hidden: {
    type: "object",
    properties: {
      truth: { type: "string", description: "True nature/power." },
      secrets: { type: "array", items: { type: "string" } },
    },
    required: ["truth"],
  },
  lore: { type: "string", description: "Brief lore or history." },
  unlocked: {
    type: "boolean",
    description:
      "AI DECISION: Set true when hidden truth discovered (examination, analysis, witnessing power). Default false.",
  },
};

export const storyOutlineSchema: JsonSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "A creative title for the adventure.",
    },
    initialTime: {
      type: "string",
      description:
        "The starting time of the story (e.g., 'Year 2024', 'Day 1', 'The 3rd Era'). Must fit the world setting.",
    },
    premise: {
      type: "string",
      description: "The inciting incident and setting setup.",
    },
    mainGoal: {
      type: "object",
      properties: {
        visible: {
          type: "string",
          description:
            "The apparent main motivation or task for the protagonist.",
        },
        hidden: {
          type: "string",
          description:
            "The hidden event logic, true nature, or secret reason behind the goal.",
        },
      },
      required: ["visible"],
      description:
        "The primary driving force of the story, with both surface and hidden layers.",
    },
    quests: {
      type: "array",
      items: {
        type: "object",
        properties: questProperties,
        required: ["title", "type", "visible"],
      },
      description: "Initial quests (at least one main quest is required).",
    },
    worldSetting: {
      type: "object",
      properties: {
        visible: {
          type: "string",
          description:
            "Common knowledge about the world (war, peace, magic level, tech level).",
        },
        hidden: {
          type: "string",
          description:
            "Secret truths about the world (ancient conspiracies, hidden magic, true history).",
        },
        history: {
          type: "string",
          description:
            "Ancient events or history that shape the present situation.",
        },
      },
      required: ["visible", "history"],
      description:
        "Dual-layer world setting: public knowledge vs. secret truths.",
    },
    factions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the faction." },
          visible: {
            type: "string",
            description: "Public agenda or reputation.",
          },
          hidden: {
            type: "string",
            description: "Secret agenda or corruption.",
          },
        },
        required: ["name", "visible"],
      },
      description: "List of 2-3 major power groups or factions.",
    },
    locations: {
      type: "array",
      items: {
        type: "object",
        properties: locationProperties,
        required: ["name", "visible", "environment"],
      },
      description: "A list of 1-2 starting locations with full details.",
    },
    knowledge: {
      type: "array",
      items: {
        type: "object",
        properties: knowledgeProperties,
        required: ["title", "category", "visible"],
      },
      description: "Initial knowledge entries about the world.",
    },
    timeline: {
      type: "array",
      items: {
        type: "object",
        properties: timelineEventProperties,
        required: ["id", "gameTime", "visible", "category"],
      },
      description:
        "Initial timeline events representing the backstory or recent history.",
    },
    character: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the protagonist." },
        title: {
          type: "string",
          description: "Starting Class/Role/Title (e.g. Novice, Drifter).",
        },
        attributes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: {
                type: "string",
                description:
                  "Name of attribute (e.g. Health, Sanity, Credits).",
              },
              value: { type: "integer", description: "Starting value" },
              maxValue: { type: "integer", description: "Maximum value" },
              color: {
                type: "string",
                enum: ["red", "blue", "green", "yellow", "purple", "gray"],
                description: "Visual color hint.",
              },
            },
            required: ["label", "value", "maxValue"],
          },
          description: "Initial stats relevant to the theme.",
        },
        skills: {
          type: "array",
          items: {
            type: "object",
            properties: skillProperties,
            required: ["name", "level", "visible"],
          },
          description: "Initial skills/abilities.",
        },
        status: {
          type: "string",
          description: "Initial condition (e.g. Healthy, Amnesiac).",
        },
        conditions: {
          type: "array",
          items: {
            type: "object",
            properties: conditionProperties,
            required: ["name", "type", "visible", "effects"],
          },
          description: "Initial conditions (buffs/debuffs).",
        },
        hiddenTraits: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              effects: { type: "array", items: { type: "string" } },
              triggerConditions: {
                type: "array",
                items: { type: "string" },
              },
              unlocked: {
                type: "boolean",
                description:
                  "Set to true when the triggerConditions are met and the trait is revealed to the player.",
              },
            },
            required: [
              "name",
              "description",
              "effects",
              "triggerConditions",
              "unlocked",
            ],
          },
          description: "Hidden personality traits or secrets.",
        },
        appearance: {
          type: "string",
          description:
            "Detailed physical appearance of the character (hair, eyes, clothing, equipment).",
        },
        profession: {
          type: "string",
          description:
            "Character's occupation, class, or role in the world (e.g. Blacksmith, Mercenary, Scholar).",
        },
        background: {
          type: "string",
          description:
            "Brief life story and background of the character (origins, past experiences, motivations).",
        },
        race: {
          type: "string",
          description: "The character's race.",
        },
      },
      required: [
        "name",
        "title",
        "race",
        "attributes",
        "skills",
        "status",
        "appearance",
        "profession",
        "background",
      ],
      description: "The initialized character profile suited for this story.",
    },
    inventory: {
      type: "array",
      items: {
        type: "object",
        properties: inventoryItemProperties,
        required: ["name", "visible", "lore"],
      },
      description: "Initial items in the inventory (1-3 items).",
    },
    relationships: {
      type: "array",
      items: {
        type: "object",
        properties: relationshipProperties,
        required: ["visible"],
      },
      description: "Initial relationships (1-2 NPCs).",
    },
    initialAtmosphere: {
      type: "string",
      enum: [
        "cave",
        "city",
        "combat",
        "desert",
        "dungeon",
        "forest",
        "horror",
        "market",
        "mystical",
        "ocean",
        "quiet",
        "rain",
        "scifi",
        "snow",
        "storm",
        "tavern",
      ],
      description:
        "Initial atmosphere controlling visual theme, effects, and audio ambience.",
    },
  },
  required: [
    "title",
    "initialTime",
    "premise",
    "mainGoal",
    "quests",
    "worldSetting",
    "factions",
    "locations",
    "knowledge",
    "timeline",
    "character",
    "inventory",
    "relationships",
    "initialAtmosphere",
  ],
};

export const summarySchema: JsonSchema = {
  type: "object",
  properties: {
    displayText: {
      type: "string",
      description:
        "Concise 2-3 sentence summary for UI display (visible layer only). MUST be in the language of the story.",
      nullable: false,
    },
    visible: {
      type: "object",
      properties: {
        narrative: {
          type: "string",
          description: "Narrative summary from player perspective",
          nullable: false,
        },
        majorEvents: {
          type: "array",
          items: { type: "string" },
          description: "List of major events player witnessed",
        },
        characterDevelopment: {
          type: "string",
          description: "Character development from player's view",
        },
        worldState: {
          type: "string",
          description: "World state as player understands it",
        },
      },
      required: [
        "narrative",
        "majorEvents",
        "characterDevelopment",
        "worldState",
      ],
    },
    hidden: {
      type: "object",
      properties: {
        truthNarrative: {
          type: "string",
          description: "Objective truth narrative of what really happened",
        },
        hiddenPlots: {
          type: "array",
          items: { type: "string" },
          description: "Hidden plots developing in the background",
        },
        npcActions: {
          type: "array",
          items: { type: "string" },
          description: "NPC actions player didn't witness",
        },
        worldTruth: {
          type: "string",
          description: "Real state of the world",
        },
        unrevealed: {
          type: "array",
          items: { type: "string" },
          description: "Secrets not yet revealed to player",
        },
      },
      required: [
        "truthNarrative",
        "hiddenPlots",
        "npcActions",
        "worldTruth",
        "unrevealed",
      ],
    },
  },
  required: ["displayText", "visible", "hidden"],
};

export const causalChainProperties: Record<string, JsonSchema> = {
  chainId: { type: "string" },
  rootCause: {
    type: "object",
    properties: {
      eventId: { type: "string" },
      description: { type: "string" },
    },
    required: ["eventId", "description"],
  },
  events: {
    type: "array",
    items: {
      type: "object",
      properties: timelineEventProperties,
      required: ["id", "gameTime", "category", "visible", "hidden"],
    },
  },
  status: { type: "string", enum: ["active", "resolved", "interrupted"] },
  pendingConsequences: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string", description: "Unique ID for tracking" },
        description: { type: "string" },
        delayTurns: { type: "number" },
        createdAtTurn: { type: "number" },
        probability: { type: "number" },
        conditions: { type: "array", items: { type: "string" } },
        triggered: { type: "boolean" },
        triggeredAtTurn: { type: "number" },
      },
      required: ["id", "description", "delayTurns", "probability"],
    },
  },
};

export const factionProperties: Record<string, JsonSchema> = {
  id: { type: "string", description: "Format: fac:1" },
  name: { type: "string" },
  visible: { type: "string", description: "Public agenda/reputation" },
  hidden: { type: "string", description: "Secret agenda/corruption" },
  members: { type: "array", items: { type: "string" } },
  influence: { type: "number" },
  relations: { type: "object", description: "Relations with other factions" },
};

export const gameResponseSchema: JsonSchema = {
  type: "object",
  properties: {
    knowledgeActions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "update"] },
          id: { type: "string", description: "Format: know:1" },
          relatedTo: { type: "string" },
          discoveredAt: { type: "string" },
          category: { type: "string" },
          title: { type: "string" },
          visible: {
            type: "object",
            properties: {
              description: { type: "string" },
              details: { type: "string" },
            },
            required: ["description"],
          },
        },
        required: ["action", "id", "relatedTo", "discoveredAt"],
      },
      description: "Updates to knowledge.",
    },
    timelineEvents: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["npc_action", "world_event", "consequence"],
          },
          visible: {
            type: "object",
            properties: {
              description: { type: "string" },
              causedBy: { type: "string" },
            },
            required: ["description"],
          },
          hidden: {
            type: "object",
            properties: {
              trueDescription: { type: "string" },
              trueCausedBy: { type: "string" },
              consequences: { type: "array", items: { type: "string" } },
            },
            required: ["trueDescription"],
          },
          involvedEntities: { type: "array", items: { type: "string" } },
          chainId: {
            type: "string",
          },
          newChain: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Description of the new causal chain.",
              },
            },
            required: ["description"],
          },
          projectedConsequences: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                delayTurns: { type: "integer" },
                probability: { type: "number" },
              },
              required: ["description", "delayTurns", "probability"],
            },
          },
          known: { type: "boolean" },
        },
        required: ["category", "visible", "hidden"],
      },
      description: "New timeline events.",
    },
    narrative: {
      type: "string",
      description:
        "The main story segment text. Write in coherent, flowing paragraphs. Integrate sensory details (sight, sound, touch) naturally. DO NOT use bullet points or lists for descriptions. MUST be in the target language. GENERATE THIS LAST, based on the state changes above.",
    },
    choices: {
      type: "array",
      items: { type: "string" },
      description:
        "2-4 options for the player's next action. Keep them distinct and relevant.",
    },
    imagePrompt: {
      type: "string",
      description:
        "A detailed, evocative prompt for generating an image of the current scene. Focus on visual elements, lighting, and mood.",
    },
    generateImage: {
      type: "boolean",
      description:
        "Whether to generate an image for this turn (e.g. new location, major event).",
    },
    factionActions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["update"] },
          id: { type: "string", description: "Format: fac:1" },
          name: { type: "string" },
          visible: { type: "string" },
          hidden: { type: "string" },
        },
        required: ["action", "name"],
      },
      description: "Background actions taken by factions this turn.",
    },
    characterUpdates: {
      type: "object",
      properties: {
        attributes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["add", "update", "remove"] },
              name: {
                type: "string",
                description: "Name of the attribute (e.g. Health, Sanity).",
              },
              value: {
                type: "integer",
                description: "New value or starting value.",
              },
              maxValue: { type: "integer" },
              color: { type: "string" },
            },
            required: ["action", "name"],
          },
          description: "Changes to numeric attributes.",
        },
        skills: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["add", "update", "remove"] },
              ...skillProperties,
            },
            required: ["action", "name"],
          },
          description: "Changes to skills.",
        },
        profile: {
          type: "object",
          properties: {
            status: { type: "string" },
            appearance: { type: "string" },
            profession: { type: "string" },
            background: { type: "string" },
            race: { type: "string" },
          },
          description: "Updates to core profile fields.",
        },
        conditions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["add", "update", "remove"] },
              ...conditionProperties,
            },
            required: ["action", "name"],
          },
          description: "Temporary or permanent status effects.",
        },
        hiddenTraits: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["add", "update", "remove"] },
              name: {
                type: "string",
                description: "Name of the hidden trait.",
              },
              description: {
                type: "string",
                description: "Description of the trait.",
              },
              effects: { type: "array", items: { type: "string" } },
              triggerConditions: {
                type: "array",
                items: { type: "string" },
              },
              discovered: { type: "boolean" },
            },
            required: ["action", "name"],
          },
          description: "Hidden personality traits or secrets.",
        },
      },
      description: "Updates to character stats, skills, and profile.",
    },
    questActions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["add", "update", "complete", "fail"],
          },
          id: {
            type: "string",
            description: "Unique ID for the quest (Format: quest:1).",
          },
          ...questProperties,
        },
        required: ["action", "id"],
      },
      description: "Updates to quests.",
    },
    inventoryActions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "remove", "update"] },
          id: { type: "string", description: "Format: inv:1" },
          name: { type: "string" },
          visible: {
            type: "object",
            properties: {
              description: { type: "string" },
              notes: { type: "string" },
            },
          },
          hidden: {
            type: "object",
            properties: {
              truth: { type: "string" },
              secrets: { type: "array", items: { type: "string" } },
            },
          },
          lore: { type: "string" },
          newItem: { type: "string" },
          unlocked: { type: "boolean" },
        },
        required: ["action", "name"],
      },
      description: "Updates to inventory.",
    },
    relationshipActions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "update", "remove"] },
          id: { type: "string", description: "Format: npc:1" },
          known: { type: "boolean" },
          visible: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              appearance: { type: "string" },
              relationshipType: { type: "string" },
              currentImpression: { type: "string" },
              affinity: { type: "number" },
              affinityKnown: { type: "boolean" },
            },
          },
          hidden: {
            type: "object",
            properties: {
              realPersonality: { type: "string" },
              realMotives: { type: "string" },
              secrets: { type: "array", items: { type: "string" } },
              trueAffinity: { type: "number" },
              relationshipType: { type: "string" },
              status: { type: "string" },
            },
          },
          notes: { type: "string" },
          unlocked: { type: "boolean" },
        },
        required: ["action"],
      },
      description: "Updates to relationships.",
    },
    locationActions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["current", "known"] },
          action: { type: "string", enum: ["update", "add"] },
          id: { type: "string", description: "Format: loc:1" },
          name: { type: "string" },
          visible: {
            type: "object",
            properties: {
              description: { type: "string" },
              knownFeatures: { type: "array", items: { type: "string" } },
            },
          },
          hidden: {
            type: "object",
            properties: {
              fullDescription: { type: "string" },
              hiddenFeatures: { type: "array", items: { type: "string" } },
              secrets: { type: "array", items: { type: "string" } },
            },
          },
          lore: { type: "string" },
          environment: { type: "string" },
          notes: { type: "string" },
          unlocked: { type: "boolean" },
        },
        required: ["type", "action", "name"],
      },
      description: "Updates to locations.",
    },
    environment: {
      type: "string",
      enum: [
        "cave",
        "city",
        "combat",
        "desert",
        "dungeon",
        "forest",
        "horror",
        "market",
        "mystical",
        "ocean",
        "quiet",
        "rain",
        "scifi",
        "snow",
        "storm",
        "tavern",
      ],
      description:
        "The current audio ambience/environment. MUST be one of the defined enum values.",
    },
    narrativeTone: {
      type: "string",
      description:
        "The tone of the narrative (e.g. 'suspenseful', 'cheerful', 'melancholy', 'energetic', 'calm').",
    },
    envTheme: {
      type: "string",
      enum: [
        "fantasy",
        "scifi",
        "cyberpunk",
        "horror",
        "mystery",
        "romance",
        "royal",
        "wuxia",
        "demonic",
        "ethereal",
        "modern",
        "gold",
        "villain",
        "sepia",
        "rose",
        "war",
        "sunset",
        "cold",
        "violet",
        "nature",
        "artdeco",
        "intrigue",
        "wasteland",
        "patriotic",
        "cyan",
        "silver",
        "obsidian",
      ],
      description:
        "The current visual theme/color palette. MUST be one of the defined enum values.",
    },
  },
  required: ["narrative", "choices"],
};

export const translationSchema: JsonSchema = {
  type: "object",
  properties: {
    segments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          choices: { type: "array", items: { type: "string" } },
        },
        required: ["id", "text", "choices"],
      },
    },
    inventory: { type: "array", items: { type: "string" } },

    character: {
      type: "object",
      properties: {
        name: { type: "string" },
        title: { type: "string" },
        appearance: { type: "string" },
        profession: { type: "string" },
        background: { type: "string" },
        race: { type: "string" },
      },
    },
    relationships: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          relationshipType: { type: "string" },
        },
      },
    },
  },
  required: ["segments"],
};
