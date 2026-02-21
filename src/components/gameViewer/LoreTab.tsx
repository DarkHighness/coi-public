/**
 * LoreTab - Knowledge, timeline, and inventory display
 * Shows discovered knowledge, timeline events, and inventory items
 */

import React from "react";
import type { TFunction } from "i18next";
import { GameState } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { resolveEntityDisplayName } from "../../utils/entityDisplay";
import {
  Section,
  EmptyState,
  HiddenContent,
  InfoRow,
  EntityBlock,
} from "./helpers";

interface LoreTabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: TFunction;
  mode?: "all" | "knowledge" | "timeline" | "inventory";
}

const renderMarkdownList = (items: string[]) => (
  <ul className="list-disc list-inside space-y-1">
    {items.map((item, idx) => (
      <li key={`${item}-${idx}`}>
        <MarkdownText content={item} inline />
      </li>
    ))}
  </ul>
);

export const LoreTab: React.FC<LoreTabProps> = ({
  gameState,
  expandedSections,
  toggleSection,
  t,
  mode = "all",
}) => {
  const showKnowledge = mode === "all" || mode === "knowledge";
  const showTimeline = mode === "all" || mode === "timeline";
  const showInventory = mode === "all" || mode === "inventory";

  return (
    <div className="space-y-3">
      {showKnowledge ? (
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
            <div className="space-y-2">
              {gameState.knowledge.map((entry, idx) => (
                <EntityBlock key={entry.id || idx}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-theme-text text-xs flex items-center gap-2">
                      <span>{getValidIcon(entry.icon, "📚")}</span>
                      {entry.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 border border-theme-divider/70 text-theme-text-secondary uppercase tracking-[0.08em]">
                      {t(`knowledge.category.${entry.category}`)}
                    </span>
                  </div>

                  <InfoRow
                    label={t("description") || "Description"}
                    value={<MarkdownText content={entry.visible.description} />}
                  />

                  {entry.visible.details ? (
                    <InfoRow
                      label={t("gameViewer.details", {
                        defaultValue: "Details",
                      })}
                      value={<MarkdownText content={entry.visible.details} />}
                    />
                  ) : null}

                  {Array.isArray(entry.relatedTo) &&
                  entry.relatedTo.length > 0 ? (
                    <InfoRow
                      label={t("gameViewer.relatedEntities", {
                        defaultValue: "Related Entities",
                      })}
                      value={renderMarkdownList(
                        entry.relatedTo.map((entityRef) =>
                          resolveEntityDisplayName(entityRef, gameState),
                        ),
                      )}
                    />
                  ) : null}

                  {entry.discoveredAt ? (
                    <InfoRow
                      label={t("gameViewer.discoveredAt", {
                        defaultValue: "Discovered",
                      })}
                      value={entry.discoveredAt}
                    />
                  ) : null}

                  {(entry.unlocked || gameState.unlockMode) && entry.hidden ? (
                    <HiddenContent
                      t={t}
                      content={
                        <>
                          {entry.unlockReason ? (
                            <InfoRow
                              label={t("gameViewer.unlockReason", {
                                defaultValue: "Unlock Reason",
                              })}
                              value={entry.unlockReason}
                            />
                          ) : null}
                          {entry.hidden.fullTruth ? (
                            <InfoRow
                              label={t("gameViewer.fullTruth", {
                                defaultValue: "Full Truth",
                              })}
                              value={
                                <MarkdownText
                                  content={entry.hidden.fullTruth}
                                />
                              }
                            />
                          ) : null}
                          {entry.hidden.misconceptions &&
                          entry.hidden.misconceptions.length > 0 ? (
                            <InfoRow
                              label={t("gameViewer.misconceptions")}
                              value={renderMarkdownList(
                                entry.hidden.misconceptions,
                              )}
                            />
                          ) : null}
                          {entry.hidden.toBeRevealed &&
                          entry.hidden.toBeRevealed.length > 0 ? (
                            <InfoRow
                              label={t("gameViewer.toBeRevealed", {
                                defaultValue: "To Be Revealed",
                              })}
                              value={renderMarkdownList(
                                entry.hidden.toBeRevealed,
                              )}
                            />
                          ) : null}
                        </>
                      }
                    />
                  ) : null}
                </EntityBlock>
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {showTimeline ? (
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
            <div className="space-y-2">
              {gameState.timeline
                .filter(
                  (e) =>
                    gameState.unlockMode ||
                    !Array.isArray(e.knownBy) ||
                    e.knownBy.includes(
                      gameState.playerActorId || "char:player",
                    ),
                )
                .sort(
                  (a, b) =>
                    new Date(b.gameTime).getTime() -
                    new Date(a.gameTime).getTime(),
                )
                .slice(0, 20)
                .map((event, idx) => (
                  <EntityBlock key={event.id || idx}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-theme-text-secondary font-mono">
                          {event.gameTime}
                        </span>
                        <span className="text-xs text-theme-text font-semibold">
                          {event.name}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 text-theme-text-secondary flex items-center gap-1 border border-theme-divider/70 uppercase tracking-[0.08em]">
                        <span>{getValidIcon(event.icon, "⏳")}</span>
                        {t(`timeline.categories.${event.category}`, {
                          defaultValue: event.category,
                        })}
                      </span>
                    </div>

                    <InfoRow
                      label={t("description") || "Description"}
                      value={
                        <MarkdownText content={event.visible.description} />
                      }
                    />

                    {event.visible.causedBy ? (
                      <InfoRow
                        label={t("gameViewer.causedBy", {
                          defaultValue: "Caused By",
                        })}
                        value={resolveEntityDisplayName(
                          event.visible.causedBy,
                          gameState,
                        )}
                      />
                    ) : null}

                    {Array.isArray(event.involvedEntities) &&
                    event.involvedEntities.length > 0 ? (
                      <InfoRow
                        label={t("gameViewer.involvedEntities", {
                          defaultValue: "Involved Entities",
                        })}
                        value={renderMarkdownList(
                          event.involvedEntities.map((entityRef) =>
                            resolveEntityDisplayName(entityRef, gameState),
                          ),
                        )}
                      />
                    ) : null}

                    {event.chainId ? (
                      <InfoRow
                        label={t("gameViewer.causalChain", {
                          defaultValue: "Causal Chain",
                        })}
                        value={event.chainId}
                      />
                    ) : null}

                    {(event.unlocked || gameState.unlockMode) &&
                    event.hidden ? (
                      <HiddenContent
                        t={t}
                        content={
                          <>
                            {event.unlockReason ? (
                              <InfoRow
                                label={t("gameViewer.unlockReason", {
                                  defaultValue: "Unlock Reason",
                                })}
                                value={event.unlockReason}
                              />
                            ) : null}
                            {event.hidden.trueDescription ? (
                              <InfoRow
                                label={t("gameViewer.trueDescription", {
                                  defaultValue: "True Description",
                                })}
                                value={
                                  <MarkdownText
                                    content={event.hidden.trueDescription}
                                  />
                                }
                              />
                            ) : null}
                            {event.hidden.trueCausedBy ? (
                              <InfoRow
                                label={t("gameViewer.trueCausedBy", {
                                  defaultValue: "True Cause",
                                })}
                                value={resolveEntityDisplayName(
                                  event.hidden.trueCausedBy,
                                  gameState,
                                )}
                              />
                            ) : null}
                            {Array.isArray(event.hidden.consequences) &&
                            event.hidden.consequences.length > 0 ? (
                              <InfoRow
                                label={t("gameViewer.consequences", {
                                  defaultValue: "Consequences",
                                })}
                                value={renderMarkdownList(
                                  event.hidden.consequences,
                                )}
                              />
                            ) : null}
                          </>
                        }
                      />
                    ) : null}
                  </EntityBlock>
                ))}
            </div>
          )}
        </Section>
      ) : null}

      {showInventory ? (
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
            <div className="space-y-2">
              {gameState.inventory.map((item, idx) => (
                <EntityBlock
                  key={item.id || idx}
                  className="flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="ui-emoji-slot">
                      {getValidIcon(item.icon, "📦")}
                    </span>
                    <div className="font-semibold text-theme-text text-xs truncate">
                      {item.name}
                    </div>
                  </div>

                  <InfoRow
                    label={t("description") || "Description"}
                    value={<MarkdownText content={item.visible.description} />}
                  />

                  {item.visible?.sensory?.texture ? (
                    <InfoRow
                      label={t("gameViewer.texture")}
                      value={item.visible.sensory.texture}
                    />
                  ) : null}
                  {item.visible?.sensory?.weight ? (
                    <InfoRow
                      label={t("gameViewer.weight")}
                      value={item.visible.sensory.weight}
                    />
                  ) : null}
                  {item.visible?.sensory?.smell ? (
                    <InfoRow
                      label={t("gameViewer.smell")}
                      value={item.visible.sensory.smell}
                    />
                  ) : null}

                  {item.visible?.condition ? (
                    <InfoRow
                      label={t("gameViewer.condition")}
                      value={item.visible.condition}
                    />
                  ) : null}

                  {item.visible?.observation ? (
                    <InfoRow
                      label={t("gameViewer.observation", {
                        defaultValue: "Observation",
                      })}
                      value={
                        <MarkdownText content={item.visible.observation} />
                      }
                    />
                  ) : null}

                  {item.visible?.usage ? (
                    <InfoRow
                      label={t("gameViewer.usage") || "Usage"}
                      value={<MarkdownText content={item.visible.usage} />}
                    />
                  ) : null}

                  {item.lore ? (
                    <InfoRow
                      label={t("gameViewer.lore") || "Lore"}
                      value={<MarkdownText content={item.lore} />}
                    />
                  ) : null}

                  {item.emotionalWeight ? (
                    <InfoRow
                      label={t("gameViewer.emotionalWeight", {
                        defaultValue: "Emotional Weight",
                      })}
                      value={<MarkdownText content={item.emotionalWeight} />}
                    />
                  ) : null}

                  {(item.unlocked || gameState.unlockMode) && item.hidden ? (
                    <HiddenContent
                      t={t}
                      content={
                        <>
                          {item.unlockReason ? (
                            <InfoRow
                              label={t("gameViewer.unlockReason", {
                                defaultValue: "Unlock Reason",
                              })}
                              value={item.unlockReason}
                            />
                          ) : null}
                          {item.hidden.truth ? (
                            <InfoRow
                              label={t("gameViewer.truth", {
                                defaultValue: "Truth",
                              })}
                              value={
                                <MarkdownText content={item.hidden.truth} />
                              }
                            />
                          ) : null}
                          {item.hidden.secrets &&
                          item.hidden.secrets.length > 0 ? (
                            <InfoRow
                              label={t("gameViewer.secrets")}
                              value={renderMarkdownList(item.hidden.secrets)}
                            />
                          ) : null}
                        </>
                      }
                    />
                  ) : null}
                </EntityBlock>
              ))}
            </div>
          )}
        </Section>
      ) : null}
    </div>
  );
};
