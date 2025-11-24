import { TimelineEvent, GameResponse, CausalChain } from "../../types";

/**
 * Process timeline events and add them to the timeline and causal chains
 */
export function processWorldEvents(
  currentTimeline: TimelineEvent[],
  currentChains: CausalChain[],
  timelineEvents: GameResponse["timelineEvents"],
  currentTimeString: string,
): { timeline: TimelineEvent[]; causalChains: CausalChain[] } {
  if (!timelineEvents || timelineEvents.length === 0) {
    return { timeline: currentTimeline, causalChains: currentChains };
  }

  const newTimeline = [...currentTimeline];
  let newChains = [...currentChains];

  timelineEvents.forEach((event) => {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create the event
    const newEvent: TimelineEvent = {
      id: eventId,
      gameTime: currentTimeString,
      category: event.category,
      visible: {
        description: event.visible.description,
        causedBy: event.visible.causedBy,
      },
      hidden: {
        trueDescription: event.hidden.trueDescription,
        trueCausedBy: event.hidden.trueCausedBy,
        consequences: event.hidden.consequences || [],
      },
      involvedEntities: event.involvedEntities,
      chainId: event.chainId,
    };
    newTimeline.push(newEvent);

    // Handle New Chain Creation
    if (event.newChain) {
      const newChainId = `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      // Update the event to link to this new chain
      newEvent.chainId = newChainId;

      const newChain: CausalChain = {
        chainId: newChainId,
        rootCause: {
          eventId: eventId,
          description: event.newChain.description,
        },
        events: [newEvent],
        status: "active",
        pendingConsequences: [],
      };
      newChains.push(newChain);
    } else if (event.chainId) {
      // Add to existing chain
      newChains = newChains.map((c) => {
        if (c.chainId === event.chainId) {
          return {
            ...c,
            events: [...c.events, newEvent],
          };
        }
        return c;
      });
    }

    // Handle Projected Consequences (Adding to chain)
    if (event.projectedConsequences && event.projectedConsequences.length > 0) {
      const targetChainId = newEvent.chainId;
      if (targetChainId) {
        newChains = newChains.map((c) => {
          if (c.chainId === targetChainId) {
            return {
              ...c,
              pendingConsequences: [
                ...(c.pendingConsequences || []),
                ...event.projectedConsequences!.map((pc) => ({
                  description: pc.description,
                  delayTurns: pc.delayTurns,
                  probability: pc.probability,
                })),
              ],
            };
          }
          return c;
        });
      }
    }
  });

  return { timeline: newTimeline, causalChains: newChains };
}
