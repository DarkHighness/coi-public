import { z } from "zod";
import {
  npcSchema,
  locationSchema,
  questSchema,
  inventoryItemSchema,
  knowledgeSchema,
  factionSchema,
  timelineEventSchema,
  causalChainSchema,
  characterStatusSchema,
  atmosphereSchema,
} from "../zodSchemas";

const GlobalSchema = z.object({
  time: z.string(),
  theme: z.string(),
  currentLocation: z.string(),
  atmosphere: atmosphereSchema,
  turnNumber: z.number(),
  forkId: z.number(),
});

const ConversationTurnSchema = z.object({
  turn: z.number(),
  forkId: z.number(),
  timestamp: z.number(),
  user: z.object({ text: z.string(), inputId: z.string() }),
  model: z.object({ text: z.string(), outputId: z.string() }),
  toolCalls: z.array(z.any()).default([]),
  references: z.record(z.array(z.string())).optional(),
});

const schemaRegistry: Array<{ pattern: RegExp; schema: z.ZodSchema }> = [
  { pattern: /^world\/npcs\/[^/]+\.json$/, schema: npcSchema },
  { pattern: /^world\/locations\/[^/]+\.json$/, schema: locationSchema },
  { pattern: /^world\/quests\/[^/]+\.json$/, schema: questSchema },
  { pattern: /^world\/inventory\/[^/]+\.json$/, schema: inventoryItemSchema },
  { pattern: /^world\/knowledge\/[^/]+\.json$/, schema: knowledgeSchema },
  { pattern: /^world\/factions\/[^/]+\.json$/, schema: factionSchema },
  { pattern: /^world\/timeline\/[^/]+\.json$/, schema: timelineEventSchema },
  { pattern: /^world\/causal_chains\/[^/]+\.json$/, schema: causalChainSchema },
  { pattern: /^world\/character\.json$/, schema: characterStatusSchema },
  { pattern: /^world\/global\.json$/, schema: GlobalSchema },
  { pattern: /^conversation\/turn\.json$/, schema: ConversationTurnSchema },
];

export function getSchemaForPath(path: string): z.ZodSchema {
  const match = schemaRegistry.find((entry) => entry.pattern.test(path));
  if (!match) {
    throw new Error(`No schema registered for path: ${path}`);
  }
  return match.schema;
}
