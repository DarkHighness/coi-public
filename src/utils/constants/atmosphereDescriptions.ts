/**
 * Descriptions for atmosphere enums to help AI select the most appropriate options.
 *
 * IMPORTANT:
 * Keep this as a lightweight facade over JSON so the same source can be seeded
 * into VFS reference files without bloating prompts.
 */

import atmosphereDescriptionsData from "@/resources/atmosphere_descriptions.json";

export const ATMOSPHERE_DESCRIPTIONS =
  atmosphereDescriptionsData as typeof atmosphereDescriptionsData;
