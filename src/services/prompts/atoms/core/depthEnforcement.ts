/**
 * ============================================================================
 * Core Atom: Depth Enforcement
 * ============================================================================
 *
 * 深度强制规则，确保内容不浮于表面。
 */

import type { Atom } from "../types";

/**
 * 深度强制规则 - 无参数
 */
export const depthEnforcement: Atom<void> = () => `
<depth_enforcement>
  <instruction>**NO SURFACE SUMMARY**: write scenes, not recaps.</instruction>
  <instruction>**STATE MUST MOVE**: every turn changes something concrete (gained/lost/learned/moved/broken).</instruction>
  <instruction>**PRESSURE NOW**: include at least one immediate constraint (time, eyes, pain, scarcity, law, leverage).</instruction>
  <instruction>**COST**: success and failure both cost something (time/money/blood/reputation/position/relationship).</instruction>
  <instruction>**ROOTED DETAIL**: any claim must be anchored by an observable detail (who/what/where/how).</instruction>
  <instruction>Every entity needs a reason to exist: desire + leverage + vulnerability. And a past—everything "became".</instruction>
</depth_enforcement>
`;

export default depthEnforcement;
