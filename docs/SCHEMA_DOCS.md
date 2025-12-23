# Game Data Schema Documentation

## Definitions

| Column          | Description                                                                                                                                                                        |
| :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Field**       | The name of the field in the JSON object.                                                                                                                                          |
| **Type**        | The data type (e.g., string, number, boolean, array, object). For `enum`, allowed values are listed in parentheses.                                                                |
| **Description** | A brief explanation of the field's purpose and content.                                                                                                                            |
| **Mutability**  | **[STATIC]**: Never changes. **[SEMI-STATIC]**: Changes rarely (e.g., major plot points). **[DYNAMIC]**: Changes frequently. **[MIXED]**: Contains both static and dynamic fields. |
| **Visibility**  | **[VISIBLE]**: Always visible to the AI. **[INVISIBLE]**: Never visible to the AI (internal state). **[CONDITIONAL]**: Visible only when specific conditions are met.              |

## General

### visibleInfoSchema

| Field         | Type         | Description                   | Mutability    | Visibility    |
| :------------ | :----------- | :---------------------------- | :------------ | :------------ |
| `description` | string       | Visual or public description. | **[STATIC]**  | **[VISIBLE]** |
| `notes`       | string (opt) | Player or public notes.       | **[DYNAMIC]** | **[VISIBLE]** |

### hiddenInfoSchema

| Field     | Type         | Description                      | Mutability        | Visibility        |
| :-------- | :----------- | :------------------------------- | :---------------- | :---------------- |
| `truth`   | string       | The hidden truth or real nature. | **[STATIC]**      | **[CONDITIONAL]** |
| `secrets` | string (opt) | Hidden secrets.                  | **[SEMI-STATIC]** | **[CONDITIONAL]** |

### inventoryItemVisibleSchema

| Field         | Type         | Description                                             | Mutability    | Visibility    |
| :------------ | :----------- | :------------------------------------------------------ | :------------ | :------------ |
| `description` | string       | Visual description of the item.                         | **[STATIC]**  | **[VISIBLE]** |
| `usage`       | string (opt) | How to use the item.                                    | **[STATIC]**  | **[VISIBLE]** |
| `observation` | string (opt) | Player's personal notes or observations about the item. | **[DYNAMIC]** | **[VISIBLE]** |
| `sensory`     | object (opt) | Sensory details (texture, weight, smell).               | **[STATIC]**  | **[VISIBLE]** |
| `condition`   | string (opt) | Physical state/wear (e.g. 'rusty', 'pristine').         | **[DYNAMIC]** | **[VISIBLE]** |
| `notes`       | string (opt) | **[DEPRECATED]** Use `observation` or `lore` instead.   | **[DYNAMIC]** | **[VISIBLE]** |

### inventoryItemHiddenSchema

| Field     | Type         | Description                    | Mutability        | Visibility        |
| :-------- | :----------- | :----------------------------- | :---------------- | :---------------- |
| `truth`   | string       | True nature/power of the item. | **[STATIC]**      | **[CONDITIONAL]** |
| `secrets` | string (opt) | Hidden secrets about the item. | **[SEMI-STATIC]** | **[CONDITIONAL]** |

### inventoryItemSchema

| Field             | Type                                                          | Description                                                        | Mutability    | Visibility        |
| :---------------- | :------------------------------------------------------------ | :----------------------------------------------------------------- | :------------ | :---------------- |
| `id`              | string                                                        | REQUIRED. Unique ID (e.g., 'rusty_sword', 'inv:5').                | **[STATIC]**  | **[VISIBLE]**     |
| `name`            | string                                                        | Name of the item.                                                  | **[STATIC]**  | **[VISIBLE]**     |
| `visible`         | [inventoryItemVisibleSchema](#inventoryitemvisibleschema)     | -                                                                  | **[STATIC]**  | **[VISIBLE]**     |
| `hidden`          | [inventoryItemHiddenSchema](#inventoryitemhiddenschema) (opt) | -                                                                  | **[STATIC]**  | **[CONDITIONAL]** |
| `lore`            | string (opt)                                                  | Brief lore or history of the item.                                 | **[STATIC]**  | **[VISIBLE]**     |
| `emotionalWeight` | string (opt)                                                  | Sentimental significance of the item.                              | **[STATIC]**  | **[VISIBLE]**     |
| `icon`            | string (opt)                                                  | Icon identifier (emoji) for the item.                              | **[STATIC]**  | **[VISIBLE]**     |
| `unlocked`        | boolean (opt)                                                 | AI DECISION: Set true when hidden truth discovered.                | **[DYNAMIC]** | **[VISIBLE]**     |
| `unlockReason`    | string (opt)                                                  | REQUIRED when unlocked=true. Justification for revelation.         | **[STATIC]**  | **[VISIBLE]**     |
| `highlight`       | boolean (opt)                                                 | True when updated in current turn (for UI).                        | **[DYNAMIC]** | **[VISIBLE]**     |
| `createdAt`       | number (opt)                                                  | -                                                                  | **[STATIC]**  | **[VISIBLE]**     |
| `modifiedAt`      | object (opt)                                                  | Versioned timestamp {forkId, turnNumber}.                          | **[DYNAMIC]** | **[VISIBLE]**     |
| `lastAccess`      | object (opt)                                                  | Access timestamp {forkId, turnNumber, timestamp}.                  | **[DYNAMIC]** | **[INVISIBLE]**   |
| `notes`           | string (opt)                                                  | Writer's notes for consistency. AI must query this before writing. | **[DYNAMIC]** | **[VISIBLE]**     |

### npcVisibleSchema

| Field               | Type          | Description                                           | Mutability        | Visibility    |
| :------------------ | :------------ | :---------------------------------------------------- | :---------------- | :------------ |
| `name`              | string        | Name/Title the player knows them by.                  | **[STATIC]**      | **[VISIBLE]** |
| `description`       | string        | Public perception - how others view this NPC.         | **[STATIC]**      | **[VISIBLE]** |
| `age`               | string (opt)  | Apparent age.                                         | **[STATIC]**      | **[VISIBLE]** |
| `appearance`        | string (opt)  | Physical appearance details.                          | **[STATIC]**      | **[VISIBLE]** |
| `npcType`           | string        | Role/Nature (Friend, Rival, etc.) in target language. | **[SEMI-STATIC]** | **[VISIBLE]** |
| `impression`        | string (opt)  | Protagonist's current impression/feeling.             | **[DYNAMIC]**     | **[VISIBLE]** |
| `status`            | string (opt)  | What protagonist BELIEVES NPC is doing.               | **[DYNAMIC]**     | **[VISIBLE]** |
| `personality`       | string (opt)  | Public perception of personality.                     | **[STATIC]**      | **[VISIBLE]** |
| `dialogueStyle`     | string (opt)  | How they speak (Formal, Slang, etc.).                 | **[STATIC]**      | **[VISIBLE]** |
| `voice`             | string (opt)  | Vocal characteristics.                                | **[STATIC]**      | **[VISIBLE]** |
| `mannerism`         | string (opt)  | Habitual gestures or behaviors.                       | **[STATIC]**      | **[VISIBLE]** |
| `mood`              | string (opt)  | Apparent emotional state.                             | **[DYNAMIC]**     | **[VISIBLE]** |
| `affinity`          | number        | Affinity score 0-100.                                 | **[DYNAMIC]**     | **[VISIBLE]** |
| `affinityKnown`     | boolean (opt) | Whether the player knows the affinity level.          | **[DYNAMIC]**     | **[VISIBLE]** |
| `relationshipType`  | string        | **[DEPRECATED]** Use `npcType` instead.               | **[SEMI-STATIC]** | **[VISIBLE]** |
| `currentImpression` | string (opt)  | **[DEPRECATED]** Use `impression` instead.            | **[DYNAMIC]**     | **[VISIBLE]** |

### npcHiddenSchema

| Field                  | Type         | Description                                   | Mutability        | Visibility        |
| :--------------------- | :----------- | :-------------------------------------------- | :---------------- | :---------------- |
| `trueName`             | string (opt) | The character's real name (if different).     | **[STATIC]**      | **[CONDITIONAL]** |
| `realAge`              | string (opt) | True age.                                     | **[STATIC]**      | **[CONDITIONAL]** |
| `realPersonality`      | string       | True personality - what they REALLY are like. | **[STATIC]**      | **[CONDITIONAL]** |
| `realMotives`          | string       | True underlying motives and goals.            | **[SEMI-STATIC]** | **[CONDITIONAL]** |
| `routine`              | string (opt) | Daily schedule/activities.                    | **[SEMI-STATIC]** | **[CONDITIONAL]** |
| `secrets`              | array (opt)  | Character's secrets.                          | **[SEMI-STATIC]** | **[CONDITIONAL]** |
| `inventory`            | array (opt)  | Character's inventory items.                  | **[DYNAMIC]**     | **[CONDITIONAL]** |
| `trueAffinity`         | number (opt) | True affinity score.                          | **[DYNAMIC]**     | **[CONDITIONAL]** |
| `npcType`              | string       | Role from NPC's perspective.                  | **[SEMI-STATIC]** | **[CONDITIONAL]** |
| `impression`           | string       | NPC's impression about the protagonist.       | **[DYNAMIC]**     | **[CONDITIONAL]** |
| `currentThought`       | string (opt) | Current internal thought (GM only).           | **[DYNAMIC]**     | **[CONDITIONAL]** |
| `status`               | string       | What NPC is ACTUALLY doing right now.         | **[DYNAMIC]**     | **[CONDITIONAL]** |
| `ambivalence`          | string (opt) | Subjective complexity: love/hate paradox.     | **[SEMI-STATIC]** | **[CONDITIONAL]** |
| `transactionalBenefit` | string (opt) | What do they get from protagonist?            | **[SEMI-STATIC]** | **[CONDITIONAL]** |
| `relationshipType`     | string       | **[DEPRECATED]** Use `npcType` instead.       | **[SEMI-STATIC]** | **[CONDITIONAL]** |

### npcSchema

| Field             | Type                                  | Description                                                        | Mutability    | Visibility        |
| :---------------- | :------------------------------------ | :----------------------------------------------------------------- | :------------ | :---------------- |
| `id`              | string                                | REQUIRED. Unique ID (e.g., 'village_elder', 'npc:3').              | **[STATIC]**  | **[VISIBLE]**     |
| `known`           | boolean (opt)                         | Whether the player knows this character.                           | **[DYNAMIC]** | **[VISIBLE]**     |
| `currentLocation` | string                                | The NPC's current location ID (e.g., 'loc:1').                     | **[DYNAMIC]** | **[VISIBLE]**     |
| `visible`         | [npcVisibleSchema](#npcvisibleschema) | -                                                                  | **[MIXED]**   | **[VISIBLE]**     |
| `hidden`          | [npcHiddenSchema](#npchiddenschema)   | -                                                                  | **[MIXED]**   | **[CONDITIONAL]** |
| `observation`     | string (opt)                          | NPC's observations of player.                                      | **[DYNAMIC]** | **[VISIBLE]**     |
| `unlocked`        | boolean (opt)                         | AI DECISION (STRICT): ONLY via investigation/mind-reading etc.     | **[DYNAMIC]** | **[VISIBLE]**     |
| `unlockReason`    | string (opt)                          | REQUIRED when unlocked=true. Evidence/justification.               | **[STATIC]**  | **[VISIBLE]**     |
| `icon`            | string (opt)                          | Emoji icon for the character.                                      | **[STATIC]**  | **[VISIBLE]**     |
| `highlight`       | boolean (opt)                         | -                                                                  | **[DYNAMIC]** | **[VISIBLE]**     |
| `createdAt`       | number (opt)                          | -                                                                  | **[STATIC]**  | **[VISIBLE]**     |
| `modifiedAt`      | object (opt)                          | Versioned timestamp {forkId, turnNumber}.                          | **[DYNAMIC]** | **[VISIBLE]**     |
| `lastAccess`      | object (opt)                          | Access timestamp {forkId, turnNumber, timestamp}.                  | **[DYNAMIC]** | **[INVISIBLE]**   |
| `notes`           | string (opt)                          | Writer's notes for consistency. AI must query this before writing. | **[DYNAMIC]** | **[VISIBLE]**     |
| `npcs`            | [npcSchema](#npcschema)               | **[DEPRECATED]** Use root `npcs` instead.                          | **[MIXED]**   | **[VISIBLE]**     |

### locationVisibleSchema

| Field           | Type         | Description                                             | Mutability        | Visibility    |
| :-------------- | :----------- | :------------------------------------------------------ | :---------------- | :------------ |
| `description`   | string       | Visual description of the location.                     | **[STATIC]**      | **[VISIBLE]** |
| `environment`   | string (opt) | Natural language description of environment/atmosphere. | **[STATIC]**      | **[VISIBLE]** |
| `ambience`      | string (opt) | Natural language description of audio background/mood.  | **[STATIC]**      | **[VISIBLE]** |
| `weather`       | string (opt) | Natural language description of weather.                | **[DYNAMIC]**     | **[VISIBLE]** |
| `knownFeatures` | array        | Known features of the location.                         | **[SEMI-STATIC]** | **[VISIBLE]** |
| `resources`     | array (opt)  | Gatherable resources or items.                          | **[SEMI-STATIC]** | **[VISIBLE]** |
| `atmosphere`    | object (opt) | System UI atmosphere override (Enums).                  | **[DYNAMIC]**     | **[VISIBLE]** |
| `sensory`       | object (opt) | Sensory details (smell, sound, lighting, temperature).  | **[STATIC]**      | **[VISIBLE]** |
| `interactables` | array (opt)  | Visible interactive elements.                           | **[SEMI-STATIC]** | **[VISIBLE]** |

### locationHiddenSchema

| Field             | Type        | Description                         | Mutability        | Visibility        |
| :---------------- | :---------- | :---------------------------------- | :---------------- | :---------------- |
| `fullDescription` | string      | True nature of the location.        | **[STATIC]**      | **[CONDITIONAL]** |
| `dangers`         | array (opt) | Hidden dangers or traps.            | **[SEMI-STATIC]** | **[CONDITIONAL]** |
| `hiddenFeatures`  | array       | Hidden features not yet discovered. | **[SEMI-STATIC]** | **[CONDITIONAL]** |
| `secrets`         | array       | Location secrets.                   | **[SEMI-STATIC]** | **[CONDITIONAL]** |

### locationSchema

| Field          | Type                                                | Description                                                          | Mutability    | Visibility        |
| :------------- | :-------------------------------------------------- | :------------------------------------------------------------------- | :------------ | :---------------- |
| `id`           | string                                              | REQUIRED. Unique ID (e.g., 'loc:cave', 'royal_palace').              | **[STATIC]**  | **[VISIBLE]**     |
| `name`         | string                                              | Name of the location.                                                | **[STATIC]**  | **[VISIBLE]**     |
| `visible`      | [locationVisibleSchema](#locationvisibleschema)     | -                                                                    | **[MIXED]**   | **[VISIBLE]**     |
| `hidden`       | [locationHiddenSchema](#locationhiddenschema) (opt) | -                                                                    | **[MIXED]**   | **[CONDITIONAL]** |
| `lore`         | string (opt)                                        | Location history or lore.                                            | **[STATIC]**  | **[VISIBLE]**     |
| `isVisited`    | boolean (opt)                                       | -                                                                    | **[DYNAMIC]** | **[VISIBLE]**     |
| `unlocked`     | boolean (opt)                                       | AI DECISION: Set true when story context reveals location's secrets. | **[DYNAMIC]** | **[VISIBLE]**     |
| `unlockReason` | string (opt)                                        | REQUIRED when unlocked=true. Evidence/justification.                 | **[STATIC]**  | **[VISIBLE]**     |
| `icon`         | string (opt)                                        | Emoji icon for the location.                                         | **[STATIC]**  | **[VISIBLE]**     |
| `highlight`    | boolean (opt)                                       | -                                                                    | **[DYNAMIC]** | **[VISIBLE]**     |
| `createdAt`    | number (opt)                                        | -                                                                    | **[STATIC]**  | **[VISIBLE]**     |
| `discoveredAt` | number (opt)                                        | -                                                                    | **[STATIC]**  | **[VISIBLE]**     |
| `modifiedAt`   | object (opt)                                        | Versioned timestamp {forkId, turnNumber}.                            | **[DYNAMIC]** | **[VISIBLE]**     |
| `lastAccess`   | object (opt)                                        | Access timestamp {forkId, turnNumber, timestamp}.                    | **[DYNAMIC]** | **[INVISIBLE]**   |
| `notes`        | string (opt)                                        | Writer's notes for consistency. AI must query this before writing.   | **[DYNAMIC]** | **[VISIBLE]**     |
| `environment`  | string (opt)                                        | **[DEPRECATED]** Use `visible.environment` instead.                  | **[STATIC]**  | **[VISIBLE]**     |

### questVisibleSchema

| Field         | Type   | Description               | Mutability        | Visibility    |
| :------------ | :----- | :------------------------ | :---------------- | :------------ |
| `description` | string | The apparent objective.   | **[STATIC]**      | **[VISIBLE]** |
| `objectives`  | string | Visible quest objectives. | **[SEMI-STATIC]** | **[VISIBLE]** |

### questHiddenSchema

| Field             | Type         | Description                           | Mutability        | Visibility        |
| :---------------- | :----------- | :------------------------------------ | :---------------- | :---------------- |
| Field             | Type         | Description                           | Mutability        | Visibility        |
| :---              | :---         | :---                                  | :---              | :---              |
| `trueDescription` | string (opt) | The hidden truth or real purpose.     | **[STATIC]**      | **[CONDITIONAL]** |
| `trueObjectives`  | string (opt) | True hidden objectives.               | **[SEMI-STATIC]** | **[CONDITIONAL]** |
| `secretOutcome`   | string (opt) | Secret outcome if quest is completed. | **[STATIC]**      | **[CONDITIONAL]** |

### questSchema

| Field        | Type                                          | Description                                                        | Mutability    | Visibility        |
| :----------- | :-------------------------------------------- | :----------------------------------------------------------------- | :------------ | :---------------- |
| `id`         | string                                        | REQUIRED. Unique ID (e.g., 'main_quest', 'quest:2').               | **[STATIC]**  | **[VISIBLE]**     |
| `title`      | string                                        | Quest title.                                                       | **[STATIC]**  | **[VISIBLE]**     |
| `type`       | enum (main, side, hidden)                     | Quest type: main, side, or hidden.                                 | **[STATIC]**  | **[VISIBLE]**     |
| `status`     | enum (active, completed, failed) (opt)        | -                                                                  | **[DYNAMIC]** | **[VISIBLE]**     |
| `visible`    | [questVisibleSchema](#questvisibleschema)     | -                                                                  | **[STATIC]**  | **[VISIBLE]**     |
| `hidden`     | [questHiddenSchema](#questhiddenschema) (opt) | -                                                                  | **[STATIC]**  | **[CONDITIONAL]** |
| `unlocked`   | boolean (opt)                                 | AI DECISION: Set true when quest's hidden purpose is revealed.     | **[DYNAMIC]** | **[VISIBLE]**     |
| `highlight`  | boolean (opt)                                 | -                                                                  | **[DYNAMIC]** | **[VISIBLE]**     |
| `createdAt`  | number (opt)                                  | -                                                                  | **[STATIC]**  | **[VISIBLE]**     |
| `modifiedAt` | object (opt)                                  | Versioned timestamp {forkId, turnNumber}.                          | **[DYNAMIC]** | **[VISIBLE]**     |
| `lastAccess` | object (opt)                                  | Access timestamp {forkId, turnNumber, timestamp}.                  | **[DYNAMIC]** | **[INVISIBLE]**   |
| `notes`      | string (opt)                                  | Writer's notes for consistency. AI must query this before writing. | **[DYNAMIC]** | **[VISIBLE]**     |

### skillVisibleSchema

| Field          | Type   | Description                 | Mutability        | Visibility    |
| :------------- | :----- | :-------------------------- | :---------------- | :------------ |
| `description`  | string | Publicly known description. | **[STATIC]**      | **[VISIBLE]** |
| `knownEffects` | string | Known effects of the skill. | **[SEMI-STATIC]** | **[VISIBLE]** |

### skillHiddenSchema

| Field             | Type         | Description                        | Mutability        | Visibility        |
| :---------------- | :----------- | :--------------------------------- | :---------------- | :---------------- |
| `trueDescription` | string       | True nature/power of the skill.    | **[STATIC]**      | **[CONDITIONAL]** |
| `hiddenEffects`   | string       | Hidden effects not yet discovered. | **[SEMI-STATIC]** | **[CONDITIONAL]** |
| `drawbacks`       | string (opt) | Hidden drawbacks or costs.         | **[STATIC]**      | **[CONDITIONAL]** |

### skillSchema

| Field       | Type                                          | Description                                                     | Mutability    | Visibility        |
| :---------- | :-------------------------------------------- | :-------------------------------------------------------------- | :------------ | :---------------- |
| Field       | Type                                          | Description                                                     | Mutability    | Visibility        |
| :---        | :---                                          | :---                                                            | :---          | :---              |
| `id`        | string (opt)                                  | Format: skill:N                                                 | **[STATIC]**  | **[VISIBLE]**     |
| `name`      | string                                        | Skill name.                                                     | **[STATIC]**  | **[VISIBLE]**     |
| `level`     | string                                        | Skill level (e.g. Novice, Master, 1-100).                       | **[DYNAMIC]** | **[VISIBLE]**     |
| `visible`   | [skillVisibleSchema](#skillvisibleschema)     | -                                                               | **[STATIC]**  | **[VISIBLE]**     |
| `hidden`    | [skillHiddenSchema](#skillhiddenschema) (opt) | -                                                               | **[STATIC]**  | **[CONDITIONAL]** |
| `category`  | string (opt)                                  | Skill category.                                                 | **[STATIC]**  | **[VISIBLE]**     |
| `unlocked`  | boolean (opt)                                 | AI DECISION: Set true when skill's hidden nature is understood. | **[DYNAMIC]** | **[VISIBLE]**     |
| `highlight` | boolean (opt)                                 | -                                                               | **[DYNAMIC]** | **[VISIBLE]**     |

### conditionVisibleSchema

| Field               | Type         | Description                           | Mutability    | Visibility    |
| :------------------ | :----------- | :------------------------------------ | :------------ | :------------ |
| Field               | Type         | Description                           | Mutability    | Visibility    |
| :---                | :---         | :---                                  | :---          | :---          |
| `description`       | string       | Visible description of the condition. | **[STATIC]**  | **[VISIBLE]** |
| `perceivedSeverity` | string (opt) | How severe it appears to be.          | **[DYNAMIC]** | **[VISIBLE]** |

### conditionHiddenSchema

| Field            | Type         | Description                           | Mutability        | Visibility        |
| :--------------- | :----------- | :------------------------------------ | :---------------- | :---------------- |
| Field            | Type         | Description                           | Mutability        | Visibility        |
| :---             | :---         | :---                                  | :---              | :---              |
| `trueCause`      | string       | The true cause of this condition.     | **[STATIC]**      | **[CONDITIONAL]** |
| `actualSeverity` | number (opt) | Actual severity level.                | **[DYNAMIC]**     | **[CONDITIONAL]** |
| `progression`    | string (opt) | How the condition will progress.      | **[SEMI-STATIC]** | **[CONDITIONAL]** |
| `cure`           | string (opt) | How to cure or remove this condition. | **[STATIC]**      | **[CONDITIONAL]** |

### conditionEffectsSchema

| Field     | Type   | Description                   |
| :-------- | :----- | :---------------------------- |
| `visible` | string | Effects the player can see.   |
| `hidden`  | string | Hidden effects only GM knows. |

### conditionSchema

| Field       | Type                                                                                      | Description                                          | Mutability    | Visibility        |
| :---------- | :---------------------------------------------------------------------------------------- | :--------------------------------------------------- | :------------ | :---------------- |
| Field       | Type                                                                                      | Description                                          | Mutability    | Visibility        |
| :---        | :---                                                                                      | :---                                                 | :---          | :---              |
| `id`        | string (opt)                                                                              | Format: cond:N                                       | **[STATIC]**  | **[VISIBLE]**     |
| `name`      | string                                                                                    | Condition name.                                      | **[STATIC]**  | **[VISIBLE]**     |
| `type`      | enum (normal, wound, poison, buff, debuff, mental, curse, stun, unconscious, tired, dead) | -                                                    | **[STATIC]**  | **[VISIBLE]**     |
| `visible`   | [conditionVisibleSchema](#conditionvisibleschema)                                         | -                                                    | **[STATIC]**  | **[VISIBLE]**     |
| `hidden`    | [conditionHiddenSchema](#conditionhiddenschema) (opt)                                     | -                                                    | **[STATIC]**  | **[CONDITIONAL]** |
| `effects`   | [conditionEffectsSchema](#conditioneffectsschema)                                         | -                                                    | **[STATIC]**  | **[VISIBLE]**     |
| `duration`  | number (opt)                                                                              | Duration in turns.                                   | **[DYNAMIC]** | **[VISIBLE]**     |
| `startTime` | number (opt)                                                                              | -                                                    | **[STATIC]**  | **[VISIBLE]**     |
| `unlocked`  | boolean (opt)                                                                             | AI DECISION: Set true when true cause/cure revealed. | **[DYNAMIC]** | **[VISIBLE]**     |
| `highlight` | boolean (opt)                                                                             | -                                                    | **[DYNAMIC]** | **[VISIBLE]**     |

### knowledgeVisibleSchema

| Field         | Type         | Description                              | Mutability   | Visibility    |
| :------------ | :----------- | :--------------------------------------- | :----------- | :------------ |
| `description` | string       | What is commonly known about this topic. | **[STATIC]** | **[VISIBLE]** |
| `details`     | string (opt) | Additional details or context.           | **[STATIC]** | **[VISIBLE]** |

### knowledgeHiddenSchema

| Field            | Type         | Description                        | Mutability   | Visibility        |
| :--------------- | :----------- | :--------------------------------- | :----------- | :---------------- |
| `fullTruth`      | string       | The complete truth (GM knowledge). | **[STATIC]** | **[CONDITIONAL]** |
| `misconceptions` | string (opt) | Common misconceptions.             | **[STATIC]** | **[CONDITIONAL]** |
| `toBeRevealed`   | string (opt) | Info to be revealed later.         | **[STATIC]** | **[CONDITIONAL]** |

### knowledgeEntrySchema

| Field          | Type                                                                                | Description                                       | Mutability    | Visibility        |
| :------------- | :---------------------------------------------------------------------------------- | :------------------------------------------------ | :------------ | :---------------- |
| Field          | Type                                                                                | Description                                       | Mutability    | Visibility        |
| :---           | :---                                                                                | :---                                              | :---          | :---              |
| `id`           | string (opt)                                                                        | Format: know:N                                    | **[STATIC]**  | **[VISIBLE]**     |
| `title`        | string                                                                              | Title of the knowledge entry.                     | **[STATIC]**  | **[VISIBLE]**     |
| `category`     | enum (landscape, history, item, legend, faction, culture, magic, technology, other) | Category for organization.                        | **[STATIC]**  | **[VISIBLE]**     |
| `visible`      | [knowledgeVisibleSchema](#knowledgevisibleschema)                                   | -                                                 | **[STATIC]**  | **[VISIBLE]**     |
| `hidden`       | [knowledgeHiddenSchema](#knowledgehiddenschema) (opt)                               | -                                                 | **[STATIC]**  | **[CONDITIONAL]** |
| `discoveredAt` | string (opt)                                                                        | When this knowledge was discovered.               | **[STATIC]**  | **[VISIBLE]**     |
| `relatedTo`    | string (opt)                                                                        | Related entity IDs.                               | **[STATIC]**  | **[VISIBLE]**     |
| `unlocked`     | boolean (opt)                                                                       | AI DECISION: Set true when full truth discovered. | **[DYNAMIC]** | **[VISIBLE]**     |
| `highlight`    | boolean (opt)                                                                       | -                                                 | **[DYNAMIC]** | **[VISIBLE]**     |
| `createdAt`    | number (opt)                                                                        | -                                                 | **[STATIC]**  | **[VISIBLE]**     |
| `lastModified` | number (opt)                                                                        | -                                                 | **[DYNAMIC]** | **[VISIBLE]**     |
| `lastAccess`   | number (opt)                                                                        | -                                                 | **[DYNAMIC]** | **[INVISIBLE]**   |

### timelineEventVisibleSchema

| Field         | Type         | Description                              | Mutability   | Visibility    |
| :------------ | :----------- | :--------------------------------------- | :----------- | :------------ |
| Field         | Type         | Description                              | Mutability   | Visibility    |
| :---          | :---         | :---                                     | :---         | :---          |
| `description` | string       | Publicly known description of the event. | **[STATIC]** | **[VISIBLE]** |
| `causedBy`    | string (opt) | Publicly known cause or instigator.      | **[STATIC]** | **[VISIBLE]** |

### timelineEventHiddenSchema

| Field             | Type         | Description                                  | Mutability        | Visibility        |
| :---------------- | :----------- | :------------------------------------------- | :---------------- | :---------------- |
| Field             | Type         | Description                                  | Mutability        | Visibility        |
| :---              | :---         | :---                                         | :---              | :---              |
| `trueDescription` | string       | The true nature of the event (GM knowledge). | **[STATIC]**      | **[CONDITIONAL]** |
| `trueCausedBy`    | string (opt) | The real instigator or cause.                | **[STATIC]**      | **[CONDITIONAL]** |
| `consequences`    | string (opt) | Hidden consequences or future implications.  | **[SEMI-STATIC]** | **[CONDITIONAL]** |

### timelineEventSchema

| Field              | Type                                                          | Description                                                           | Mutability    | Visibility        |
| :----------------- | :------------------------------------------------------------ | :-------------------------------------------------------------------- | :------------ | :---------------- |
| Field              | Type                                                          | Description                                                           | Mutability    | Visibility        |
| :---               | :---                                                          | :---                                                                  | :---          | :---              |
| `id`               | string                                                        | Unique ID for the event. Format: evt:N                                | **[STATIC]**  | **[VISIBLE]**     |
| `gameTime`         | string                                                        | When the event happened in game time.                                 | **[STATIC]**  | **[VISIBLE]**     |
| `category`         | enum (player_action, npc_action, world_event, consequence)    | Category of the event.                                                | **[STATIC]**  | **[VISIBLE]**     |
| `visible`          | [timelineEventVisibleSchema](#timelineeventvisibleschema)     | -                                                                     | **[STATIC]**  | **[VISIBLE]**     |
| `hidden`           | [timelineEventHiddenSchema](#timelineeventhiddenschema) (opt) | -                                                                     | **[STATIC]**  | **[CONDITIONAL]** |
| `involvedEntities` | string (opt)                                                  | IDs of involved entities.                                             | **[STATIC]**  | **[VISIBLE]**     |
| `chainId`          | string (opt)                                                  | Link to a CausalChain.                                                | **[STATIC]**  | **[VISIBLE]**     |
| `unlocked`         | boolean (opt)                                                 | AI DECISION: Set true when event's true cause/consequences uncovered. | **[DYNAMIC]** | **[VISIBLE]**     |
| `known`            | boolean (opt)                                                 | Set to true if the player witnessed or heard about this event.        | **[DYNAMIC]** | **[VISIBLE]**     |
| `lastAccess`       | number (opt)                                                  | -                                                                     | **[DYNAMIC]** | **[INVISIBLE]**   |
| `highlight`        | boolean (opt)                                                 | -                                                                     | **[DYNAMIC]** | **[VISIBLE]**     |

### pendingConsequenceSchema

| Field             | Type          | Description                                                 | Mutability    | Visibility    |
| :---------------- | :------------ | :---------------------------------------------------------- | :------------ | :------------ |
| Field             | Type          | Description                                                 | Mutability    | Visibility    |
| :---              | :---          | :---                                                        | :---          | :---          |
| `id`              | string        | Unique ID for tracking.                                     | **[STATIC]**  | **[VISIBLE]** |
| `description`     | string        | What could happen if triggered.                             | **[STATIC]**  | **[VISIBLE]** |
| `readyAfterTurn`  | number        | The consequence CAN'T trigger UNTIL after this turn number. | **[STATIC]**  | **[VISIBLE]** |
| `createdAtTurn`   | number (opt)  | Turn when this consequence was created.                     | **[STATIC]**  | **[VISIBLE]** |
| `conditions`      | string (opt)  | Narrative conditions you'll check when deciding to trigger. | **[STATIC]**  | **[VISIBLE]** |
| `triggered`       | boolean (opt) | True once consequence has been triggered.                   | **[DYNAMIC]** | **[VISIBLE]** |
| `triggeredAtTurn` | number (opt)  | Turn when triggered.                                        | **[DYNAMIC]** | **[VISIBLE]** |
| `known`           | boolean (opt) | Will the player know when this happens? Default false.      | **[DYNAMIC]** | **[VISIBLE]** |

### rootCauseSchema

| Field         | Type   | Description                    | Mutability   | Visibility    |
| :------------ | :----- | :----------------------------- | :----------- | :------------ |
| `eventId`     | string | ID of the root cause event.    | **[STATIC]** | **[VISIBLE]** |
| `description` | string | Description of the root cause. | **[STATIC]** | **[VISIBLE]** |

### causalChainSchema

| Field                 | Type                                                        | Description                  | Mutability    | Visibility    |
| :-------------------- | :---------------------------------------------------------- | :--------------------------- | :------------ | :------------ |
| Field                 | Type                                                        | Description                  | Mutability    | Visibility    |
| :---                  | :---                                                        | :---                         | :---          | :---          |
| `chainId`             | string                                                      | Format: chain:N              | **[STATIC]**  | **[VISIBLE]** |
| `rootCause`           | [rootCauseSchema](#rootcauseschema)                         | -                            | **[STATIC]**  | **[VISIBLE]** |
| `events`              | [timelineEventSchema](#timelineeventschema) (opt)           | Events in this chain.        | **[DYNAMIC]** | **[VISIBLE]** |
| `status`              | enum (active, resolved, interrupted)                        | Current status of the chain. | **[DYNAMIC]** | **[VISIBLE]** |
| `pendingConsequences` | [pendingConsequenceSchema](#pendingconsequenceschema) (opt) | -                            | **[DYNAMIC]** | **[VISIBLE]** |

### factionMemberSchema

| Field   | Type         | Description             | Mutability   | Visibility    |
| :------ | :----------- | :---------------------- | :----------- | :------------ |
| `name`  | string       | Name of the member.     | **[STATIC]** | **[VISIBLE]** |
| `title` | string (opt) | Optional title or role. | **[STATIC]** | **[VISIBLE]** |

### factionRelationSchema

| Field    | Type   | Description          | Mutability    | Visibility    |
| :------- | :----- | :------------------- | :------------ | :------------ |
| `target` | string | Target faction name. | **[STATIC]**  | **[VISIBLE]** |
| `status` | string | Relationship status. | **[DYNAMIC]** | **[VISIBLE]** |

### factionVisibleSchema

| Field       | Type                                                  | Description                      | Mutability        | Visibility    |
| :---------- | :---------------------------------------------------- | :------------------------------- | :---------------- | :------------ |
| `agenda`    | string                                                | Public agenda/reputation.        | **[STATIC]**      | **[VISIBLE]** |
| `members`   | [factionMemberSchema](#factionmemberschema) (opt)     | Publicly known members.          | **[STATIC]**      | **[VISIBLE]** |
| `influence` | string (opt)                                          | Perceived influence description. | **[SEMI-STATIC]** | **[VISIBLE]** |
| `relations` | [factionRelationSchema](#factionrelationschema) (opt) | Public alliances/rivalries.      | **[DYNAMIC]**     | **[VISIBLE]** |

### factionHiddenSchema

| Field       | Type                                                  | Description                 | Mutability        | Visibility        |
| :---------- | :---------------------------------------------------- | :-------------------------- | :---------------- | :---------------- |
| `agenda`    | string                                                | Secret agenda/corruption.   | **[STATIC]**      | **[CONDITIONAL]** |
| `members`   | [factionMemberSchema](#factionmemberschema) (opt)     | Secret members/leaders.     | **[STATIC]**      | **[CONDITIONAL]** |
| `influence` | string (opt)                                          | True influence description. | **[SEMI-STATIC]** | **[CONDITIONAL]** |
| `relations` | [factionRelationSchema](#factionrelationschema) (opt) | Secret alliances/rivalries. | **[DYNAMIC]**     | **[CONDITIONAL]** |

### factionSchema

| Field        | Type                                          | Description                                                        | Mutability    | Visibility        |
| :----------- | :-------------------------------------------- | :----------------------------------------------------------------- | :------------ | :---------------- |
| `id`         | string                                        | REQUIRED. Unique ID (e.g., 'fac:thieves', 'royal_army').           | **[STATIC]**  | **[VISIBLE]**     |
| `name`       | string                                        | Faction name.                                                      | **[STATIC]**  | **[VISIBLE]**     |
| `visible`    | [factionVisibleSchema](#factionvisibleschema) | -                                                                  | **[STATIC]**  | **[VISIBLE]**     |
| `hidden`     | [factionHiddenSchema](#factionhiddenschema)   | -                                                                  | **[STATIC]**  | **[CONDITIONAL]** |
| `unlocked`   | boolean (opt)                                 | AI DECISION: Set true when secret agenda is revealed.              | **[DYNAMIC]** | **[VISIBLE]**     |
| `highlight`  | boolean (opt)                                 | -                                                                  | **[DYNAMIC]** | **[VISIBLE]**     |
| `createdAt`  | number (opt)                                  | -                                                                  | **[STATIC]**  | **[VISIBLE]**     |
| `modifiedAt` | object (opt)                                  | Versioned timestamp {forkId, turnNumber}.                          | **[DYNAMIC]** | **[VISIBLE]**     |
| `notes`      | string (opt)                                  | Writer's notes for consistency. AI must query this before writing. | **[DYNAMIC]** | **[VISIBLE]**     |

### characterAttributeSchema

| Field      | Type                                          | Description                                       | Mutability        | Visibility    |
| :--------- | :-------------------------------------------- | :------------------------------------------------ | :---------------- | :------------ |
| Field      | Type                                          | Description                                       | Mutability        | Visibility    |
| :---       | :---                                          | :---                                              | :---              | :---          |
| `label`    | string                                        | Name of attribute (e.g. Health, Sanity, Credits). | **[STATIC]**      | **[VISIBLE]** |
| `value`    | number                                        | Current value.                                    | **[DYNAMIC]**     | **[VISIBLE]** |
| `maxValue` | number                                        | Maximum value.                                    | **[SEMI-STATIC]** | **[VISIBLE]** |
| `color`    | enum (red, blue, green, yellow, purple, gray) | Visual color hint.                                | **[STATIC]**      | **[VISIBLE]** |

### hiddenTraitSchema

| Field               | Type          | Description                                     | Mutability    | Visibility    |
| :------------------ | :------------ | :---------------------------------------------- | :------------ | :------------ |
| Field               | Type          | Description                                     | Mutability    | Visibility    |
| :---                | :---          | :---                                            | :---          | :---          |
| `id`                | string (opt)  | Format: trait:N                                 | **[STATIC]**  | **[VISIBLE]** |
| `name`              | string        | Trait name.                                     | **[STATIC]**  | **[VISIBLE]** |
| `description`       | string        | Description of the trait.                       | **[STATIC]**  | **[VISIBLE]** |
| `effects`           | string        | Effects when triggered.                         | **[STATIC]**  | **[VISIBLE]** |
| `triggerConditions` | string (opt)  | Conditions to trigger the trait.                | **[STATIC]**  | **[VISIBLE]** |
| `unlocked`          | boolean       | Set to true when the triggerConditions are met. | **[DYNAMIC]** | **[VISIBLE]** |
| `highlight`         | boolean (opt) | -                                               | **[DYNAMIC]** | **[VISIBLE]** |

### characterStatusSchema

| Field             | Type         | Description                                  | Mutability    | Visibility    |
| :---------------- | :----------- | :------------------------------------------- | :------------ | :------------ |
| `name`            | string       | Name of the protagonist.                     | **[STATIC]**  | **[VISIBLE]** |
| `title`           | string       | Starting Class/Role/Title.                   | **[STATIC]**  | **[VISIBLE]** |
| `status`          | string       | Initial condition (e.g. Healthy, Amnesiac).  | **[DYNAMIC]** | **[VISIBLE]** |
| `attributes`      | array        | Character attributes (Health, Sanity, etc.). | **[DYNAMIC]** | **[VISIBLE]** |
| `skills`          | array        | Character skills.                            | **[DYNAMIC]** | **[VISIBLE]** |
| `conditions`      | array        | Active conditions.                           | **[DYNAMIC]** | **[VISIBLE]** |
| `hiddenTraits`    | array (opt)  | Hidden personality traits.                   | **[DYNAMIC]** | **[VISIBLE]** |
| `appearance`      | string       | Detailed physical appearance.                | **[STATIC]**  | **[VISIBLE]** |
| `age`             | string       | Character's age (e.g. '25', 'Unknown').      | **[STATIC]**  | **[VISIBLE]** |
| `profession`      | string       | Character's occupation or class.             | **[STATIC]**  | **[VISIBLE]** |
| `background`      | string       | Brief life story and background.             | **[STATIC]**  | **[VISIBLE]** |
| `race`            | string       | Race AND gender (e.g. 'Human Male').         | **[STATIC]**  | **[VISIBLE]** |
| `psychology`      | object (opt) | Psychological state and core beliefs.        | **[DYNAMIC]** | **[VISIBLE]** |
| `currentLocation` | string       | Current location ID.                         | **[DYNAMIC]** | **[VISIBLE]** |
| `psychology`      | object (opt) | Trauma, coping mechanisms, contradictions.   | **[STATIC]**  | **[VISIBLE]** |
| `currentLocation` | string       | Current location name.                       | **[DYNAMIC]** | **[VISIBLE]** |

### worldSettingVisibleSchema

| Field         | Type         | Description                                                 | Mutability   | Visibility    |
| :------------ | :----------- | :---------------------------------------------------------- | :----------- | :------------ |
| `description` | string       | Common knowledge about the world.                           | **[STATIC]** | **[VISIBLE]** |
| `rules`       | string (opt) | Known rules or laws of the world (magic, physics, society). | **[STATIC]** | **[VISIBLE]** |

### worldSettingHiddenSchema

| Field         | Type         | Description                            | Mutability        | Visibility        |
| :------------ | :----------- | :------------------------------------- | :---------------- | :---------------- |
| `hiddenRules` | string (opt) | Secret rules or laws unknown to most.  | **[STATIC]**      | **[CONDITIONAL]** |
| `secrets`     | string (opt) | World-level secrets and hidden truths. | **[SEMI-STATIC]** | **[CONDITIONAL]** |

### worldSettingSchema

| Field     | Type                                                    | Description                            | Mutability   | Visibility        |
| :-------- | :------------------------------------------------------ | :------------------------------------- | :----------- | :---------------- |
| `visible` | [worldSettingVisibleSchema](#worldsettingvisibleschema) | -                                      | **[STATIC]** | **[VISIBLE]**     |
| `hidden`  | [worldSettingHiddenSchema](#worldsettinghiddenschema)   | Secret truths about the world.         | **[STATIC]** | **[CONDITIONAL]** |
| `history` | string                                                  | Ancient events that shape the present. | **[STATIC]** | **[VISIBLE]**     |

### mainGoalVisibleSchema

| Field         | Type   | Description                              | Mutability        | Visibility    |
| :------------ | :----- | :--------------------------------------- | :---------------- | :------------ |
| `description` | string | The apparent main motivation or task.    | **[STATIC]**      | **[VISIBLE]** |
| `conditions`  | string | Known conditions for achieving the goal. | **[SEMI-STATIC]** | **[VISIBLE]** |

### mainGoalHiddenSchema

| Field             | Type   | Description                                    | Mutability        | Visibility        |
| :---------------- | :----- | :--------------------------------------------- | :---------------- | :---------------- |
| `trueDescription` | string | The hidden true nature or purpose of the goal. | **[STATIC]**      | **[CONDITIONAL]** |
| `trueConditions`  | string | Secret conditions for the true goal.           | **[SEMI-STATIC]** | **[CONDITIONAL]** |

### mainGoalSchema

| Field     | Type                                            | Description        | Mutability   | Visibility        |
| :-------- | :---------------------------------------------- | :----------------- | :----------- | :---------------- |
| `visible` | [mainGoalVisibleSchema](#maingoalvisibleschema) | The apparent goal. | **[STATIC]** | **[VISIBLE]**     |
| `hidden`  | [mainGoalHiddenSchema](#maingoalhiddenschema)   | -                  | **[STATIC]** | **[CONDITIONAL]** |

### atmosphereSchema

| Field      | Type                                                                                                                                                                                                                                | Description                               | Mutability    | Visibility    |
| :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------- | :------------ | :------------ |
| `envTheme` | enum (fantasy, scifi, cyberpunk, horror, mystery, romance, royal, wuxia, demonic, ethereal, modern, gold, villain, sepia, rose, war, sunset, cold, violet, nature, artdeco, intrigue, wasteland, patriotic, cyan, silver, obsidian) | -                                         | **[DYNAMIC]** | **[VISIBLE]** |
| `ambience` | enum (cave, city, combat, desert, dungeon, forest, horror, market, mystical, ocean, quiet, rain, scifi, snow, storm, tavern)                                                                                                        | -                                         | **[DYNAMIC]** | **[VISIBLE]** |
| `weather`  | enum (none, rain, snow, fog, embers, flicker, sunny) (opt)                                                                                                                                                                          | Specific visual weather effect to render. | **[DYNAMIC]** | **[VISIBLE]** |

### storyOutlineSchema

| Field                  | Type                                            | Description                                           | Mutability    | Visibility    |
| :--------------------- | :---------------------------------------------- | :---------------------------------------------------- | :------------ | :------------ |
| `title`                | string                                          | A creative title for the adventure.                   | **[STATIC]**  | **[VISIBLE]** |
| `initialTime`          | string                                          | The starting time of the story.                       | **[STATIC]**  | **[VISIBLE]** |
| `premise`              | string                                          | The inciting incident and setting setup.              | **[STATIC]**  | **[VISIBLE]** |
| `mainGoal`             | [mainGoalSchema](#maingoalschema)               | The primary driving force of the story.               | **[STATIC]**  | **[VISIBLE]** |
| `quests`               | [questSchema](#questschema)                     | Initial quests (at least one main quest is required). | **[MIXED]**   | **[VISIBLE]** |
| `worldSetting`         | [worldSettingSchema](#worldsettingschema)       | Dual-layer world setting.                             | **[STATIC]**  | **[VISIBLE]** |
| `factions`             | [factionSchema](#factionschema)                 | Major power groups or factions.                       | **[STATIC]**  | **[VISIBLE]** |
| `locations`            | [locationSchema](#locationschema)               | Initial locations with full details.                  | **[STATIC]**  | **[VISIBLE]** |
| `knowledge`            | [knowledgeEntrySchema](#knowledgeentryschema)   | Initial knowledge entries about the world.            | **[STATIC]**  | **[VISIBLE]** |
| `timeline`             | [timelineEventSchema](#timelineeventschema)     | Initial timeline events representing the backstory.   | **[STATIC]**  | **[VISIBLE]** |
| `character`            | [characterStatusSchema](#characterstatusschema) | -                                                     | **[STATIC]**  | **[VISIBLE]** |
| `inventory`            | [inventoryItemSchema](#inventoryitemschema)     | Initial items in the inventory (1-3 items).           | **[STATIC]**  | **[VISIBLE]** |
| `npcs`                 | [npcSchema](#npcschema)                         | Initial NPCs (1-2 NPCs).                              | **[STATIC]**  | **[VISIBLE]** |
| `initialAtmosphere`    | [atmosphereSchema](#atmosphereschema)           | -                                                     | **[STATIC]**  | **[VISIBLE]** |
| `openingNarrative`     | object (opt)                                    | Opening narrative generated in Phase 10.              | **[STATIC]**  | **[VISIBLE]** |
| `relationships`        | array                                           | **[DEPRECATED]** Use `npcs` instead.                  | **[STATIC]**  | **[VISIBLE]** |
| `worldSettingUnlocked` | boolean (opt)                                   | True when worldSetting.hidden is revealed.            | **[DYNAMIC]** | **[VISIBLE]** |
| `mainGoalUnlocked`     | boolean (opt)                                   | True when mainGoal.hidden is revealed.                | **[DYNAMIC]** | **[VISIBLE]** |

### outlinePhase1Schema

| Field          | Type                                      | Description                                               | Mutability   | Visibility    |
| :------------- | :---------------------------------------- | :-------------------------------------------------------- | :----------- | :------------ |
| Field          | Type                                      | Description                                               | Mutability   | Visibility    |
| :---           | :---                                      | :---                                                      | :---         | :---          |
| `title`        | string                                    | A creative title for the adventure.                       | **[STATIC]** | **[VISIBLE]** |
| `initialTime`  | string                                    | The starting time of the story.                           | **[STATIC]** | **[VISIBLE]** |
| `premise`      | string                                    | The inciting incident and setting setup (2-3 paragraphs). | **[STATIC]** | **[VISIBLE]** |
| `worldSetting` | [worldSettingSchema](#worldsettingschema) | -                                                         | **[STATIC]** | **[VISIBLE]** |
| `mainGoal`     | [mainGoalSchema](#maingoalschema)         | The primary driving force of the story.                   | **[STATIC]** | **[VISIBLE]** |

### outlinePhase2Schema

| Field       | Type                                            | Description | Mutability   | Visibility    |
| :---------- | :---------------------------------------------- | :---------- | :----------- | :------------ |
| `character` | [characterStatusSchema](#characterstatusschema) | -           | **[STATIC]** | **[VISIBLE]** |

### outlinePhase3Schema

| Field       | Type                              | Description                                                    | Mutability   | Visibility    |
| :---------- | :-------------------------------- | :------------------------------------------------------------- | :----------- | :------------ |
| `locations` | [locationSchema](#locationschema) | 1-2 initial locations with detailed visible and hidden layers. | **[STATIC]** | **[VISIBLE]** |
| `factions`  | [factionSchema](#factionschema)   | 2-3 major power groups with visible and hidden agendas.        | **[STATIC]** | **[VISIBLE]** |

### outlinePhase4Schema

| Field       | Type                                        | Description                                                  | Mutability   | Visibility    |
| :---------- | :------------------------------------------ | :----------------------------------------------------------- | :----------- | :------------ |
| `npcs`      | [npcSchema](#npcschema)                     | -                                                            | **[STATIC]** | **[VISIBLE]** |
| `inventory` | [inventoryItemSchema](#inventoryitemschema) | 1-3 starting items with detailed lore and hidden properties. | **[STATIC]** | **[VISIBLE]** |

### outlinePhase5Schema

| Field               | Type                                          | Description                                                   | Mutability   | Visibility    |
| :------------------ | :-------------------------------------------- | :------------------------------------------------------------ | :----------- | :------------ |
| `quests`            | [questSchema](#questschema)                   | -                                                             | **[STATIC]** | **[VISIBLE]** |
| `knowledge`         | [knowledgeEntrySchema](#knowledgeentryschema) | 2-3 initial knowledge entries about the world.                | **[STATIC]** | **[VISIBLE]** |
| `timeline`          | [timelineEventSchema](#timelineeventschema)   | 3-5 backstory timeline events with visible and hidden layers. | **[STATIC]** | **[VISIBLE]** |
| `initialAtmosphere` | [atmosphereSchema](#atmosphereschema)         | -                                                             | **[STATIC]** | **[VISIBLE]** |

### summaryVisibleSchema

| Field                  | Type   | Description                                | Mutability   | Visibility    |
| :--------------------- | :----- | :----------------------------------------- | :----------- | :------------ |
| Field                  | Type   | Description                                | Mutability   | Visibility    |
| :---                   | :---   | :---                                       | :---         | :---          |
| `narrative`            | string | Narrative summary from player perspective. | **[STATIC]** | **[VISIBLE]** |
| `majorEvents`          | string | List of major events player witnessed.     | **[STATIC]** | **[VISIBLE]** |
| `characterDevelopment` | string | Character development from player's view.  | **[STATIC]** | **[VISIBLE]** |
| `worldState`           | string | World state as player understands it.      | **[STATIC]** | **[VISIBLE]** |

### summaryHiddenSchema

| Field            | Type   | Description                                        | Mutability   | Visibility        |
| :--------------- | :----- | :------------------------------------------------- | :----------- | :---------------- |
| Field            | Type   | Description                                        | Mutability   | Visibility        |
| :---             | :---   | :---                                               | :---         | :---              |
| `truthNarrative` | string | Objective truth narrative of what really happened. | **[STATIC]** | **[CONDITIONAL]** |
| `hiddenPlots`    | string | Hidden plots developing in the background.         | **[STATIC]** | **[CONDITIONAL]** |
| `npcActions`     | string | NPC actions player didn't witness.                 | **[STATIC]** | **[CONDITIONAL]** |
| `worldTruth`     | string | Real state of the world.                           | **[STATIC]** | **[CONDITIONAL]** |
| `unrevealed`     | string | Secrets not yet revealed to player.                | **[STATIC]** | **[CONDITIONAL]** |

### storySummarySchema

| Field         | Type                                          | Description                                  | Mutability   | Visibility        |
| :------------ | :-------------------------------------------- | :------------------------------------------- | :----------- | :---------------- |
| Field         | Type                                          | Description                                  | Mutability   | Visibility        |
| :---          | :---                                          | :---                                         | :---         | :---              |
| `id`          | number (opt)                                  | -                                            | **[STATIC]** | **[VISIBLE]**     |
| `displayText` | string                                        | Concise 2-3 sentence summary for UI display. | **[STATIC]** | **[VISIBLE]**     |
| `visible`     | [summaryVisibleSchema](#summaryvisibleschema) | -                                            | **[STATIC]** | **[VISIBLE]**     |
| `hidden`      | [summaryHiddenSchema](#summaryhiddenschema)   | -                                            | **[STATIC]** | **[CONDITIONAL]** |
| `timeRange`   | string                                        | -                                            | **[STATIC]** | **[VISIBLE]**     |
| `from`        | string                                        | -                                            | **[STATIC]** | **[VISIBLE]**     |
| `to`          | string                                        | -                                            | **[STATIC]** | **[VISIBLE]**     |

### gameResponseSchema

| Field                | Type                                                      | Description                                                  | Mutability        | Visibility        |
| :------------------- | :-------------------------------------------------------- | :----------------------------------------------------------- | :---------------- | :---------------- |
| `narrative`          | string                                                    | The current story segment text.                              | **[STATIC]**      | **[VISIBLE]**     |
| `choices`            | array                                                     | Current action options for the player.                       | **[STATIC]**      | **[VISIBLE]**     |
| `imagePrompt`        | string (opt)                                              | Visual scene prompt for image generation.                    | **[STATIC]**      | **[VISIBLE]**     |
| `atmosphere`         | object (opt)                                              | Current atmosphere settings override.                        | **[STATIC]**      | **[VISIBLE]**     |
| `inventoryUpdate`    | array (opt)                                               | Modified items.                                              | **[DYNAMIC]**     | **[VISIBLE]**     |
| `npcUpdate`          | array (opt)                                               | Modified NPCs.                                               | **[DYNAMIC]**     | **[VISIBLE]**     |
| `locationUpdate`     | array (opt)                                               | Modified locations.                                          | **[DYNAMIC]**     | **[VISIBLE]**     |
| `questUpdate`        | array (opt)                                               | Modified quests.                                             | **[DYNAMIC]**     | **[VISIBLE]**     |
| `knowledgeUpdate`    | array (opt)                                               | Modified knowledge entries.                                  | **[DYNAMIC]**     | **[VISIBLE]**     |
| `factionUpdate`      | array (opt)                                               | Modified factions.                                           | **[DYNAMIC]**     | **[VISIBLE]**     |
| `timelineUpdate`     | array (opt)                                               | Modified timeline events.                                    | **[DYNAMIC]**     | **[VISIBLE]**     |
| `characterUpdate`    | object (opt)                                              | Modified character status profile.                           | **[DYNAMIC]**     | **[VISIBLE]**     |
| `causalUpdate`       | array (opt)                                               | Modified causal chains.                                      | **[DYNAMIC]**     | **[VISIBLE]**     |
| `summaryUpdate`      | object (opt)                                              | Modified story summary.                                      | **[DYNAMIC]**     | **[VISIBLE]**     |
| `timeUpdate`         | string (opt)                                              | Modified current game time string.                           | **[DYNAMIC]**     | **[VISIBLE]**     |
| `idUpdates`          | object (opt)                                              | Unified ID mapping for new entities (e.g. {tempId: realId}). | **[STATIC]**      | **[VISIBLE]**     |
| `relationshipUpdate` | array (opt)                                               | **[DEPRECATED]** Use `npcUpdate` instead.                    | **[DYNAMIC]**     | **[VISIBLE]**     |
| `unlocked`           | boolean (opt)                                             | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `locationActions`    | array                                                     | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `type`               | enum (current, known)                                     | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `action`             | enum (update, add)                                        | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `id`                 | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `name`               | string                                                    | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `visible`            | [locationVisibleSchema](#locationvisibleschema) (opt)     | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `hidden`             | [locationHiddenSchema](#locationhiddenschema) (opt)       | -                                                            | **[STATIC]**      | **[CONDITIONAL]** |
| `lore`               | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `environment`        | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `notes`              | string (opt)                                              | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `unlocked`           | boolean (opt)                                             | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `questActions`       | array                                                     | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `action`             | enum (add, update, complete, fail)                        | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `id`                 | string                                                    | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `title`              | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `type`               | [questTypeSchema](#questtypeschema) (opt)                 | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `visible`            | [questVisibleSchema](#questvisibleschema) (opt)           | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `hidden`             | [questHiddenSchema](#questhiddenschema) (opt)             | -                                                            | **[STATIC]**      | **[CONDITIONAL]** |
| `unlocked`           | boolean (opt)                                             | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `knowledgeActions`   | array                                                     | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `action`             | enum (add, update)                                        | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `id`                 | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `title`              | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `category`           | [knowledgeCategorySchema](#knowledgecategoryschema) (opt) | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `visible`            | [knowledgeVisibleSchema](#knowledgevisibleschema) (opt)   | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `hidden`             | [knowledgeHiddenSchema](#knowledgehiddenschema) (opt)     | -                                                            | **[STATIC]**      | **[CONDITIONAL]** |
| `discoveredAt`       | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `relatedTo`          | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `unlocked`           | boolean (opt)                                             | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `factionActions`     | array                                                     | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `action`             | enum (update)                                             | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `id`                 | string                                                    | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `name`               | string                                                    | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `visible`            | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `hidden`             | string (opt)                                              | -                                                            | **[STATIC]**      | **[CONDITIONAL]** |
| `characterUpdates`   | object                                                    | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `attributes`         | array                                                     | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `action`             | enum (add, update, remove)                                | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `name`               | string                                                    | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `value`              | number (opt)                                              | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `maxValue`           | number (opt)                                              | -                                                            | **[SEMI-STATIC]** | **[VISIBLE]**     |
| `color`              | [attributeColorSchema](#attributecolorschema) (opt)       | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `skills`             | array                                                     | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `action`             | enum (add, update, remove)                                | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `name`               | string                                                    | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `level`              | string (opt)                                              | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `visible`            | [skillVisibleSchema](#skillvisibleschema) (opt)           | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `hidden`             | [skillHiddenSchema](#skillhiddenschema) (opt)             | -                                                            | **[STATIC]**      | **[CONDITIONAL]** |
| `category`           | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `unlocked`           | boolean (opt)                                             | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `conditions`         | array                                                     | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `action`             | enum (add, update, remove)                                | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `id`                 | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `name`               | string                                                    | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `type`               | [conditionTypeSchema](#conditiontypeschema) (opt)         | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `visible`            | [conditionVisibleSchema](#conditionvisibleschema) (opt)   | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `hidden`             | [conditionHiddenSchema](#conditionhiddenschema) (opt)     | -                                                            | **[STATIC]**      | **[CONDITIONAL]** |
| `effects`            | [conditionEffectsSchema](#conditioneffectsschema) (opt)   | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `duration`           | number (opt)                                              | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `unlocked`           | boolean (opt)                                             | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `hiddenTraits`       | array                                                     | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `action`             | enum (add, update, remove)                                | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `id`                 | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `name`               | string                                                    | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `description`        | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `effects`            | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `triggerConditions`  | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `unlocked`           | boolean (opt)                                             | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `profile`            | object (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `status`             | string (opt)                                              | -                                                            | **[DYNAMIC]**     | **[VISIBLE]**     |
| `appearance`         | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `profession`         | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `background`         | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |
| `race`               | string (opt)                                              | -                                                            | **[STATIC]**      | **[VISIBLE]**     |

### finishTurnSchema

| Field           | Type                                                                           | Description                                            | Mutability    | Visibility      |
| :-------------- | :----------------------------------------------------------------------------- | :----------------------------------------------------- | :------------ | :-------------- |
| `logic`         | string                                                                         | GM internal reasoning for turn resolution.             | **[STATIC]**  | **[VISIBLE]**   |
| `consequence`   | string                                                                         | Immediate narrative consequence.                       | **[STATIC]**  | **[VISIBLE]**   |
| `actions`       | array (opt)                                                                    | **[DEPRECATED]** Use `npcActions` instead.             | **[DYNAMIC]** | **[VISIBLE]**   |
| `npcActions`    | array (opt)                                                                    | List of NPC actions triggered in this turn.            | **[DYNAMIC]** | **[VISIBLE]**   |
| `aliveEntities` | object (opt)                                                                   | Entity IDs (npcs, items, etc.) relevant for next turn. | **[DYNAMIC]** | **[INVISIBLE]** |
| `ending`        | enum (continue, death, victory, true_ending, bad_ending, neutral_ending) (opt) | Story continuation status.                             | **[DYNAMIC]** | **[VISIBLE]**   |
| `forceEnd`      | boolean (opt)                                                                  | If true, game ends permanently.                        | **[DYNAMIC]** | **[VISIBLE]**   |
| `ragQueries`    | string[] (opt)                                                                 | Semantic search queries for next turn context.         | **[DYNAMIC]** | **[INVISIBLE]** |

### translationSchema

| Field        | Type           | Description | Mutability   | Visibility    |
| :----------- | :------------- | :---------- | :----------- | :------------ |
| Field        | Type           | Description | Mutability   | Visibility    |
| :---         | :---           | :---        | :---         | :---          |
| `segments`   | array          | -           | **[STATIC]** | **[VISIBLE]** |
| `id`         | string         | -           | **[STATIC]** | **[VISIBLE]** |
| `text`       | string         | -           | **[STATIC]** | **[VISIBLE]** |
| `choices`    | string[]       | -           | **[STATIC]** | **[VISIBLE]** |
| `inventory`  | string[] (opt) | -           | **[STATIC]** | **[VISIBLE]** |
| `character`  | object (opt)   | -           | **[STATIC]** | **[VISIBLE]** |
| `name`       | string (opt)   | -           | **[STATIC]** | **[VISIBLE]** |
| `title`      | string (opt)   | -           | **[STATIC]** | **[VISIBLE]** |
| `appearance` | string (opt)   | -           | **[STATIC]** | **[VISIBLE]** |
| `profession` | string (opt)   | -           | **[STATIC]** | **[VISIBLE]** |
| `background` | string (opt)   | -           | **[STATIC]** | **[VISIBLE]** |
| `race`       | string (opt)   | -           | **[STATIC]** | **[VISIBLE]** |
