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
  storyOutlineSchema,
  storySummarySchema,
} from "../../zodSchemas";
import { normalizeVfsPath } from "../utils";
import { canonicalToLogicalVfsPath, resolveVfsPath } from "../core/pathResolver";
import { vfsPathRegistry } from "../core/pathRegistry";

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

interface VfsSchemaRule {
  templateId: string;
  logicalPathPattern: RegExp;
  schema: z.ZodSchema;
}

const RULES: VfsSchemaRule[] = [
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/world_info\.json$/,
    schema: worldInfoSchema,
  },
  {
    templateId: "template.config.theme",
    logicalPathPattern: /^world\/theme_config\.json$/,
    schema: ThemeConfigSchema,
  },
  {
    templateId: "template.config.custom_rules",
    logicalPathPattern: /^custom_rules\/README\.md$/,
    schema: z.string(),
  },
  {
    templateId: "template.config.custom_rules",
    logicalPathPattern: /^custom_rules\/[^/]+\/RULES\.md$/,
    schema: z.string(),
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/locations\/[^/]+\.json$/,
    schema: locationSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/locations\/[^/]+\/items\/[^/]+\.json$/,
    schema: inventoryItemSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/quests\/[^/]+\.json$/,
    schema: questSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/knowledge\/[^/]+\.json$/,
    schema: knowledgeEntrySchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/factions\/[^/]+\.json$/,
    schema: factionSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/timeline\/[^/]+\.json$/,
    schema: timelineEventSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/causal_chains\/[^/]+\.json$/,
    schema: causalChainSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/characters\/char:player\/profile\.json$/,
    schema: strictPlayerProfileSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/characters\/[^/]+\/profile\.json$/,
    schema: actorProfileSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/characters\/[^/]+\/views\/world_info\.json$/,
    schema: worldInfoViewSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/characters\/[^/]+\/views\/quests\/[^/]+\.json$/,
    schema: questViewSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/characters\/[^/]+\/views\/knowledge\/[^/]+\.json$/,
    schema: knowledgeEntryViewSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/characters\/[^/]+\/views\/timeline\/[^/]+\.json$/,
    schema: timelineEventViewSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/characters\/[^/]+\/views\/locations\/[^/]+\.json$/,
    schema: locationViewSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/characters\/[^/]+\/views\/factions\/[^/]+\.json$/,
    schema: factionViewSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/characters\/[^/]+\/views\/causal_chains\/[^/]+\.json$/,
    schema: causalChainViewSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/characters\/[^/]+\/skills\/[^/]+\.json$/,
    schema: skillSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/characters\/[^/]+\/conditions\/[^/]+\.json$/,
    schema: conditionSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/characters\/[^/]+\/traits\/[^/]+\.json$/,
    schema: hiddenTraitSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/characters\/[^/]+\/inventory\/[^/]+\.json$/,
    schema: inventoryItemSchema,
  },
  {
    templateId: "template.story.world",
    logicalPathPattern: /^world\/global\.json$/,
    schema: GlobalSchema,
  },
  {
    templateId: "template.story.summary",
    logicalPathPattern: /^summary\/state\.json$/,
    schema: SummaryStateSchema,
  },
  {
    templateId: "template.narrative.outline.main",
    logicalPathPattern: /^outline\/outline\.json$/,
    schema: storyOutlineSchema,
  },
  {
    templateId: "template.narrative.outline.progress",
    logicalPathPattern: /^outline\/progress\.json$/,
    schema: jsonValueSchema,
  },
  {
    templateId: "template.story.conversation",
    logicalPathPattern: /^conversation\/turn\.json$/,
    schema: ConversationTurnSchema,
  },
  {
    templateId: "template.narrative.outline.phases",
    logicalPathPattern: /^outline\/phases\/phase[0-9]\.json$/,
    schema: jsonValueSchema,
  },
];

export interface VfsSchemaMatch {
  path: string;
  logicalPath: string;
  canonicalPath: string;
  templateId: string;
  schema: z.ZodSchema;
}

export class VfsSchemaRegistry {
  private readonly rules: VfsSchemaRule[];

  constructor(rules: VfsSchemaRule[] = RULES) {
    this.rules = [...rules];
  }

  public getForPath(
    path: string,
    options?: { activeForkId?: number },
  ): VfsSchemaMatch {
    const resolved = resolveVfsPath(path, { activeForkId: options?.activeForkId });
    const logicalPath = normalizeVfsPath(
      canonicalToLogicalVfsPath(resolved.canonicalPath, {
        activeForkId: resolved.activeForkId,
        looseFork: true,
      }),
    );
    const classification = vfsPathRegistry.classify(resolved.canonicalPath, {
      activeForkId: resolved.activeForkId,
    });

    const rule = this.rules.find(
      (entry) =>
        entry.templateId === classification.templateId &&
        entry.logicalPathPattern.test(logicalPath),
    );

    if (!rule) {
      throw new Error(
        `No schema registered for path: ${normalizeVfsPath(path)} (template=${classification.templateId}, logical=${logicalPath})`,
      );
    }

    return {
      path: normalizeVfsPath(path),
      logicalPath,
      canonicalPath: resolved.canonicalPath,
      templateId: classification.templateId,
      schema: rule.schema,
    };
  }
}

export const vfsSchemaRegistry = new VfsSchemaRegistry();

export const getSchemaForPath = (
  path: string,
  options?: { activeForkId?: number },
): z.ZodSchema => vfsSchemaRegistry.getForPath(path, options).schema;
