import { Schema, Type } from "@google/genai";

export const storyOutlineSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A creative title for the adventure.",
    },
    premise: {
      type: Type.STRING,
      description: "The inciting incident and setting setup.",
    },
    mainGoal: {
      type: Type.STRING,
      description: "The ultimate objective for the character.",
    },
    worldSetting: {
      type: Type.STRING,
      description:
        "Brief details about the world's state (war, peace, magic level, tech level).",
    },
    locations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 1-2 starting locations.",
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
      },
      required: [
        "name",
        "title",
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
        properties: {
          name: { type: Type.STRING, description: "Name of the item." },
          description: {
            type: Type.STRING,
            description: "Visual description of the item.",
          },
          lore: { type: Type.STRING, description: "Brief lore or history." },
          isMystery: {
            type: Type.BOOLEAN,
            description: "True if the item's true nature is hidden.",
          },
        },
        required: ["name", "description"],
      },
      description: "Initial items in the inventory (1-3 items).",
    },
    relationships: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the NPC" },
          description: { type: Type.STRING },
          status: {
            type: Type.STRING,
            description: "Relationship status (e.g. Friend, Rival)",
          },
          affinity: {
            type: Type.INTEGER,
            description: "Starting affinity (0-100)",
          },
          affinityKnown: { type: Type.BOOLEAN },
        },
        required: ["name", "description", "status"],
      },
      description: "Initial relationships (1-2 NPCs).",
    },
  },
  required: [
    "title",
    "premise",
    "mainGoal",
    "worldSetting",
    "locations",
    "character",
  ],
};

export const summarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description:
        "A concise summary of the events that have occurred in the text provided.",
    },
  },
  required: ["summary"],
};

export const gameResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "The main story segment text. Be descriptive and engaging.",
    },
    choices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "A list of 2-4 actions the user can take next. MUST be simple strings.",
    },
    inventoryActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ["add", "remove", "update"] },
          item: { type: Type.STRING, description: "Name of the item." },
          newItem: {
            type: Type.STRING,
            description: "New name if action is 'update'.",
          },
          description: {
            type: Type.STRING,
            description: "Visual description of the item.",
          },
          lore: { type: Type.STRING, description: "Brief lore or history." },
          isMystery: {
            type: Type.BOOLEAN,
            description: "True if the item's true nature is hidden.",
          },
        },
        required: ["action", "item"],
      },
      description: "List of changes to the inventory.",
    },
    relationshipActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ["add", "update", "remove"] },
          name: { type: Type.STRING, description: "Name of the NPC" },
          description: { type: Type.STRING },
          status: { type: Type.STRING },
          affinity: { type: Type.INTEGER },
          affinityKnown: { type: Type.BOOLEAN },
        },
        required: ["action", "name"],
      },
      description: "List of changes to relationships. Empty if no changes.",
    },
    locationActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["current", "known"] },
          action: { type: Type.STRING, enum: ["update", "add"] },
          name: { type: Type.STRING, description: "Name of the location." },
          description: {
            type: Type.STRING,
            description: "Visual description of the location.",
          },
          lore: { type: Type.STRING, description: "Brief lore or history." },
        },
        required: ["type", "action", "name"],
      },
      description:
        "Updates to location. Use type='current' to move the player. Use type='known' to add discovered places.",
    },
    characterActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          target: {
            type: Type.STRING,
            enum: [
              "attribute",
              "skill",
              "status",
              "appearance",
              "profession",
              "background",
            ],
          },
          action: { type: Type.STRING, enum: ["add", "remove", "update"] },
          name: {
            type: Type.STRING,
            description:
              "Name of the attribute/skill. Use 'status'/'appearance'/'profession'/'background' if target matches.",
          },
          value: {
            type: Type.STRING,
            description:
              "New value (for status/skill level) or stringified number (for attributes).",
          }, // Schema limitation: mixed types hard, use string/int handling in code or separate fields. Let's use value as generic or specific fields.
          // To keep it simple for the AI, let's define specific value fields or just use 'value' as integer for attributes?
          // Actually, for attributes it's an integer. For status/skill it's a string.
          // Let's split or just use a flexible approach.
          // Better approach for Schema:
          intValue: {
            type: Type.INTEGER,
            description: "For attributes: the new value.",
          },
          strValue: {
            type: Type.STRING,
            description: "For status/skills: the new value/level.",
          },
          maxValue: { type: Type.INTEGER },
          color: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["target", "action", "name"],
      },
      description: "Changes to character stats, skills, or status condition.",
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
          title: { type: Type.STRING, description: "Quest title." },
          description: { type: Type.STRING, description: "Quest objective." },
          type: { type: Type.STRING, enum: ["main", "side"] },
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
    knowledgeActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            enum: ["add", "update"],
            description:
              "Add new knowledge or update existing. No remove action.",
          },
          title: {
            type: Type.STRING,
            description:
              "Title/name of the knowledge entry (e.g., 'Ancient Ruins', 'The Great War').",
          },
          category: {
            type: Type.STRING,
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
            description: "Category of knowledge.",
          },
          description: {
            type: Type.STRING,
            description: "What the player now knows about this topic.",
          },
          details: {
            type: Type.STRING,
            description: "Additional deeper understanding or context.",
          },
          discoveredAt: {
            type: Type.STRING,
            description: "Where/when this knowledge was learned.",
          },
          relatedTo: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              "IDs or names of related knowledge, items, or locations.",
          },
        },
        required: ["action", "title", "category", "description"],
      },
      description:
        "Changes to player's accumulated knowledge. Use when the player learns something significant about the world, history, factions, magic systems, etc. Knowledge can only be added or updated, never removed.",
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
        "forest",
        "dungeon",
        "city",
        "tavern",
        "ocean",
        "combat",
        "mystical",
        "quiet",
        "cave",
        "market",
        "rain",
        "storm",
        "snow",
        "desert",
        "Unknown",
      ],
      description: "The current environmental ambience.",
    },
    narrativeTone: {
      type: Type.STRING,
      description:
        "The tone of the narrative (e.g. 'suspenseful', 'cheerful', 'melancholy', 'energetic', 'calm').",
    },
    theme: {
      type: Type.STRING,
      enum: [
        "fantasy",
        "scifi",
        "cyberpunk",
        "horror",
        "mystery",
        "modern_romance",
        "palace_drama",
        "wuxia",
        "xianxia",
        "ceo",
        "long_aotian",
        "villain_op",
        "period_drama",
      ],
      description: "Update the theme ONLY if it shifts significantly.",
    },
    timeUpdate: {
      type: Type.STRING,
      description:
        "Update the in-game time (e.g., 'Day 2', '2023-09-29', 'Midnight'). Update this when significant time passes or specific events occur.",
    },
  },
  required: [
    "narrative",
    "choices",
    "inventoryActions",
    "relationshipActions",
    "locationActions",
    "characterActions",
    "questActions",
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
    currentQuest: { type: Type.STRING },
    currentLocation: { type: Type.STRING },
    knownLocations: { type: Type.ARRAY, items: { type: Type.STRING } },
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
          affinity: { type: Type.INTEGER },
          affinityKnown: { type: Type.BOOLEAN },
        },
      },
    },
  },
};
