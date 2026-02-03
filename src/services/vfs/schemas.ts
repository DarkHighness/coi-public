import { z } from "zod";
import {
  npcSchema,
  locationSchema,
  questSchema,
  inventoryItemSchema,
  knowledgeEntrySchema,
  factionSchema,
  timelineEventSchema,
  causalChainSchema,
  characterStatusSchema,
  atmosphereSchema,
  storyOutlineSchema,
  storySummarySchema,
} from "../zodSchemas";
import { normalizeVfsPath } from "./utils";

const GlobalSchema = z.object({
  time: z.string(),
  theme: z.string(),
  currentLocation: z.string(),
  atmosphere: atmosphereSchema,
  turnNumber: z.number(),
  forkId: z.number(),
  language: z.string().optional(),
  customContext: z.string().optional(),
  seedImageId: z.string().optional(),
  narrativeScale: z.enum(["epic", "intimate", "balanced"]).optional(),
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

const SummaryStateSchema = z.object({
  summaries: z.array(storySummarySchema),
  lastSummarizedIndex: z.number().int(),
});

const schemaRegistry: Array<{ pattern: RegExp; schema: z.ZodSchema }> = [
  { pattern: /^world\/npcs\/[^/]+\.json$/, schema: npcSchema },
  { pattern: /^world\/locations\/[^/]+\.json$/, schema: locationSchema },
  { pattern: /^world\/quests\/[^/]+\.json$/, schema: questSchema },
  { pattern: /^world\/inventory\/[^/]+\.json$/, schema: inventoryItemSchema },
  { pattern: /^world\/knowledge\/[^/]+\.json$/, schema: knowledgeEntrySchema },
  { pattern: /^world\/factions\/[^/]+\.json$/, schema: factionSchema },
  { pattern: /^world\/timeline\/[^/]+\.json$/, schema: timelineEventSchema },
  { pattern: /^world\/causal_chains\/[^/]+\.json$/, schema: causalChainSchema },
  { pattern: /^world\/character\.json$/, schema: characterStatusSchema },
  { pattern: /^world\/global\.json$/, schema: GlobalSchema },
  { pattern: /^summary\/state\.json$/, schema: SummaryStateSchema },
  { pattern: /^outline\/outline\.json$/, schema: storyOutlineSchema },
  { pattern: /^outline\/progress\.json$/, schema: z.any() },
  { pattern: /^conversation\/turn\.json$/, schema: ConversationTurnSchema },
];

export function getSchemaForPath(path: string): z.ZodSchema {
  const normalizedPath = normalizeVfsPath(path);
  const match = schemaRegistry.find((entry) =>
    entry.pattern.test(normalizedPath),
  );
  if (!match) {
    throw new Error(`No schema registered for path: ${normalizedPath}`);
  }
  return match.schema;
}
