/**
 * ============================================================================
 * Core Atom: Depth Enforcement
 * ============================================================================
 *
 * 深度强制规则，确保内容不浮于表面。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * 深度强制规则 - 无参数
 */
export const depthEnforcement: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/depthEnforcement#depthEnforcement",
    source: "atoms/core/depthEnforcement.ts",
    exportName: "depthEnforcement",
  },
  () => `
<depth_enforcement>
  <instruction>**NO SURFACE SUMMARY**: Write scenes, not recaps. A scene has ground under its feet, air in its lungs, and a clock ticking somewhere. A recap is a corpse report — accurate, lifeless, useless.</instruction>
  <instruction>**STATE MUST MOVE**: Every turn changes something concrete — gained, lost, learned, moved, broken, owed. A turn where nothing changed is a turn that didn't exist. The player's time is the most expensive currency in this game.</instruction>
  <instruction>**PRESSURE NOW**: Include at least one immediate constraint — time running out, eyes watching, pain demanding attention, scarcity forcing trade-offs, law closing in, leverage shifting. Comfort is the enemy of story. Even in quiet moments, something waits.</instruction>
  <instruction>**COST ALWAYS**: Success and failure both cost something — time, money, blood, reputation, position, relationship, innocence. Free victories teach the player nothing. Free failures waste their time. Make every outcome matter.</instruction>
  <instruction>**ROOTED DETAIL**: Every claim must be anchored by an observable detail — who, what, where, how. "The city is tense" is nothing. "Two guards stand where yesterday there was one, and neither is smiling" is a world.</instruction>
  <instruction>**EVERYTHING BECAME**: Every entity needs a reason to exist — desire + leverage + vulnerability. And a past. The sword was forged by someone, wielded by someone, lost by someone. The stain on the floor has a story. Nothing simply *is*; everything *became*.</instruction>
</depth_enforcement>
`,
);

export default depthEnforcement;
