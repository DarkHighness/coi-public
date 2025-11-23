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
      fullDescription: { type: Type.STRING, description: "True nature of the location." },
      hiddenFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
      secrets: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["fullDescription", "hiddenFeatures", "secrets"],
  },
  environment: { type: Type.STRING, description: "Atmosphere/Environment tag." },
};

export const questProperties = {
  title: { type: Type.STRING, description: "Quest title." },
  type: { type: Type.STRING, enum: ["main", "side", "hidden"] },
  visible: {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING, description: "The apparent objective." },
      objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["description", "objectives"],
  },
  hidden: {
    type: Type.OBJECT,
    properties: {
      trueDescription: { type: Type.STRING, description: "The hidden truth or real purpose." },
      trueObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
      secretOutcome: { type: Type.STRING },
    },
    required: ["trueDescription", "secretOutcome"],
  },
};

export const relationshipProperties = {
  name: { type: Type.STRING, description: "Name of the NPC" },
  visible: {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING, description: "Visual description" },
      appearance: { type: Type.STRING, description: "Physical appearance" },
      status: { type: Type.STRING, description: "Relationship status (e.g. Friend, Rival)" },
      currentImpression: { type: Type.STRING, description: "The NPC's current state from the protagonist's perspective (e.g. 'Looks exhausted', 'Smiling mysteriously', 'Seems hostile')" },
    },
    required: ["description", "status", "appearance"],
  },
  hidden: {
    type: Type.OBJECT,
    properties: {
      realPersonality: { type: Type.STRING, description: "True personality" },
      realMotives: { type: Type.STRING, description: "True motives" },
      secrets: { type: Type.ARRAY, items: { type: Type.STRING } },
      trueAffinity: { type: Type.INTEGER },
    },
    required: ["realPersonality", "realMotives", "trueAffinity"],
  },
  relationshipType: {
    type: Type.STRING,
    description: "Type of relationship (e.g. family, friend, mentor, enemy)",
  },
  affinity: {
    type: Type.INTEGER,
    description: "Starting affinity (0-100)",
  },
  affinityKnown: { type: Type.BOOLEAN },
};

export const knowledgeProperties = {
  title: { type: Type.STRING, description: "Title of the knowledge entry." },
  category: {
    type: Type.STRING,
    enum: ["landscape", "history", "item", "person", "faction", "secret", "magic", "tech", "other"],
  },
  visible: {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING, description: "What is commonly known." },
      details: { type: Type.STRING },
    },
    required: ["description"],
  },
  hidden: {
    type: Type.OBJECT,
    properties: {
      fullTruth: { type: Type.STRING, description: "The complete truth." },
      misconceptions: { type: Type.ARRAY, items: { type: Type.STRING } },
      toBeRevealed: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["fullTruth"],
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
  isMystery: {
    type: Type.BOOLEAN,
    description: "True if the item's true nature is hidden.",
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
      description: "The starting time of the story (e.g., 'Year 2024', 'Day 1', 'The 3rd Era'). Must fit the world setting.",
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
          description: "The apparent main motivation or task for the protagonist.",
        },
        hidden: {
          type: Type.STRING,
          description: "The hidden event logic, true nature, or secret reason behind the goal.",
        },
      },
      required: ["visible", "hidden"],
      description: "The primary driving force of the story, with both surface and hidden layers.",
    },
    quests: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: questProperties,
        required: ["title", "type", "visible", "hidden"],
      },
      description: "Initial quests (at least one main quest is required).",
    },
    worldSetting: {
      type: Type.OBJECT,
      properties: {
        visible: {
          type: Type.STRING,
          description: "Common knowledge about the world (war, peace, magic level, tech level).",
        },
        hidden: {
          type: Type.STRING,
          description: "Secret truths about the world (ancient conspiracies, hidden magic, true history).",
        },
      },
      required: ["visible", "hidden"],
      description: "Dual-layer world setting: public knowledge vs. secret truths.",
    },
    locations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: locationProperties,
        required: ["name", "visible", "hidden", "environment"],
      },
      description: "A list of 1-2 starting locations with full details.",
    },
    knowledge: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: knowledgeProperties,
        required: ["title", "category", "visible", "hidden"],
      },
      description: "Initial knowledge entries about the world.",
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
            properties: {
              name: { type: Type.STRING, description: "Skill name" },
              level: {
                type: Type.STRING,
                description: "Starting level (e.g. Beginner)",
              },
              description: {
                type: Type.STRING,
                description: "Short description",
              },
            },
            required: ["name", "level"],
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
            properties: {
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
                },
                required: ["trueCause"],
              },
            },
            required: ["name", "type", "visible", "hidden"],
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
              triggerConditions: { type: Type.ARRAY, items: { type: Type.STRING } },
              discovered: { type: Type.BOOLEAN },
            },
            required: ["name", "description"],
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
      ],
      description: "The initialized character profile suited for this story.",
    },
    inventory: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: inventoryItemProperties,
        required: ["name", "visible", "hidden", "lore", "isMystery"],
      },
      description: "Initial items in the inventory (1-3 items).",
    },
    relationships: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: relationshipProperties,
        required: ["name", "visible", "hidden", "relationshipType", "affinity"],
      },
      description: "Initial relationships (1-2 NPCs).",
    },
  },
  required: [
    "title",
    "initialTime",
    "premise",
    "quests",
    "worldSetting",
    "locations",
    "character",
  ],
};

export const summarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    displayText: {
      type: Type.STRING,
      description: "Concise 2-3 sentence summary for UI display (visible layer only)",
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
      required: ["narrative"],
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
    },
  },
  required: ["displayText", "visible", "hidden"],
};

export const gameResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "The main story segment text. Write in coherent, flowing paragraphs. Integrate sensory details (sight, sound, touch) naturally. DO NOT use bullet points or lists for descriptions. MUST be in the target language.",
    },
    choices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "A list of 2-4 actions the user can take next. MUST be simple strings in the target language.",
    },
    inventoryActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ["add", "remove", "update"] },
          id: { type: Type.INTEGER, description: "Numeric ID of the item." },
          ...inventoryItemProperties
        },
        required: ["action"],
      },
      description: "List of changes to the inventory.",
    },
    relationshipActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ["add", "update", "remove"] },
          id: { type: Type.INTEGER, description: "Numeric ID of the NPC." },
          notes: { type: Type.STRING },
          ...relationshipProperties
        },
        required: ["action"],
      },
      description: "List of changes to relationships.",
    },
    locationActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["current", "known"] },
          action: { type: Type.STRING, enum: ["update", "add"] },
          id: { type: Type.INTEGER, description: "Numeric ID of the location." },
          notes: { type: Type.STRING },
          ...locationProperties
        },
        required: ["type", "action", "name"],
      },
      description: "Updates to location.",
    },
    knowledgeActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ["add", "update"] },
          id: { type: Type.INTEGER, description: "Numeric ID." },
          relatedTo: { type: Type.ARRAY, items: { type: Type.STRING } },
          discoveredAt: { type: Type.STRING, description: "Time and location of discovery (e.g. 'Year 2024, The Old Library')." },
          ...knowledgeProperties
        },
        required: ["action"],
      },
      description: "Updates to knowledge.",
    },
    worldEvents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          category: { type: Type.STRING, enum: ["npc_action", "world_event"] },
          involvedEntities: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
      description: "Events happening in the world independent of the player.",
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
              name: { type: Type.STRING, description: "Name of the attribute (e.g. Health, Sanity)." },
              value: { type: Type.INTEGER, description: "New value or starting value." },
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
              name: { type: Type.STRING },
              level: { type: Type.STRING, description: "Skill level (e.g. Novice, Master)." },
              description: { type: Type.STRING },
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
              name: { type: Type.STRING, description: "Name of the condition (e.g. Poisoned, Blessed)." },
              description: { type: Type.STRING, description: "Effect description." },
              duration: { type: Type.STRING, description: "Duration or 'permanent'." },
              value: { type: Type.INTEGER, description: "Intensity value if applicable." },
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
              name: { type: Type.STRING, description: "Name of the hidden trait." },
              description: { type: Type.STRING, description: "Description of the trait." },
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
          ...questProperties
        },
        required: ["action", "id"],
      },
      description: "Updates to quests.",
    },
    explicitLine: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["add", "update", "remove"] },
        primary: {
          type: Type.STRING,
          description: "The main explicit storyline goal/task.",
        },
        secondary: {
          type: Type.STRING,
          description: "Secondary explicit storyline details.",
        },
      },
      description: "Updates to the Explicit Line (visible to user).",
    },
    implicitLine: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["add", "update", "remove"] },
        content: {
          type: Type.STRING,
          description: "The hidden implicit storyline development.",
        },
      },
      description: "Updates to the Implicit Line (invisible to user).",
    },
    generateImage: {
      type: Type.BOOLEAN,
      description:
        "Set to true ONLY if this is an important scene that requires visual representation.",
    },
    imagePrompt: {
      type: Type.STRING,
      description:
        "Visual description for the scene. Required if generateImage is true.",
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
      description: "The current audio ambience/environment. MUST be one of the defined enum values.",
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
        "obsessive",
        "emerald",
        "danger",
        "glamour",
        "rgb",
        "stone",
        "heartbreak",
      ],
      description: "Update the visual theme/atmosphere ONLY if it shifts significantly.",
    },
    timeUpdate: {
      type: Type.STRING,
      description:
        "The current in-game time string. Maintain continuity with previous time unless a time jump/travel occurs. Format depends on the setting (e.g., 'Day 2', '2023-11-24 14:00', 'Star Date 45.2').",
    },
  },
  required: [
    "narrative",
    "choices",
    "inventoryActions",
    "relationshipActions",
    "locationActions",
    "characterUpdates",
    "questActions",
    "timeUpdate",
  ],
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
      },
    },
    inventory: { type: Type.ARRAY, items: { type: Type.STRING } },
    currentLocation: { type: Type.STRING },
    character: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        title: { type: Type.STRING },
        attributes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.INTEGER },
              maxValue: { type: Type.INTEGER },
              color: { type: Type.STRING },
            },
          },
        },
        skills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              level: { type: Type.STRING },
              description: { type: Type.STRING },
            },
          },
        },
        status: { type: Type.STRING },
        conditions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              duration: { type: Type.STRING },
            },
          },
        },
        hiddenTraits: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
            },
          },
        },
      },
    },
    relationships: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          status: { type: Type.STRING },
          currentImpression: { type: Type.STRING },
          affinity: { type: Type.INTEGER },
          affinityKnown: { type: Type.BOOLEAN },
        },
      },
    },
  },
};
