import { TimelineEvent, GameResponse } from "../../types";

/**
 * Process world events and add them to the timeline
 */
export function processWorldEvents(
  currentTimeline: TimelineEvent[],
  worldEvents: GameResponse['worldEvents'],
  currentTimeString: string
): TimelineEvent[] {
  if (!worldEvents || worldEvents.length === 0) {
    return currentTimeline;
  }

  const newTimeline = [...currentTimeline];

  worldEvents.forEach((event) => {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    newTimeline.push({
      id: eventId,
      gameTime: currentTimeString,
      description: event.description,
      category: event.category,
      involvedEntities: event.involvedEntities,
      consequences: []
    });
  });

  return newTimeline;
}
