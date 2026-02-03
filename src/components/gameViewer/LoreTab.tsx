/**
 * LoreTab - Knowledge, timeline, and inventory display
 * Shows discovered knowledge, timeline events, and inventory items
 */

import React from "react";
import { GameState } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { Section, EmptyState, HiddenContent } from "./helpers";

interface LoreTabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: (key: string, options?: any) => string;
}

export const LoreTab: React.FC<LoreTabProps> = ({
  gameState,
  expandedSections,
  toggleSection,
  t,
}) => {
  return (
    <div className="space-y-4">
      {/* Knowledge */}
      <Section
        id="knowledge"
        title={t("gameViewer.knowledge")}
        icon="📚"
        isExpanded={expandedSections.has("knowledge")}
        onToggle={toggleSection}
      >
        {gameState.knowledge.length === 0 ? (
          <EmptyState message={t("gameViewer.noKnowledge")} />
        ) : (
          <div className="space-y-3">
            {gameState.knowledge.map((entry, idx) => (
              <div
                key={entry.id || idx}
                className="p-4 bg-theme-bg rounded-none border border-theme-border/40"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-theme-primary text-sm flex items-center gap-2">
                    <span>{getValidIcon(entry.icon, "📚")}</span>
                    {entry.title}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-theme-surface rounded text-theme-muted border border-theme-border/50 uppercase tracking-wider">
                    {t(`knowledge.category.${entry.category}`)}
                  </span>
                </div>
                <div className="story-text text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50 leading-relaxed">
                  <MarkdownText content={entry.visible.description} />
                </div>
                {(entry.unlocked || gameState.unlockMode) && entry.hidden && (
                  <HiddenContent
                    t={t}
                    content={
                      <div className="space-y-2">
                        {entry.hidden.fullTruth && (
                          <MarkdownText content={entry.hidden.fullTruth} />
                        )}
                        {entry.hidden.misconceptions &&
                          entry.hidden.misconceptions.length > 0 && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.misconceptions")}:
                              </span>
                              <ul className="list-disc list-inside pl-2">
                                {entry.hidden.misconceptions.map((misc, i) => (
                                  <li key={i}>
                                    <MarkdownText content={misc} inline />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    }
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Timeline Events */}
      <Section
        id="timeline"
        title={t("gameViewer.timeline")}
        icon="⏳"
        isExpanded={expandedSections.has("timeline")}
        onToggle={toggleSection}
      >
        {gameState.timeline.filter((e) => e.known).length === 0 ? (
          <EmptyState message={t("gameViewer.noEvents")} />
        ) : (
          <div className="space-y-3">
            {gameState.timeline
              .filter((e) => e.known)
              .sort(
                (a, b) =>
                  new Date(b.gameTime).getTime() -
                  new Date(a.gameTime).getTime(),
              )
              .slice(0, 20) // Show last 20 known events
              .map((event, idx) => (
                <div
                  key={event.id || idx}
                  className="p-4 bg-theme-bg rounded-none border border-theme-border/40"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-theme-muted font-mono">
                      {event.gameTime}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-theme-surface rounded text-theme-muted flex items-center gap-1 border border-theme-border/50 uppercase tracking-wider">
                      <span>{getValidIcon(event.icon, "⏳")}</span>
                      {t(`timeline.categories.${event.category}`, {
                        defaultValue: event.category,
                      })}
                    </span>
                  </div>
                  <div className="story-text text-theme-text text-sm pl-2 border-l-2 border-theme-border/50 leading-relaxed">
                    <MarkdownText content={event.visible.description} />
                  </div>
                </div>
              ))}
          </div>
        )}
      </Section>

      {/* Inventory */}
      <Section
        id="inventory"
        title={t("gameViewer.inventory")}
        icon="🎒"
        isExpanded={expandedSections.has("inventory")}
        onToggle={toggleSection}
      >
        {gameState.inventory.length === 0 ? (
          <EmptyState message={t("gameViewer.noItems")} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gameState.inventory.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3 bg-theme-bg rounded-none border border-theme-border/40 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {getValidIcon(item.icon, "📦")}
                  </span>
                  <div className="font-bold text-theme-text text-sm truncate">
                    {item.name}
                  </div>
                </div>
                <div className="text-theme-muted text-xs pl-1">
                  <MarkdownText content={item.visible.description} />
                </div>

                {/* Sensory Details */}
                {item.visible?.sensory && (
                  <div className="text-xs mt-1 pl-1 border-l-2 border-theme-border/30">
                    {item.visible.sensory.texture && (
                      <div className="flex gap-1">
                        <span className="text-theme-primary/70">
                          {t("gameViewer.texture")}:
                        </span>
                        <span className="text-theme-muted">
                          {item.visible.sensory.texture}
                        </span>
                      </div>
                    )}
                    {item.visible.sensory.weight && (
                      <div className="flex gap-1">
                        <span className="text-theme-primary/70">
                          {t("gameViewer.weight")}:
                        </span>
                        <span className="text-theme-muted">
                          {item.visible.sensory.weight}
                        </span>
                      </div>
                    )}
                    {item.visible.sensory.smell && (
                      <div className="flex gap-1">
                        <span className="text-theme-primary/70">
                          {t("gameViewer.smell")}:
                        </span>
                        <span className="text-theme-muted">
                          {item.visible.sensory.smell}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {item.visible?.condition && (
                  <div className="text-xs mt-1 pl-1">
                    <span className="text-theme-primary/70">
                      {t("gameViewer.condition")}:{" "}
                    </span>
                    <span className="text-theme-muted">
                      {item.visible.condition}
                    </span>
                  </div>
                )}
                {item.visible?.usage && (
                  <div className="text-xs">
                    <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                      {t("gameViewer.usage") || "Usage"}:
                    </span>
                    <div className="text-theme-muted pl-1">
                      <MarkdownText content={item.visible.usage} />
                    </div>
                  </div>
                )}
                {item.lore && (
                  <div className="text-xs border-t border-theme-border/30 pt-2 mt-1">
                    <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                      {t("gameViewer.lore") || "Lore"}:
                    </span>
                    <div className="text-theme-muted pl-1 italic">
                      <MarkdownText content={item.lore} />
                    </div>
                  </div>
                )}
                {(item.unlocked || gameState.unlockMode) && item.hidden && (
                  <HiddenContent
                    t={t}
                    content={
                      <div className="space-y-1 text-xs">
                        {item.hidden.truth && (
                          <MarkdownText content={item.hidden.truth} />
                        )}
                        {item.hidden.secrets &&
                          item.hidden.secrets.length > 0 && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.secrets")}:
                              </span>
                              <ul className="list-disc list-inside pl-2">
                                {item.hidden.secrets.map((secret, i) => (
                                  <li key={i}>
                                    <MarkdownText content={secret} inline />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    }
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};
