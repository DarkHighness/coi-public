import { CausalChain, TimelineEvent } from "../../types";

export function processCausalChains(
  currentChains: CausalChain[],
  currentTimeline: TimelineEvent[],
  currentTimeString: string
): { causalChains: CausalChain[]; timeline: TimelineEvent[] } {
  let newTimeline = [...currentTimeline];

  const newCausalChains = currentChains.map((chain) => {
    if (chain.status !== "active" || !chain.pendingConsequences) {
      return chain;
    }

    const remainingConsequences: typeof chain.pendingConsequences = [];
    const triggeredEvents: TimelineEvent[] = [];

    chain.pendingConsequences.forEach((consequence) => {
      // Since we moved to string-based time, we can't easily calculate delayMinutes.
      // For now, we will rely on probability check every turn.
      // If we want to support delays, we need AI to output "time passed" or manage it differently.
      // Assuming "1 turn" as the unit for now if delayMinutes was used.

      const newDelay = consequence.delayMinutes - 1; // Decrement by 1 turn roughly

      if (newDelay <= 0) {
        // Check probability
        if (Math.random() <= consequence.probability) {
          // Trigger Event
          const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newEvent: TimelineEvent = {
            id: eventId,
            gameTime: currentTimeString,
            description: consequence.description,
            category: "consequence",
            causedBy: chain.rootCause.eventId,
            involvedEntities: [],
          };
          triggeredEvents.push(newEvent);
          newTimeline.push(newEvent);
        }
        // If probability fails, it just expires or we could keep it?
        // Original logic: if probability fails, it expires (implied by not adding to remainingConsequences)
      } else {
        remainingConsequences.push({
          ...consequence,
          delayMinutes: newDelay,
        });
      }
    });

    if (triggeredEvents.length > 0) {
      return {
        ...chain,
        events: [...chain.events, ...triggeredEvents],
        pendingConsequences: remainingConsequences,
      };
    }

    return {
      ...chain,
      pendingConsequences: remainingConsequences,
    };
  });

  return { causalChains: newCausalChains, timeline: newTimeline };
}
