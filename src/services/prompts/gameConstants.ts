/**
 * Game Balance Constants
 * Central source of truth for all magic numbers in prompts.
 */

export const GAME_CONSTANTS = {
  // Turn Pacing
  EARLY_GAME_TURN_END: 50,
  MID_GAME_TURN_END: 150,

  // Death & Difficulty
  DEATH_PREVENTION_TURNS: 10, // No death allowed in first N turns
  CRITICAL_DEATH_WARNINGS: 3, // Min warnings before death allowed

  // Crisis Management
  CRISIS_COOLDOWN_TURNS: 50, // Min turns between same crisis type
  FATAL_CRISIS_RATE: 20, // % of crises that should be fatal/life-threatening
  NON_FATAL_CRISIS_RATE: 80, // % of crises that should be structural/social

  // Narrative Style
  MAX_YOU_START_RATE: 30, // Max % of sentences starting with "You"
};
