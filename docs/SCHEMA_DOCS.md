# Game Data Schema Documentation

> Auto-generated from `services/zodSchemas.ts`

## General

### visibleInfoSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `description` | string | Visual or public description. |
| `notes` | string (opt) | Player or public notes. |

### hiddenInfoSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `truth` | string | The hidden truth or real nature. |
| `secrets` | string (opt) | Hidden secrets. |

### inventoryItemVisibleSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `description` | string | Visual description of the item. |
| `notes` | string (opt) | Player's notes about the item. |

### inventoryItemHiddenSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `truth` | string | True nature/power of the item. |
| `secrets` | string (opt) | Hidden secrets about the item. |

### inventoryItemSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string (opt) | Format: inv:N |
| `name` | string | Name of the item. |
| `visible` | [inventoryItemVisibleSchema](#inventoryitemvisibleschema) | - |
| `hidden` | [inventoryItemHiddenSchema](#inventoryitemhiddenschema) (opt) | - |
| `lore` | string (opt) | Brief lore or history of the item. |
| `icon` | string (opt) | Icon identifier for the item. |
| `unlocked` | unknown (opt) | - |
| `highlight` | unknown (opt) | True when updated in current turn (for UI). |
| `createdAt` | number (opt) | - |
| `lastModified` | number (opt) | - |
| `lastAccess` | number (opt) | - |

### relationshipVisibleSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Name/Title the player knows them by. |
| `description` | unknown | Public perception - how others view this NPC. |
| `appearance` | string (opt) | Physical appearance details. |
| `relationshipType` | unknown | - |
| `currentImpression` | unknown (opt) | The NPC's current state from the protagonist's perspective. |
| `personality` | unknown (opt) | Public perception of personality - what people SAY about them. |
| `affinity` | unknown | - |
| `affinityKnown` | unknown (opt) | Whether the player knows the affinity level. |

### relationshipHiddenSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `trueName` | unknown (opt) | The character's real name (if different). |
| `realPersonality` | unknown | True personality - what they REALLY are like. |
| `realMotives` | string | True underlying motives and goals. |
| `secrets` | string (opt) | Character's secrets. |
| `trueAffinity` | number (opt) | True affinity score. |
| `relationshipType` | unknown | - |
| `status` | unknown | - |

### relationshipSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string (opt) | Format: npc:N |
| `known` | unknown (opt) | Whether the player knows this character. |
| `currentLocation` | unknown (opt) | The NPC's current location ID (e.g., 'loc:1'). |
| `visible` | [relationshipVisibleSchema](#relationshipvisibleschema) | - |
| `hidden` | [relationshipHiddenSchema](#relationshiphiddenschema) | - |
| `notes` | unknown (opt) | NPC's observations of player's displayed knowledge/behavior. |
| `unlocked` | unknown (opt) | - |
| `highlight` | boolean (opt) | - |
| `createdAt` | number (opt) | - |
| `lastModified` | number (opt) | - |
| `lastAccess` | number (opt) | - |

### locationVisibleSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `description` | string | Visual description of the location. |
| `knownFeatures` | string | Known features of the location. |

### locationHiddenSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `fullDescription` | string | True nature of the location. |
| `hiddenFeatures` | string | Hidden features not yet discovered. |
| `secrets` | string | Location secrets. |

### locationSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string (opt) | Format: loc:N |
| `name` | string | Name of the location. |
| `visible` | [locationVisibleSchema](#locationvisibleschema) | - |
| `hidden` | [locationHiddenSchema](#locationhiddenschema) (opt) | - |
| `environment` | string (opt) | Atmosphere/Environment tag. |
| `lore` | string (opt) | Location history or lore. |
| `isVisited` | unknown (opt) | Whether the location has been visited. |
| `unlocked` | unknown (opt) | - |
| `highlight` | boolean (opt) | - |
| `createdAt` | number (opt) | - |
| `discoveredAt` | number (opt) | - |
| `lastAccess` | number (opt) | - |
| `notes` | string (opt) | - |

### questVisibleSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `description` | string | The apparent objective. |
| `objectives` | string | Visible quest objectives. |

### questHiddenSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `trueDescription` | unknown (opt) | The hidden truth or real purpose. |
| `trueObjectives` | string (opt) | True hidden objectives. |
| `secretOutcome` | unknown (opt) | Secret outcome if quest is completed. |

### questSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string (opt) | Format: quest:N |
| `title` | string | Quest title. |
| `type` | [questTypeSchema](#questtypeschema) | Quest type: main, side, or hidden. |
| `status` | [questStatusSchema](#queststatusschema) (opt) | - |
| `visible` | [questVisibleSchema](#questvisibleschema) | - |
| `hidden` | [questHiddenSchema](#questhiddenschema) (opt) | - |
| `unlocked` | unknown (opt) | AI DECISION: Set true when quest's hidden purpose is revealed. |
| `highlight` | boolean (opt) | - |
| `createdAt` | number (opt) | - |
| `lastModified` | number (opt) | - |
| `lastAccess` | number (opt) | - |

### skillVisibleSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `description` | string | Publicly known description. |
| `knownEffects` | string | Known effects of the skill. |

### skillHiddenSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `trueDescription` | string | True nature/power of the skill. |
| `hiddenEffects` | string | Hidden effects not yet discovered. |
| `drawbacks` | string (opt) | Hidden drawbacks or costs. |

### skillSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string (opt) | Format: skill:N |
| `name` | string | Skill name. |
| `level` | string | Skill level (e.g. Novice, Master, 1-100). |
| `visible` | [skillVisibleSchema](#skillvisibleschema) | - |
| `hidden` | [skillHiddenSchema](#skillhiddenschema) (opt) | - |
| `category` | string (opt) | Skill category. |
| `experience` | number (opt) | - |
| `unlocked` | unknown (opt) | - |
| `highlight` | boolean (opt) | - |

### conditionVisibleSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `description` | string | Visible description of the condition. |
| `perceivedSeverity` | unknown (opt) | How severe it appears to be. |

### conditionHiddenSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `trueCause` | string | The true cause of this condition. |
| `actualSeverity` | unknown (opt) | Actual severity level. |
| `progression` | unknown (opt) | How the condition will progress. |
| `cure` | string (opt) | How to cure or remove this condition. |

### conditionEffectsSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `visible` | string | Effects the player can see. |
| `hidden` | string | Hidden effects only GM knows. |

### conditionSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string (opt) | Format: cond:N |
| `name` | string | Condition name. |
| `type` | [conditionTypeSchema](#conditiontypeschema) | - |
| `visible` | [conditionVisibleSchema](#conditionvisibleschema) | - |
| `hidden` | [conditionHiddenSchema](#conditionhiddenschema) (opt) | - |
| `effects` | [conditionEffectsSchema](#conditioneffectsschema) | - |
| `duration` | number (opt) | Duration in turns. |
| `startTime` | number (opt) | - |
| `unlocked` | unknown (opt) | AI DECISION: Set true when true cause/cure revealed. |
| `highlight` | boolean (opt) | - |

### knowledgeVisibleSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `description` | string | What is commonly known about this topic. |
| `details` | string (opt) | Additional details or context. |

### knowledgeHiddenSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `fullTruth` | string | The complete truth (GM knowledge). |
| `misconceptions` | string (opt) | Common misconceptions. |
| `toBeRevealed` | string (opt) | Info to be revealed later. |

### knowledgeEntrySchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string (opt) | Format: know:N |
| `title` | string | Title of the knowledge entry. |
| `category` | [knowledgeCategorySchema](#knowledgecategoryschema) | Category for organization. |
| `visible` | [knowledgeVisibleSchema](#knowledgevisibleschema) | - |
| `hidden` | [knowledgeHiddenSchema](#knowledgehiddenschema) (opt) | - |
| `discoveredAt` | unknown (opt) | When this knowledge was discovered. |
| `relatedTo` | string (opt) | Related entity IDs. |
| `unlocked` | unknown (opt) | AI DECISION: Set true when full truth discovered. |
| `highlight` | boolean (opt) | - |
| `createdAt` | number (opt) | - |
| `lastModified` | number (opt) | - |
| `lastAccess` | number (opt) | - |

### timelineEventVisibleSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `description` | string | Publicly known description of the event. |
| `causedBy` | unknown (opt) | Publicly known cause or instigator. |

### timelineEventHiddenSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `trueDescription` | unknown | The true nature of the event (GM knowledge). |
| `trueCausedBy` | string (opt) | The real instigator or cause. |
| `consequences` | string (opt) | Hidden consequences or future implications. |

### timelineEventSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Unique ID for the event. Format: evt:N |
| `gameTime` | string | When the event happened in game time. |
| `category` | [timelineEventCategorySchema](#timelineeventcategoryschema) | Category of the event. |
| `visible` | [timelineEventVisibleSchema](#timelineeventvisibleschema) | - |
| `hidden` | [timelineEventHiddenSchema](#timelineeventhiddenschema) (opt) | - |
| `involvedEntities` | string (opt) | IDs of involved entities. |
| `chainId` | string (opt) | Link to a CausalChain. |
| `unlocked` | unknown (opt) | - |
| `known` | unknown (opt) | Set to true if the player witnessed or heard about this event. |
| `lastAccess` | number (opt) | - |
| `highlight` | boolean (opt) | - |

### pendingConsequenceSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Unique ID for tracking. |
| `description` | string | What could happen if triggered. |
| `readyAfterTurn` | unknown | The consequence CAN'T trigger UNTIL after this turn number. |
| `createdAtTurn` | unknown (opt) | Turn when this consequence was created. |
| `conditions` | string (opt) | Narrative conditions you'll check when deciding to trigger. |
| `triggered` | unknown (opt) | True once consequence has been triggered. |
| `triggeredAtTurn` | number (opt) | Turn when triggered. |
| `known` | unknown (opt) | - |

### rootCauseSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `eventId` | string | ID of the root cause event. |
| `description` | string | Description of the root cause. |

### causalChainSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `chainId` | string | Format: chain:N |
| `rootCause` | [rootCauseSchema](#rootcauseschema) | - |
| `events` | [timelineEventSchema](#timelineeventschema) (opt) | Events in this chain. |
| `status` | [causalChainStatusSchema](#causalchainstatusschema) | Current status of the chain. |
| `pendingConsequences` | [pendingConsequenceSchema](#pendingconsequenceschema) (opt) | - |

### factionMemberSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Name of the member. |
| `title` | string (opt) | Optional title or role. |

### factionRelationSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `target` | string | Target faction name. |
| `status` | string | Relationship status. |

### factionVisibleSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `agenda` | string | Public agenda/reputation. |
| `members` | [factionMemberSchema](#factionmemberschema) (opt) | Publicly known members. |
| `influence` | string (opt) | Perceived influence description. |
| `relations` | [factionRelationSchema](#factionrelationschema) (opt) | Public alliances/rivalries. |

### factionHiddenSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `agenda` | string | Secret agenda/corruption. |
| `members` | [factionMemberSchema](#factionmemberschema) (opt) | Secret members/leaders. |
| `influence` | string (opt) | True influence description. |
| `relations` | [factionRelationSchema](#factionrelationschema) (opt) | Secret alliances/rivalries. |

### factionSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string (opt) | Format: fac:N |
| `name` | string | Faction name. |
| `visible` | [factionVisibleSchema](#factionvisibleschema) | - |
| `hidden` | [factionHiddenSchema](#factionhiddenschema) | - |
| `unlocked` | unknown (opt) | True when secret agenda is revealed. |
| `highlight` | boolean (opt) | - |

### characterAttributeSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `label` | unknown | Name of attribute (e.g. Health, Sanity, Credits). |
| `value` | number | Current value. |
| `maxValue` | number | Maximum value. |
| `color` | [attributeColorSchema](#attributecolorschema) | Visual color hint. |

### hiddenTraitSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string (opt) | Format: trait:N |
| `name` | string | Trait name. |
| `description` | string | Description of the trait. |
| `effects` | string | Effects when triggered. |
| `triggerConditions` | string (opt) | Conditions to trigger the trait. |
| `unlocked` | unknown | - |
| `highlight` | boolean (opt) | - |

### characterStatusSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Name of the protagonist. |
| `title` | string | Starting Class/Role/Title. |
| `status` | string | Initial condition (e.g. Healthy, Amnesiac). |
| `attributes` | [characterAttributeSchema](#characterattributeschema) | Character attributes. |
| `skills` | array | Character skills. |
| `conditions` | array | Active conditions. |
| `hiddenTraits` | [hiddenTraitSchema](#hiddentraitschema) (opt) | Hidden personality traits. |
| `appearance` | string | Detailed physical appearance. |
| `profession` | string | Character's occupation or class. |
| `background` | string | Brief life story and background. |
| `race` | unknown | The character's race (e.g. Human, Elf, Dwarf, etc.). |

### worldSettingVisibleSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `description` | string | Common knowledge about the world. |
| `rules` | unknown (opt) | Known rules or laws of the world (magic, physics, society). |

### worldSettingHiddenSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `hiddenRules` | unknown (opt) | Secret rules or laws unknown to most. |
| `secrets` | string (opt) | World-level secrets and hidden truths. |

### worldSettingSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `visible` | [worldSettingVisibleSchema](#worldsettingvisibleschema) | - |
| `hidden` | [worldSettingHiddenSchema](#worldsettinghiddenschema) | Secret truths about the world. |
| `history` | string | Ancient events that shape the present. |

### mainGoalVisibleSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `description` | string | The apparent main motivation or task. |
| `conditions` | string | Known conditions for achieving the goal. |

### mainGoalHiddenSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `trueDescription` | unknown | The hidden true nature or purpose of the goal. |
| `trueConditions` | string | Secret conditions for the true goal. |

### mainGoalSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `visible` | [mainGoalVisibleSchema](#maingoalvisibleschema) | The apparent goal. |
| `hidden` | [mainGoalHiddenSchema](#maingoalhiddenschema) | - |

### atmosphereSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `envTheme` | [envThemeSchema](#envthemeschema) | - |
| `ambience` | [ambienceSchema](#ambienceschema) | - |
| `weather` | [weatherEffectSchema](#weathereffectschema) (opt) | Specific visual weather effect to render. |

### storyOutlineSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `title` | string | A creative title for the adventure. |
| `initialTime` | unknown | - |
| `premise` | string | The inciting incident and setting setup. |
| `mainGoal` | [mainGoalSchema](#maingoalschema) | The primary driving force of the story. |
| `quests` | [questSchema](#questschema) | Initial quests (at least one main quest is required). |
| `worldSetting` | [worldSettingSchema](#worldsettingschema) | Dual-layer world setting. |
| `factions` | [factionSchema](#factionschema) | Major power groups or factions. |
| `locations` | [locationSchema](#locationschema) | Initial locations with full details. |
| `knowledge` | [knowledgeEntrySchema](#knowledgeentryschema) | Initial knowledge entries about the world. |
| `timeline` | [timelineEventSchema](#timelineeventschema) | Initial timeline events representing the backstory. |
| `character` | [characterStatusSchema](#characterstatusschema) | - |
| `inventory` | [inventoryItemSchema](#inventoryitemschema) | Initial items in the inventory (1-3 items). |
| `relationships` | [relationshipSchema](#relationshipschema) | Initial relationships (1-2 NPCs). |
| `initialAtmosphere` | [atmosphereSchema](#atmosphereschema) | - |
| `worldSettingUnlocked` | unknown (opt) | True when worldSetting.hidden is revealed. |
| `mainGoalUnlocked` | unknown (opt) | True when mainGoal.hidden is revealed. |

### outlinePhase1Schema

| Field | Type | Description |
| :--- | :--- | :--- |
| `title` | string | A creative title for the adventure. |
| `initialTime` | unknown | - |
| `premise` | unknown | The inciting incident and setting setup (2-3 paragraphs). |
| `worldSetting` | [worldSettingSchema](#worldsettingschema) | - |
| `mainGoal` | [mainGoalSchema](#maingoalschema) | The primary driving force of the story. |

### outlinePhase2Schema

| Field | Type | Description |
| :--- | :--- | :--- |
| `character` | [characterStatusSchema](#characterstatusschema) | - |

### outlinePhase3Schema

| Field | Type | Description |
| :--- | :--- | :--- |
| `locations` | [locationSchema](#locationschema) | 1-2 initial locations with detailed visible and hidden layers. |
| `factions` | [factionSchema](#factionschema) | 2-3 major power groups with visible and hidden agendas. |

### outlinePhase4Schema

| Field | Type | Description |
| :--- | :--- | :--- |
| `relationships` | [relationshipSchema](#relationshipschema) | - |
| `inventory` | [inventoryItemSchema](#inventoryitemschema) | 1-3 starting items with detailed lore and hidden properties. |

### outlinePhase5Schema

| Field | Type | Description |
| :--- | :--- | :--- |
| `quests` | [questSchema](#questschema) | - |
| `knowledge` | [knowledgeEntrySchema](#knowledgeentryschema) | 2-3 initial knowledge entries about the world. |
| `timeline` | [timelineEventSchema](#timelineeventschema) | 3-5 backstory timeline events with visible and hidden layers. |
| `initialAtmosphere` | [atmosphereSchema](#atmosphereschema) | - |

### summaryVisibleSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `narrative` | string | Narrative summary from player perspective. |
| `majorEvents` | string | List of major events player witnessed. |
| `characterDevelopment` | unknown | Character development from player's view. |
| `worldState` | string | World state as player understands it. |

### summaryHiddenSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `truthNarrative` | unknown | Objective truth narrative of what really happened. |
| `hiddenPlots` | string | Hidden plots developing in the background. |
| `npcActions` | string | NPC actions player didn't witness. |
| `worldTruth` | string | Real state of the world. |
| `unrevealed` | string | Secrets not yet revealed to player. |

### storySummarySchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | number (opt) | - |
| `displayText` | unknown | - |
| `visible` | [summaryVisibleSchema](#summaryvisibleschema) | - |
| `hidden` | [summaryHiddenSchema](#summaryhiddenschema) | - |
| `timeRange` | string | - |
| `from` | string | - |
| `to` | string | - |

### gameResponseSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `narrative` | unknown | - |
| `choices` | string | 2-4 options for the player's next action. |
| `imagePrompt` | unknown (opt) | - |
| `generateImage` | unknown (opt) | Whether to generate an image for this turn. |
| `atmosphere` | [atmosphereSchema](#atmosphereschema) (opt) | - |
| `narrativeTone` | unknown (opt) | - |
| `inventoryActions` | enum | - |
| `action` | enum | - |
| `id` | string (opt) | - |
| `name` | string | - |
| `visible` | [inventoryItemVisibleSchema](#inventoryitemvisibleschema) (opt) | - |
| `hidden` | [inventoryItemHiddenSchema](#inventoryitemhiddenschema) (opt) | - |
| `lore` | string (opt) | - |
| `unlocked` | boolean (opt) | - |
| `relationshipActions` | enum | - |
| `action` | enum | - |
| `id` | string (opt) | - |
| `known` | boolean (opt) | - |
| `visible` | [relationshipVisibleSchema](#relationshipvisibleschema) (opt) | - |
| `hidden` | [relationshipHiddenSchema](#relationshiphiddenschema) (opt) | - |
| `notes` | string (opt) | - |
| `unlocked` | boolean (opt) | - |
| `locationActions` | enum | - |
| `type` | enum | - |
| `action` | enum | - |
| `id` | string (opt) | - |
| `name` | string | - |
| `visible` | [locationVisibleSchema](#locationvisibleschema) (opt) | - |
| `hidden` | [locationHiddenSchema](#locationhiddenschema) (opt) | - |
| `lore` | string (opt) | - |
| `environment` | string (opt) | - |
| `notes` | string (opt) | - |
| `unlocked` | boolean (opt) | - |
| `questActions` | enum | - |
| `action` | enum | - |
| `id` | string | - |
| `title` | string (opt) | - |
| `type` | [questTypeSchema](#questtypeschema) (opt) | - |
| `visible` | [questVisibleSchema](#questvisibleschema) (opt) | - |
| `hidden` | [questHiddenSchema](#questhiddenschema) (opt) | - |
| `unlocked` | boolean (opt) | - |
| `knowledgeActions` | enum | - |
| `action` | enum | - |
| `id` | string (opt) | - |
| `title` | string (opt) | - |
| `category` | [knowledgeCategorySchema](#knowledgecategoryschema) (opt) | - |
| `visible` | [knowledgeVisibleSchema](#knowledgevisibleschema) (opt) | - |
| `hidden` | [knowledgeHiddenSchema](#knowledgehiddenschema) (opt) | - |
| `discoveredAt` | string (opt) | - |
| `relatedTo` | string (opt) | - |
| `unlocked` | boolean (opt) | - |
| `factionActions` | enum | - |
| `action` | enum | - |
| `id` | string | - |
| `name` | string | - |
| `visible` | string (opt) | - |
| `hidden` | string (opt) | - |
| `characterUpdates` | enum | - |
| `attributes` | enum | - |
| `action` | enum | - |
| `name` | string | - |
| `value` | number (opt) | - |
| `maxValue` | number (opt) | - |
| `color` | [attributeColorSchema](#attributecolorschema) (opt) | - |
| `skills` | enum | - |
| `action` | enum | - |
| `name` | string | - |
| `level` | string (opt) | - |
| `visible` | [skillVisibleSchema](#skillvisibleschema) (opt) | - |
| `hidden` | [skillHiddenSchema](#skillhiddenschema) (opt) | - |
| `category` | string (opt) | - |
| `unlocked` | boolean (opt) | - |
| `conditions` | enum | - |
| `action` | enum | - |
| `id` | string (opt) | - |
| `name` | string | - |
| `type` | [conditionTypeSchema](#conditiontypeschema) (opt) | - |
| `visible` | [conditionVisibleSchema](#conditionvisibleschema) (opt) | - |
| `hidden` | [conditionHiddenSchema](#conditionhiddenschema) (opt) | - |
| `effects` | [conditionEffectsSchema](#conditioneffectsschema) (opt) | - |
| `duration` | number (opt) | - |
| `unlocked` | boolean (opt) | - |
| `hiddenTraits` | enum | - |
| `action` | enum | - |
| `id` | string (opt) | - |
| `name` | string | - |
| `description` | string (opt) | - |
| `effects` | string (opt) | - |
| `triggerConditions` | string (opt) | - |
| `unlocked` | boolean (opt) | - |
| `profile` | string (opt) | - |
| `status` | string (opt) | - |
| `appearance` | string (opt) | - |
| `profession` | string (opt) | - |
| `background` | string (opt) | - |
| `race` | string (opt) | - |

### finishTurnSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `narrative` | string | - |
| `choices` | string | - |
| `imagePrompt` | unknown (opt) | Optional prompt for generating an image of the current scene. |
| `generateImage` | unknown (opt) | Whether to generate an image for this turn. |
| `atmosphere` | [atmosphereSchema](#atmosphereschema) (opt) | - |
| `narrativeTone` | unknown (opt) | - |
| `aliveEntities` | string (opt) | Item IDs (inv:N) relevant for next turn. |
| `inventory` | string (opt) | Item IDs (inv:N) relevant for next turn. |
| `relationships` | string (opt) | NPC IDs (npc:N) relevant for next turn. |
| `locations` | string (opt) | Location IDs (loc:N) relevant for next turn. |
| `quests` | string (opt) | Quest IDs (quest:N) relevant for next turn. |
| `knowledge` | string (opt) | Knowledge IDs (know:N) relevant for next turn. |
| `timeline` | string (opt) | Event IDs (evt:N) relevant for next turn. |
| `skills` | string (opt) | Character skill IDs relevant for next turn. |
| `conditions` | string (opt) | Character condition IDs relevant for next turn. |
| `hiddenTraits` | string (opt) | Character hidden trait IDs relevant for next turn. |
| `causalChains` | string (opt) | - |

### translationSchema

| Field | Type | Description |
| :--- | :--- | :--- |
| `segments` | string | - |
| `id` | string | - |
| `text` | string | - |
| `choices` | string | - |
| `inventory` | string (opt) | - |
| `character` | string (opt) | - |
| `name` | string (opt) | - |
| `title` | string (opt) | - |
| `appearance` | string (opt) | - |
| `profession` | string (opt) | - |
| `background` | string (opt) | - |
| `race` | string (opt) | - |

