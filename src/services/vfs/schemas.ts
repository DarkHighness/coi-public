import { z } from "zod";
import {
  locationSchema,
  questSchema,
  inventoryItemSchema,
  knowledgeEntrySchema,
  factionSchema,
  timelineEventSchema,
  causalChainSchema,
  worldInfoSchema,
  worldInfoViewSchema,
  questViewSchema,
  knowledgeEntryViewSchema,
  timelineEventViewSchema,
  locationViewSchema,
  factionViewSchema,
  causalChainViewSchema,
  skillSchema,
  conditionSchema,
  hiddenTraitSchema,
  atmosphereSchema,
  actorProfileSchema,
  strictPlayerProfileSchema,
  placeholderSchema,
  storyOutlineSchema,
  storySummarySchema,
} from "../zodSchemas";
import { normalizeVfsPath } from "./utils";
import { canonicalToLogicalVfsPath } from "./core/pathResolver";

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

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
  presetProfile: z
    .object({
      narrativeStylePreset: z.enum([
        "theme",
        "cinematic",
        "literary",
        "noir",
        "brutal",
        "cozy",
        "cdrama",
        "minimal",
      ]),
      worldDispositionPreset: z.enum([
        "theme",
        "benevolent",
        "mixed",
        "cynical",
      ]),
      playerMalicePreset: z.enum([
        "theme",
        "intimidation",
        "bureaucratic",
        "manipulation",
        "sabotage",
      ]),
      playerMaliceIntensity: z.enum(["light", "standard", "heavy"]),
      locked: z.literal(true),
    })
    .optional(),
  narrativeScale: z.enum(["epic", "intimate", "balanced"]).optional(),
  initialPrompt: z.string().optional(),
});

const ThemeConfigSchema = z.object({
  name: z.string(),
  narrativeStyle: z.string(),
  worldSetting: z.string(),
  backgroundTemplate: z.string(),
  example: z.string(),
  isRestricted: z.boolean(),
});

const ConversationTurnSchema = z.object({
  turn: z.number(),
  forkId: z.number(),
  timestamp: z.number(),
  user: z.object({ text: z.string(), inputId: z.string() }),
  model: z.object({ text: z.string(), outputId: z.string() }),
  toolCalls: z.array(jsonValueSchema).default([]),
  references: z.record(z.array(z.string())).optional(),
});

const SummaryStateSchema = z.object({
  summaries: z.array(storySummarySchema),
  lastSummarizedIndex: z.number().int(),
});

const schemaRegistry: Array<{ pattern: RegExp; schema: z.ZodSchema }> = [
  { pattern: /^world\/world_info\.json$/, schema: worldInfoSchema },
  { pattern: /^world\/theme_config\.json$/, schema: ThemeConfigSchema },
  { pattern: /^custom_rules\/README\.md$/, schema: z.string() },
  { pattern: /^custom_rules\/[^/]+\/RULES\.md$/, schema: z.string() },
  { pattern: /^world\/locations\/[^/]+\.json$/, schema: locationSchema },
  {
    pattern: /^world\/locations\/[^/]+\/items\/[^/]+\.json$/,
    schema: inventoryItemSchema,
  },
  { pattern: /^world\/quests\/[^/]+\.json$/, schema: questSchema },
  { pattern: /^world\/knowledge\/[^/]+\.json$/, schema: knowledgeEntrySchema },
  { pattern: /^world\/factions\/[^/]+\.json$/, schema: factionSchema },
  { pattern: /^world\/timeline\/[^/]+\.json$/, schema: timelineEventSchema },
  { pattern: /^world\/causal_chains\/[^/]+\.json$/, schema: causalChainSchema },
  { pattern: /^world\/placeholders\/[^/]+\.json$/, schema: placeholderSchema },
  {
    pattern: /^world\/characters\/char:player\/profile\.json$/,
    schema: strictPlayerProfileSchema,
  },
  {
    pattern: /^world\/characters\/[^/]+\/profile\.json$/,
    schema: actorProfileSchema,
  },
  {
    pattern: /^world\/characters\/[^/]+\/views\/world_info\.json$/,
    schema: worldInfoViewSchema,
  },
  {
    pattern: /^world\/characters\/[^/]+\/views\/quests\/[^/]+\.json$/,
    schema: questViewSchema,
  },
  {
    pattern: /^world\/characters\/[^/]+\/views\/knowledge\/[^/]+\.json$/,
    schema: knowledgeEntryViewSchema,
  },
  {
    pattern: /^world\/characters\/[^/]+\/views\/timeline\/[^/]+\.json$/,
    schema: timelineEventViewSchema,
  },
  {
    pattern: /^world\/characters\/[^/]+\/views\/locations\/[^/]+\.json$/,
    schema: locationViewSchema,
  },
  {
    pattern: /^world\/characters\/[^/]+\/views\/factions\/[^/]+\.json$/,
    schema: factionViewSchema,
  },
  {
    pattern: /^world\/characters\/[^/]+\/views\/causal_chains\/[^/]+\.json$/,
    schema: causalChainViewSchema,
  },
  { pattern: /^world\/characters\/[^/]+\/skills\/[^/]+\.json$/, schema: skillSchema },
  {
    pattern: /^world\/characters\/[^/]+\/conditions\/[^/]+\.json$/,
    schema: conditionSchema,
  },
  { pattern: /^world\/characters\/[^/]+\/traits\/[^/]+\.json$/, schema: hiddenTraitSchema },
  {
    pattern: /^world\/characters\/[^/]+\/inventory\/[^/]+\.json$/,
    schema: inventoryItemSchema,
  },
  { pattern: /^world\/global\.json$/, schema: GlobalSchema },
  { pattern: /^summary\/state\.json$/, schema: SummaryStateSchema },
  { pattern: /^outline\/outline\.json$/, schema: storyOutlineSchema },
  { pattern: /^outline\/progress\.json$/, schema: jsonValueSchema },
  { pattern: /^conversation\/turn\.json$/, schema: ConversationTurnSchema },
];

export function getSchemaForPath(path: string): z.ZodSchema {
  const normalizedPath = normalizeVfsPath(path);
  const logicalPath = canonicalToLogicalVfsPath(normalizedPath, {
    looseFork: true,
  });
  const candidatePaths = Array.from(
    new Set([normalizedPath, normalizeVfsPath(logicalPath)]),
  );

  for (const candidate of candidatePaths) {
    const match = schemaRegistry.find((entry) => entry.pattern.test(candidate));
    if (match) {
      return match.schema;
    }
  }

  throw new Error(`No schema registered for path: ${normalizedPath}`);
}
