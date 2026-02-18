/**
 * LoreTab - Knowledge, timeline, and inventory display
 * Shows discovered knowledge, timeline events, and inventory items
 */

import React from "react";
import type { TFunction } from "i18next";
import { GameState } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { Section, EmptyState, HiddenContent, InfoRow } from "./helpers";

interface LoreTabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: TFunction;
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
                {entry.visible.details && (
                  <div className="mt-2 text-theme-text/80 text-sm pl-2 border-l-2 border-theme-border/30">
                    <MarkdownText content={entry.visible.details} />
                  </div>
                )}
                {Array.isArray(entry.relatedTo) && entry.relatedTo.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                      {t("gameViewer.relatedEntities", {
                        defaultValue: "Related Entities",
                      })}
                      :
                    </span>
                    <ul className="list-disc list-inside pl-2 text-sm text-theme-muted">
                      {entry.relatedTo.map((target, i) => (
                        <li key={`${target}-${i}`}>{target}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {entry.discoveredAt && (
                  <InfoRow
                    label={t("gameViewer.discoveredAt", {
                      defaultValue: "Discovered",
                    })}
                    value={entry.discoveredAt}
                  />
                )}
                {(entry.unlocked || gameState.unlockMode) && entry.hidden && (
                  <HiddenContent
                    t={t}
                    content={
                      <div className="space-y-2">
                        {entry.unlockReason && (
                          <InfoRow
                            label={t("gameViewer.unlockReason", {
                              defaultValue: "Unlock Reason",
                            })}
                            value={entry.unlockReason}
                          />
                        )}
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
                        {entry.hidden.toBeRevealed &&
                          entry.hidden.toBeRevealed.length > 0 && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.toBeRevealed", {
                                  defaultValue: "To Be Revealed",
                                })}
                                :
                              </span>
                              <ul className="list-disc list-inside pl-2">
                                {entry.hidden.toBeRevealed.map((info, i) => (
                                  <li key={i}>
                                    <MarkdownText content={info} inline />
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
        {gameState.timeline.filter(
          (e) =>
            gameState.unlockMode ||
            !Array.isArray(e.knownBy) ||
            e.knownBy.includes(gameState.playerActorId || "char:player"),
        ).length === 0 ? (
          <EmptyState message={t("gameViewer.noEvents")} />
        ) : (
          <div className="space-y-3">
            {gameState.timeline
              .filter(
                (e) =>
                  gameState.unlockMode ||
                  !Array.isArray(e.knownBy) ||
                  e.knownBy.includes(gameState.playerActorId || "char:player"),
              )
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
                    <div className="flex flex-col">
                      <span className="text-xs text-theme-muted font-mono">
                        {event.gameTime}
                      </span>
                      <span className="text-sm text-theme-primary font-semibold">
                        {event.name}
                      </span>
                    </div>
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
                  {event.visible.causedBy && (
                    <InfoRow
                      label={t("gameViewer.causedBy", {
                        defaultValue: "Caused By",
                      })}
                      value={event.visible.causedBy}
                    />
                  )}
                  {Array.isArray(event.involvedEntities) &&
                    event.involvedEntities.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.involvedEntities", {
                            defaultValue: "Involved Entities",
                          })}
                          :
                        </span>
                        <ul className="list-disc list-inside pl-2 text-sm text-theme-muted">
                          {event.involvedEntities.map((entityId, i) => (
                            <li key={`${entityId}-${i}`}>{entityId}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {event.chainId && (
                    <InfoRow
                      label={t("gameViewer.causalChain", {
                        defaultValue: "Causal Chain",
                      })}
                      value={event.chainId}
                    />
                  )}
                  {(event.unlocked || gameState.unlockMode) && event.hidden && (
                    <HiddenContent
                      t={t}
                      content={
                        <div className="space-y-2">
                          {event.unlockReason && (
                            <InfoRow
                              label={t("gameViewer.unlockReason", {
                                defaultValue: "Unlock Reason",
                              })}
                              value={event.unlockReason}
                            />
                          )}
                          {event.hidden.trueDescription && (
                            <MarkdownText content={event.hidden.trueDescription} />
                          )}
                          {event.hidden.trueCausedBy && (
                            <InfoRow
                              label={t("gameViewer.trueCausedBy", {
                                defaultValue: "True Cause",
                              })}
                              value={event.hidden.trueCausedBy}
                            />
                          )}
                          {Array.isArray(event.hidden.consequences) &&
                            event.hidden.consequences.length > 0 && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("gameViewer.consequences", {
                                    defaultValue: "Consequences",
                                  })}
                                  :
                                </span>
                                <ul className="list-disc list-inside pl-2">
                                  {event.hidden.consequences.map((c, i) => (
                                    <li key={i}>
                                      <MarkdownText content={c} inline />
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
                {item.visible?.observation && (
                  <div className="text-xs mt-1 pl-1">
                    <span className="text-theme-primary/70">
                      {t("gameViewer.observation", {
                        defaultValue: "Observation",
                      })}
                      :
                    </span>
                    <div className="text-theme-muted">
                      <MarkdownText content={item.visible.observation} />
                    </div>
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
                {item.emotionalWeight && (
                  <div className="text-xs border-t border-theme-border/30 pt-2 mt-1">
                    <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                      {t("gameViewer.emotionalWeight", {
                        defaultValue: "Emotional Weight",
                      })}
                      :
                    </span>
                    <div className="text-theme-muted">
                      <MarkdownText content={item.emotionalWeight} />
                    </div>
                  </div>
                )}
                {(item.unlocked || gameState.unlockMode) && item.hidden && (
                  <HiddenContent
                    t={t}
                    content={
                      <div className="space-y-1 text-xs">
                        {item.unlockReason && (
                          <InfoRow
                            label={t("gameViewer.unlockReason", {
                              defaultValue: "Unlock Reason",
                            })}
                            value={item.unlockReason}
                          />
                        )}
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
