
import { Schema, Type } from "@google/genai";

export const storyOutlineSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A creative title for the adventure." },
    premise: { type: Type.STRING, description: "The inciting incident and setting setup." },
    mainGoal: { type: Type.STRING, description: "The ultimate objective for the character." },
    worldSetting: { type: Type.STRING, description: "Brief details about the world's state (war, peace, magic level, tech level)." },
    locations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of 1-2 starting locations." },
    character: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Name of the protagonist." },
        title: { type: Type.STRING, description: "Starting Class/Role/Title (e.g. Novice, Drifter)." },
        attributes: {
          type: Type.ARRAY,
          items: {
             type: Type.OBJECT,
             properties: {
                label: { type: Type.STRING, description: "Name of attribute (e.g. Health, Sanity, Credits)." },
                value: { type: Type.INTEGER, description: "Starting value" },
                maxValue: { type: Type.INTEGER, description: "Maximum value" },
                color: { 
                   type: Type.STRING, 
                   enum: ["red", "blue", "green", "yellow", "purple", "gray"],
                   description: "Visual color hint." 
                }
             }
          },
          description: "Initial stats relevant to the theme."
        },
        skills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Skill name" },
              level: { type: Type.STRING, description: "Starting level (e.g. Beginner)" },
              description: { type: Type.STRING, description: "Short description" }
            },
            required: ["name", "level"]
          },
          description: "Initial skills/abilities."
        },
        status: { type: Type.STRING, description: "Initial condition (e.g. Healthy, Amnesiac)." }
      },
      required: ["name", "title", "attributes", "skills", "status"],
      description: "The initialized character profile suited for this story."
    }
  },
  required: ["title", "premise", "mainGoal", "worldSetting", "locations", "character"]
};

export const summarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "A concise summary of the events that have occurred in the text provided." }
  },
  required: ["summary"]
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
      description: "A list of 2-4 actions the user can take next. MUST be simple strings, not objects. Choices must advance the plot.",
    },
    inventory: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "The COMPLETE updated list of items in the user's inventory based on the story events.",
    },
    relationships: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the NPC" },
          description: { type: Type.STRING, description: "Brief description of who they are and their current relevance." },
          status: { type: Type.STRING, description: "Current status (e.g. Ally, Enemy, Neutral, Romance, Deceased)" },
          affinity: { type: Type.INTEGER, description: "Affinity score from 0 (Hated) to 100 (Soulmate). 50 is Neutral. ALWAYS provide a number even if unknown." },
          affinityKnown: { type: Type.BOOLEAN, description: "Set to FALSE if the player does not know the character's true feelings (hidden/mysterious). Default TRUE." }
        },
        required: ["name", "description", "status", "affinity", "affinityKnown"]
      },
      description: "The COMPLETE list of significant characters met so far and their updated relationship status/affinity."
    },
    currentQuest: {
      type: Type.STRING,
      description: "The current main objective or quest description.",
    },
    currentLocation: {
        type: Type.STRING,
        description: "The specific location where the scene is currently taking place."
    },
    knownLocations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of significant locations the player has visited or unlocked."
    },
    character: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Character name" },
        title: { type: Type.STRING, description: "Class/Role/Title (e.g. Cyber-Samurai, Level 3 Mage)" },
        attributes: {
          type: Type.ARRAY,
          items: {
             type: Type.OBJECT,
             properties: {
                label: { type: Type.STRING, description: "Name of attribute (e.g. Health, Sanity, Credits, Energy)" },
                value: { type: Type.INTEGER, description: "Current value" },
                maxValue: { type: Type.INTEGER, description: "Maximum value" },
                color: { 
                   type: Type.STRING, 
                   enum: ["red", "blue", "green", "yellow", "purple", "gray"],
                   description: "Visual color hint for UI" 
                }
             }
          },
          description: "A dynamic list of character stats relevant to the story. 1-3 stats max. If the story doesn't use stats (e.g. pure mystery), return an empty array."
        },
        skills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Skill name" },
              level: { type: Type.STRING, description: "Mastery level (e.g. Novice, Expert, Lvl 1)" },
              description: { type: Type.STRING, description: "Short description" }
            },
            required: ["name", "level"]
          },
          description: "List of learned skills/abilities."
        },
        status: { type: Type.STRING, description: "Current condition (e.g. Healthy, Poisoned, Malfunctioning)" }
      },
      required: ["name", "title", "attributes", "skills", "status"],
      description: "Updated character statistics based on story events."
    },
    imagePrompt: {
      type: Type.STRING,
      description: "A detailed visual description of the current scene for an image generator. Focus on environment and mood.",
    },
    theme: {
      type: Type.STRING,
      enum: [
        "fantasy", "scifi", "cyberpunk", "horror", "mystery", 
        "modern_romance", "palace_drama", "wuxia", "xianxia", "ceo",
        "long_aotian", "villain_op", "period_drama"
      ],
      description: "The current genre/theme of the story based on the context.",
    }
  },
  required: ["narrative", "choices", "inventory", "relationships", "currentQuest", "currentLocation", "knownLocations", "character", "imagePrompt", "theme"],
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
          choices: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
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
              color: { type: Type.STRING }
            }
          }
        },
        skills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              level: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        },
        status: { type: Type.STRING }
      }
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
              affinityKnown: { type: Type.BOOLEAN }
          }
        }
    }
  }
};
