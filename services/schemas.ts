import { Schema, Type } from "@google/genai";

// --- Shared Schema Definitions ---

export const locationProperties = {
  name: { type: Type.STRING, description: "Name of the location." },
  visible: {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING, description: "Visual description." },
      knownFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["description", "knownFeatures"],
  },
  hidden: {
    type: Type.OBJECT,
    properties: {
      fullDescription: {
        type: Type.STRING,
        description: "True nature of the location.",
      },
      hiddenFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
      secrets: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["fullDescription", "hiddenFeatures", "secrets"],
  },
  environment: {
    type: Type.STRING,
    description: "Atmosphere/Environment tag.",
  },
  unlocked: {
    type: Type.BOOLEAN,
    description:
      "Set to true when player has discovered the location's hidden secrets through thorough exploration or revelation.",
  },
};

export const questProperties = {
  title: { type: Type.STRING, description: "Quest title." },
  type: { type: Type.STRING, enum: ["main", "side", "hidden"] },
  visible: {
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: "The apparent objective.",
      },
      objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["description", "objectives"],
  },
  hidden: {
    type: Type.OBJECT,
    properties: {
      trueDescription: {
        type: Type.STRING,
        description: "The hidden truth or real purpose.",
      },
      trueObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
      secretOutcome: { type: Type.STRING },
    },
    required: ["trueDescription", "secretOutcome"],
  },
  unlocked: {
    type: Type.BOOLEAN,
    description:
      "Set to true when the quest's true objectives and secret outcome are revealed to the player.",
  },
};

export const relationshipProperties = {
  known: { type: Type.BOOLEAN, description: "Whether the player knows this character." },
  visible: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Name/Title the player knows them by." },
      description: {
        type: Type.STRING,
        description: "Public perception - how others view this NPC",
      },
      appearance: {
        type: Type.STRING,
        description: "Physical appearance details",
      },
      relationshipType: {
        type: Type.STRING,
        description:
          "Relationship status from player's perspective (e.g. Friend, Rival, Enemy, Mentor, Lover)",
      },
      currentImpression: {
        type: Type.STRING,
        description:
          "The NPC's current state from the protagonist's perspective (e.g. 'Looks exhausted', 'Smiling mysteriously', 'Seems hostile')",
      },
      personality: {
        type: Type.STRING,
        description:
          "Public perception of personality - what people SAY about them (may not reflect true nature in hidden.realPersonality)",
      },
      affinity: {
        type: Type.INTEGER,
        description:
          "Affinity score 0-100. <30=hostile, 30-70=neutral, >70=friendly. MUST update when player actions significantly impact relationship.",
      },
      affinityKnown: {
        type: Type.BOOLEAN,
        description: "Whether the player knows the affinity level.",
      },
    },
    required: ["name", "description", "relationshipType", "appearance", "affinity"],
  },
  hidden: {
    type: Type.OBJECT,
    properties: {
      trueName: { type: Type.STRING, description: "The character's real name (if different)." },
      realPersonality: {
        type: Type.STRING,
        description: "True personality - what they REALLY are like",
      },
      realMotives: {
        type: Type.STRING,
        description: "True underlying motives and goals",
      },
      secrets: { type: Type.ARRAY, items: { type: Type.STRING } },
      trueAffinity: { type: Type.INTEGER },
      relationshipType: {
        type: Type.STRING,
        description:
          "Relationship status from NPC's perspective (e.g. Tool, Prey, Master, Secret Lover)",
      },
      status: {
        type: Type.STRING,
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
    type: Type.STRING,
    description:
      "NPC's observations of player's displayed knowledge/behavior. Record what player has SAID or SHOWN about their understanding, and how this affects NPC's perception.",
  },
  unlocked: {
    type: Type.BOOLEAN,
    description:
      "SPECIAL: Set to true ONLY when player uses mind-reading magic, telepathy, or advanced technology to reveal NPC's true personality and motives. NOT through normal story progression.",
  },
};

export const relationshipSchema: Schema = {
  type: Type.OBJECT,
  properties: relationshipProperties,
  required: ["visible"],
};

export const skillProperties = {
  name: { type: Type.STRING, description: "Skill name" },
  level: {
    type: Type.STRING,
    description: "Skill level (e.g. Novice, Master, 1-100).",
  },
  visible: {
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: "Publicly known description.",
      },
      knownEffects: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["description", "knownEffects"],
  },
  hidden: {
    type: Type.OBJECT,
    properties: {
      trueDescription: { type: Type.STRING, description: "True nature/power." },
      hiddenEffects: { type: Type.ARRAY, items: { type: Type.STRING } },
      drawbacks: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["trueDescription", "hiddenEffects"],
  },
  category: { type: Type.STRING },
  unlocked: {
    type: Type.BOOLEAN,
    description:
      "Set to true when player has deeply understood this skill's true nature through mastery, observation, or revelation.",
  },
};

export const conditionProperties = {
  name: { type: Type.STRING },
  type: { type: Type.STRING, enum: ["buff", "debuff", "neutral"] },
  visible: {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING },
      perceivedSeverity: { type: Type.STRING },
    },
    required: ["description"],
  },
  hidden: {
    type: Type.OBJECT,
    properties: {
      trueCause: { type: Type.STRING },
      actualSeverity: { type: Type.INTEGER },
      progression: { type: Type.STRING },
      cure: { type: Type.STRING },
    },
    required: ["trueCause"],
  },
  effects: {
    type: Type.OBJECT,
    properties: {
      visible: { type: Type.ARRAY, items: { type: Type.STRING } },
      hidden: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["visible", "hidden"],
  },
  duration: {
    type: Type.INTEGER,
    description: "Duration in turns (optional).",
  },
  unlocked: {
    type: Type.BOOLEAN,
    description:
      "Set to true when the true cause and cure are revealed (diagnosis from healer, scientific analysis, or player revelation).",
  },
};

export const timelineEventProperties = {
  id: { type: Type.STRING, description: "Unique ID for the event." },
  gameTime: { type: Type.STRING, description: "When the event happened." },
  category: {
    type: Type.STRING,
    enum: ["player_action", "npc_action", "world_event", "consequence"],
    description: "Category of the event.",
  },
  visible: {
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: "Publicly known description of the event.",
      },
      causedBy: {
        type: Type.STRING,
        description: "Publicly known cause or instigator.",
      },
    },
    required: ["description"],
  },
  hidden: {
    type: Type.OBJECT,
    properties: {
      trueDescription: {
        type: Type.STRING,
        description: "The true nature of the event (GM knowledge).",
      },
      trueCausedBy: {
        type: Type.STRING,
        description: "The real instigator or cause.",
      },
      consequences: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Hidden consequences or future implications.",
      },
    },
    required: ["trueDescription"],
  },
  involvedEntities: { type: Type.ARRAY, items: { type: Type.STRING } },
  chainId: { type: Type.STRING, description: "Link to a CausalChain." },
  unlocked: {
    type: Type.BOOLEAN,
    description:
      "Set to true when player has investigated and uncovered the event's true cause and consequences.",
  },
  known: {
    type: Type.BOOLEAN,
    description: "Set to true if the player witnessed or heard about this event.",
  },
};

export const knowledgeProperties = {
  title: { type: Type.STRING, description: "Title of the knowledge entry." },
  category: {
    type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: "What is commonly known about this topic.",
      },
      details: {
        type: Type.STRING,
        description: "Additional details or context.",
      },
    },
    required: ["description"],
  },
  hidden: {
    type: Type.OBJECT,
    properties: {
      fullTruth: {
        type: Type.STRING,
        description: "The complete truth (GM knowledge).",
      },
      misconceptions: { type: Type.ARRAY, items: { type: Type.STRING } },
      toBeRevealed: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["fullTruth"],
  },
  unlocked: {
    type: Type.BOOLEAN,
    description:
      "Set to true when player has discovered the full truth through research, investigation, or authoritative revelation.",
  },
};

export const inventoryItemProperties = {
  name: { type: Type.STRING, description: "Name of the item." },
  visible: {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING, description: "Visual description." },
      notes: { type: Type.STRING },
    },
    required: ["description"],
  },
  hidden: {
    type: Type.OBJECT,
    properties: {
      truth: { type: Type.STRING, description: "True nature/power." },
      secrets: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["truth"],
  },
  lore: { type: Type.STRING, description: "Brief lore or history." },
  unlocked: {
    type: Type.BOOLEAN,
    description:
      "Set to true when player has discovered the item's hidden truth through close examination, analysis, or witnessing its true power.",
  },
};

export const storyOutlineSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A creative title for the adventure.",
    },
    initialTime: {
      type: Type.STRING,
      description:
        "The starting time of the story (e.g., 'Year 2024', 'Day 1', 'The 3rd Era'). Must fit the world setting.",
    },
    premise: {
      type: Type.STRING,
      description: "The inciting incident and setting setup.",
    },
    mainGoal: {
      type: Type.OBJECT,
      properties: {
        visible: {
          type: Type.STRING,
          description:
            "The apparent main motivation or task for the protagonist.",
        },
        hidden: {
          type: Type.STRING,
          description:
            "The hidden event logic, true nature, or secret reason behind the goal.",
        },
      },
      required: ["visible"],
      description:
        "The primary driving force of the story, with both surface and hidden layers.",
    },
    quests: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: questProperties,
        required: ["title", "type", "visible"],
      },
      description: "Initial quests (at least one main quest is required).",
    },
    worldSetting: {
      type: Type.OBJECT,
      properties: {
        visible: {
          type: Type.STRING,
          description:
            "Common knowledge about the world (war, peace, magic level, tech level).",
        },
        hidden: {
          type: Type.STRING,
          description:
            "Secret truths about the world (ancient conspiracies, hidden magic, true history).",
        },
        history: {
          type: Type.STRING,
          description:
            "Ancient events or history that shape the present situation.",
        },
      },
      required: ["visible", "history"],
      description:
        "Dual-layer world setting: public knowledge vs. secret truths.",
    },
    factions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the faction." },
          visible: {
            type: Type.STRING,
            description: "Public agenda or reputation.",
          },
          hidden: {
            type: Type.STRING,
            description: "Secret agenda or corruption.",
          },
        },
        required: ["name", "visible"],
      },
      description: "List of 2-3 major power groups or factions.",
    },
    locations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: locationProperties,
        required: ["name", "visible", "environment"],
      },
      description: "A list of 1-2 starting locations with full details.",
    },
    knowledge: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: knowledgeProperties,
        required: ["title", "category", "visible"],
      },
      description: "Initial knowledge entries about the world.",
    },
    timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: timelineEventProperties,
        required: ["id", "gameTime", "visible", "category"],
      },
      description:
        "Initial timeline events representing the backstory or recent history.",
    },
    character: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Name of the protagonist." },
        title: {
          type: Type.STRING,
          description: "Starting Class/Role/Title (e.g. Novice, Drifter).",
        },
        attributes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: {
                type: Type.STRING,
                description:
                  "Name of attribute (e.g. Health, Sanity, Credits).",
              },
              value: { type: Type.INTEGER, description: "Starting value" },
              maxValue: { type: Type.INTEGER, description: "Maximum value" },
              color: {
                type: Type.STRING,
                enum: ["red", "blue", "green", "yellow", "purple", "gray"],
                description: "Visual color hint.",
              },
            },
            required: ["label", "value", "maxValue"],
          },
          description: "Initial stats relevant to the theme.",
        },
        skills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: skillProperties,
            required: ["name", "level", "visible"],
          },
          description: "Initial skills/abilities.",
        },
        status: {
          type: Type.STRING,
          description: "Initial condition (e.g. Healthy, Amnesiac).",
        },
        conditions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: conditionProperties,
            required: ["name", "type", "visible", "effects"],
          },
          description: "Initial conditions (buffs/debuffs).",
        },
        hiddenTraits: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              effects: { type: Type.ARRAY, items: { type: Type.STRING } },
              triggerConditions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              unlocked: {
                type: Type.BOOLEAN,
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
          type: Type.STRING,
          description:
            "Detailed physical appearance of the character (hair, eyes, clothing, equipment).",
        },
        profession: {
          type: Type.STRING,
          description:
            "Character's occupation, class, or role in the world (e.g. Blacksmith, Mercenary, Scholar).",
        },
        background: {
          type: Type.STRING,
          description:
            "Brief life story and background of the character (origins, past experiences, motivations).",
        },
        race: {
          type: Type.STRING,
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
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: inventoryItemProperties,
        required: ["name", "visible", "lore"],
      },
      description: "Initial items in the inventory (1-3 items).",
    },
    relationships: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: relationshipProperties,
        required: ["visible"],
      },
      description: "Initial relationships (1-2 NPCs).",
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
  ],
};

export const summarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    displayText: {
      type: Type.STRING,
      description:
        "Concise 2-3 sentence summary for UI display (visible layer only). MUST be in the language of the story.",
      nullable: false,
    },
    visible: {
      type: Type.OBJECT,
      properties: {
        narrative: {
          type: Type.STRING,
          description: "Narrative summary from player perspective",
          nullable: false,
        },
        majorEvents: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of major events player witnessed",
        },
        characterDevelopment: {
          type: Type.STRING,
          description: "Character development from player's view",
        },
        worldState: {
          type: Type.STRING,
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
      type: Type.OBJECT,
      properties: {
        truthNarrative: {
          type: Type.STRING,
          description: "Objective truth narrative of what really happened",
        },
        hiddenPlots: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Hidden plots developing in the background",
        },
        npcActions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "NPC actions player didn't witness",
        },
        worldTruth: {
          type: Type.STRING,
          description: "Real state of the world",
        },
        unrevealed: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
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

export const gameResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    knowledge: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ["add", "update"] },
          id: { type: Type.STRING },
          relatedTo: { type: Type.STRING },
          discoveredAt: { type: Type.STRING },
          category: { type: Type.STRING },
          title: { type: Type.STRING },
          visible: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              details: { type: Type.STRING },
            },
            required: ["description"],
          },
        },
        required: ["action", "id", "relatedTo", "discoveredAt"],
      },
      description: "Updates to knowledge.",
    },
    timelineEvents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            enum: ["npc_action", "world_event", "consequence"],
          },
          visible: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              causedBy: { type: Type.STRING },
            },
            required: ["description"],
          },
          hidden: {
            type: Type.OBJECT,
            properties: {
              trueDescription: { type: Type.STRING },
              trueCausedBy: { type: Type.STRING },
              consequences: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["trueDescription"],
          },
          involvedEntities: { type: Type.ARRAY, items: { type: Type.STRING } },
          chainId: {
            type: Type.STRING,
          },
          newChain: {
            type: Type.OBJECT,
            properties: {
              description: {
                type: Type.STRING,
                description: "Description of the new causal chain.",
              },
            },
            required: ["description"],
          },
          projectedConsequences: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                delayTurns: { type: Type.INTEGER },
                probability: { type: Type.NUMBER },
              },
              required: ["description", "delayTurns", "probability"],
            },
          },
          known: { type: Type.BOOLEAN },
        },
        required: ["category", "visible", "hidden"],
      },
      description: "New timeline events.",
    },
    narrative: {
      type: Type.STRING,
      description:
        "The main story segment text. Write in coherent, flowing paragraphs. Integrate sensory details (sight, sound, touch) naturally. DO NOT use bullet points or lists for descriptions. MUST be in the target language. GENERATE THIS LAST, based on the state changes above.",
    },
    choices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "A list of 2-4 actions the user can take next. MUST be simple strings in the target language.",
    },
    factionActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ["update"] },
          id: { type: Type.INTEGER, description: "Numeric ID of the faction." },
          name: { type: Type.STRING, description: "Name of the faction." },
          visible: {
            type: Type.STRING,
            description: "Updated public agenda or reputation.",
          },
          hidden: {
            type: Type.STRING,
            description: "Updated secret agenda or corruption.",
          },
        },
        required: ["action", "id"],
      },
      description: "Updates to factions.",
    },
    characterUpdates: {
      type: Type.OBJECT,
      properties: {
        attributes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, enum: ["add", "update", "remove"] },
              name: {
                type: Type.STRING,
                description: "Name of the attribute (e.g. Health, Sanity).",
              },
              value: {
                type: Type.INTEGER,
                description: "New value or starting value.",
              },
              maxValue: { type: Type.INTEGER },
              color: { type: Type.STRING },
            },
            required: ["action", "name"],
          },
          description: "Changes to numeric attributes.",
        },
        skills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, enum: ["add", "update", "remove"] },
              ...skillProperties,
            },
            required: ["action", "name"],
          },
          description: "Changes to skills.",
        },
        profile: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            appearance: { type: Type.STRING },
            profession: { type: Type.STRING },
            background: { type: Type.STRING },
            race: { type: Type.STRING },
          },
          description: "Updates to core profile fields.",
        },
        conditions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, enum: ["add", "update", "remove"] },
              ...conditionProperties,
            },
            required: ["action", "name"],
          },
          description: "Temporary or permanent status effects.",
        },
        hiddenTraits: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, enum: ["add", "update", "remove"] },
              name: {
                type: Type.STRING,
                description: "Name of the hidden trait.",
              },
              description: {
                type: Type.STRING,
                description: "Description of the trait.",
              },
              effects: { type: Type.ARRAY, items: { type: Type.STRING } },
              triggerConditions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              discovered: { type: Type.BOOLEAN },
            },
            required: ["action", "name"],
          },
          description: "Hidden personality traits or secrets.",
        },
      },
      description: "Updates to character stats, skills, and profile.",
    },
    questActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            enum: ["add", "update", "complete", "fail"],
          },
          id: {
            type: Type.STRING,
            description: "Unique ID for the quest (e.g. 'find_relic').",
          },
          ...questProperties,
        },
        required: ["action", "id"],
      },
      description: "Updates to quests.",
    },
    generateImage: {
      type: Type.BOOLEAN,
      description:
        "Set to true ONLY when scene qualifies for Type 1 (Bird's Eye View for NEW location introduction) OR Type 2 (Player Perspective action scene - MORE COMMON). DEFAULT to false for: dialogue-only scenes, minor exploration, inventory management, status updates, routine actions.",
    },
    imagePrompt: {
      type: Type.STRING,
      description:
        "HIGHLY DETAILED visual description for scene image generation. REQUIRED if generateImage is true. Must specify TYPE: either 'BIRD'S EYE VIEW: ...' for location introductions OR 'PLAYER PERSPECTIVE: ...' for action scenes. Include specific visual elements: colors, lighting, textures, atmosphere, environmental details. Reference character appearance, visible equipment from inventory, NPCs present, and location environment. Be cinematic and atmospheric with rich sensory details. AVOID vague descriptions.",
    },
    environment: {
      type: Type.STRING,
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
      type: Type.STRING,
      description:
        "The tone of the narrative (e.g. 'suspenseful', 'cheerful', 'melancholy', 'energetic', 'calm').",
    },
    envTheme: {
      type: Type.STRING,
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

export const translationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          text: { type: Type.STRING },
          choices: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["id", "text", "choices"],
      },
    },
    inventory: { type: Type.ARRAY, items: { type: Type.STRING } },

    character: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        title: { type: Type.STRING },
        appearance: { type: Type.STRING },
        profession: { type: Type.STRING },
        background: { type: Type.STRING },
        race: { type: Type.STRING },
      },
    },
    relationships: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          relationshipType: { type: Type.STRING },
        },
      },
    },
  },
  required: ["segments"],
};
