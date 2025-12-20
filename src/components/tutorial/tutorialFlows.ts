import type { TFunction } from "i18next";
import { TutorialFlow, TutorialStep } from "../../contexts/TutorialContext";

/**
 * StartScreen Tutorial Flow
 * Guides users through initial setup: provider config, model selection, and theme choice
 * Simplified to essential steps for better UX
 */
export const createStartScreenTutorialFlow = (
  t: TFunction,
  callbacks: {
    openSettings: () => void;
    hasValidProvider: () => boolean;
    hasValidModel: () => boolean;
  },
): TutorialFlow => ({
  id: "startScreen",
  name: t("tutorial.startScreen.title", "Welcome to Chronicles of Infinity"),
  steps: [
    // Step 1: Welcome
    {
      id: "welcome",
      title: t("tutorial.startScreen.welcome.title", "Welcome!"),
      content: t(
        "tutorial.startScreen.welcome.content",
        "Welcome to Chronicles of Infinity! This quick guide will help you set up AI providers and start your adventure.",
      ),
      icon: "👋",
      canSkip: true,
      position: "center",
    },
    // Step 2: Open Settings
    {
      id: "open-settings",
      targetId: "settings-button",
      title: t("tutorial.startScreen.openSettings.title", "Open Settings"),
      content: t(
        "tutorial.startScreen.openSettings.content",
        "Click the settings icon to configure your AI provider.",
      ),
      icon: "⚙️",
      canSkip: true,
      position: "left",
    },
    // Step 3: Add Provider - Click button
    {
      id: "add-provider",
      targetId: "add-provider-button",
      title: t("tutorial.startScreen.addProvider.title", "Add AI Provider"),
      content: t(
        "tutorial.startScreen.addProvider.content",
        "Click 'Add Provider' to open the setup dialog.",
      ),
      icon: "➕",
      canSkip: true,
      position: "bottom",
    },
    // Step 4: Complete Provider Modal
    {
      id: "complete-provider-modal",
      targetId: "provider-template-modal",
      title: t(
        "tutorial.startScreen.completeProvider.title",
        "Configure Provider",
      ),
      content: t(
        "tutorial.startScreen.completeProvider.content",
        "Select a provider (e.g., Google Gemini), enter your API key, and click 'Add'. Then click Next.",
      ),
      icon: "🔑",
      canSkip: true,
      position: "right",
    },
    // Step 5: Go to Models Tab (click button)
    {
      id: "models-tab",
      targetId: "models-tab-button",
      title: t("tutorial.startScreen.modelsTab.title", "Select Models"),
      content: t(
        "tutorial.startScreen.modelsTab.content",
        "Click the 'Models' tab to configure your story model.",
      ),
      icon: "🤖",
      canSkip: true,
      position: "bottom",
    },
    // Step 6: Select Model (in modal content)
    {
      id: "select-model",
      targetId: "settings-modal-content",
      title: t("tutorial.startScreen.selectModel.title", "Choose Story Model"),
      content: t(
        "tutorial.startScreen.selectModel.content",
        "Select a Story Model from the dropdown (e.g., gemini-2.0-flash). Then click Next.",
      ),
      icon: "📚",
      canSkip: true,
      position: "left",
    },
    // Step 7: Close Settings
    {
      id: "close-settings",
      targetId: "settings-close-button",
      title: t("tutorial.startScreen.closeSettings.title", "Setup Complete!"),
      content: t(
        "tutorial.startScreen.closeSettings.content",
        "Close settings to start your adventure!",
      ),
      icon: "✅",
      canSkip: true,
      position: "left",
    },
    // Step 6: Choose Theme
    {
      id: "choose-theme",
      targetId: "start-adventure-button",
      title: t(
        "tutorial.startScreen.chooseTheme.title",
        "Start Your Adventure",
      ),
      content: t(
        "tutorial.startScreen.chooseTheme.content",
        "Choose a theme to begin your story! Each theme offers a unique world to explore.",
      ),
      icon: "🎭",
      canSkip: true,
      position: "left",
    },
  ],
});

/**
 * GamePage Tutorial Flow
 * Guides users through the game interface
 */
export const createGamePageTutorialFlow = (t: TFunction): TutorialFlow => ({
  id: "gamePage",
  name: t("tutorial.gamePage.title", "Your Adventure Awaits"),
  steps: [
    // Step 1: Story Feed
    {
      id: "story-feed",
      targetId: "story-feed-area",
      title: t("tutorial.gamePage.storyFeed.title", "Story Feed"),
      content: t(
        "tutorial.gamePage.storyFeed.content",
        "Your narrative unfolds here. Each segment contains AI-generated story and choices.",
      ),
      icon: "📖",
      canSkip: true,
      position: "right",
    },
    // Step 2: Character & World
    {
      id: "sidebar",
      targetId: "left-sidebar",
      title: t("tutorial.gamePage.sidebar.title", "Character & World"),
      content: t(
        "tutorial.gamePage.sidebar.content",
        "The left sidebar shows your inventory, relationships, quests, and world knowledge.",
      ),
      icon: "🌍",
      canSkip: true,
      position: "right",
    },
    // Step 3: Timeline
    {
      id: "timeline",
      targetId: "right-timeline",
      title: t("tutorial.gamePage.timeline.title", "Timeline"),
      content: t(
        "tutorial.gamePage.timeline.content",
        "The right panel tracks your journey's history and important events.",
      ),
      icon: "⏳",
      canSkip: true,
      position: "left",
    },
    // Step 4: Take Action
    {
      id: "action-input",
      targetId: "action-input-area",
      title: t("tutorial.gamePage.actionInput.title", "Take Action"),
      content: t(
        "tutorial.gamePage.actionInput.content",
        "Choose from suggested actions or type your own commands. Be creative!",
      ),
      icon: "🎯",
      canSkip: true,
      position: "top",
    },
    // Step 5: Menu
    {
      id: "menu",
      targetId: "game-menu-button",
      title: t("tutorial.gamePage.menu.title", "Game Menu"),
      content: t(
        "tutorial.gamePage.menu.content",
        "Access settings, save management, and other options through the menu.",
      ),
      icon: "📋",
      canSkip: true,
      position: "bottom",
    },
  ],
});
