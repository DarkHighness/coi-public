export const createValidGlobal = () => ({
  time: "Day 1",
  theme: "fantasy",
  currentLocation: "loc:1",
  atmosphere: {
    envTheme: "fantasy",
    ambience: "forest",
    weather: "clear",
  },
  turnNumber: 1,
  forkId: 0,
});

export const createSummaryPayload = () => ({
  displayText: "A short recap.",
  visible: {
    narrative: "Visible recap",
    majorEvents: ["event-1"],
    characterDevelopment: "Growth",
    worldState: "Stable",
  },
  hidden: {
    truthNarrative: "Hidden recap",
    hiddenPlots: ["plot-1"],
    npcActions: ["npc-1"],
    worldTruth: "Truth",
    unrevealed: ["secret-1"],
  },
});
