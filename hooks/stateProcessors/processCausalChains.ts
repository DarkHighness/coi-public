import { CausalChain, TimelineEvent } from "../../types";

export function processCausalChains(
  currentChains: CausalChain[],
  currentTimeline: TimelineEvent[],
  currentTimeString: string,
): { causalChains: CausalChain[]; timeline: TimelineEvent[] } {
  let newTimeline = [...currentTimeline];

  const newCausalChains = currentChains.map((chain) => {
    if (chain.status !== "active" || !chain.pendingConsequences) {
      return chain;
    }

    const remainingConsequences: typeof chain.pendingConsequences = [];
    const triggeredEvents: TimelineEvent[] = [];

    chain.pendingConsequences.forEach((consequence) => {
      const newDelay = consequence.delayTurns - 1;

      if (newDelay <= 0) {
        // Check probability
        if (Math.random() <= consequence.probability) {
          // Trigger Event
          const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newEvent: TimelineEvent = {
            id: eventId,
            gameTime: currentTimeString,
            category: "consequence",
            visible: {
              description: consequence.description,
              causedBy: chain.rootCause.description,
            },
            hidden: {
              trueDescription: consequence.description,
              trueCausedBy: chain.rootCause.description,
            },
            involvedEntities: [],
            chainId: chain.chainId,
          };
          triggeredEvents.push(newEvent);
          newTimeline.push(newEvent);
        }
        // If probability fails, it expires
      } else {
        remainingConsequences.push({
          ...consequence,
          delayTurns: newDelay,
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
