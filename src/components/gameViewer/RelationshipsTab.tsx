/**
 * RelationshipsTab - Known characters and NPCs display
 * Shows relationships with affinity, impressions, and hidden info
 */

import React from "react";
import { GameState } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { Section, InfoRow, EmptyState, HiddenContent } from "./helpers";

interface RelationshipsTabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: (key: string, options?: any) => string;
}

export const RelationshipsTab: React.FC<RelationshipsTabProps> = ({
  gameState,
  expandedSections,
  toggleSection,
  t,
}) => {
  return (
    <div className="space-y-4">
      <Section
        id="relationships"
        title={t("gameViewer.knownCharacters")}
        icon="👥"
        isExpanded={expandedSections.has("relationships")}
        onToggle={toggleSection}
      >
        {gameState.relationships.filter(
          (r) => gameState.unlockMode || r.known !== false,
        ).length === 0 ? (
          <EmptyState message={t("gameViewer.noRelationships")} />
        ) : (
          <div className="space-y-3">
            {gameState.relationships
              .filter((r) => gameState.unlockMode || r.known !== false)
              .map((rel, idx) => (
                <div
                  key={rel.id || idx}
                  className="p-4 bg-theme-surface-highlight/30 rounded border border-theme-border/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-theme-primary text-base flex items-center gap-2">
                      <span>{getValidIcon(rel.icon, "👤")}</span>
                      {rel.visible.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        rel.visible.affinity > 50
                          ? "bg-green-500/20 text-green-400"
                          : rel.visible.affinity < -50
                            ? "bg-red-500/20 text-red-400"
                            : "bg-theme-surface text-theme-muted"
                      }`}
                    >
                      {rel.visible.affinityKnown
                        ? `${rel.visible.affinity > 0 ? "+" : ""}${rel.visible.affinity}`
                        : "?"}
                    </span>
                  </div>
                  <div className="text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50">
                    <MarkdownText content={rel.visible.description} />
                  </div>
                  {/* Visible Fields - Player's Perception */}
                  <div className="mt-3 space-y-2 text-sm">
                    {rel.visible.appearance && (
                      <div>
                        <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.appearance") || "Appearance"}:
                        </span>
                        <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30">
                          <MarkdownText content={rel.visible.appearance} />
                        </div>
                      </div>
                    )}
                    {rel.visible.personality && (
                      <div>
                        <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.personality") || "Personality"}:
                        </span>
                        <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30">
                          <MarkdownText content={rel.visible.personality} />
                        </div>
                      </div>
                    )}
                    {rel.visible.impression && (
                      <div>
                        <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.myImpression") || "My Impression"}:
                        </span>
                        <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30">
                          <MarkdownText content={rel.visible.impression} />
                        </div>
                      </div>
                    )}
                    {rel.visible.status && (
                      <div>
                        <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.perceivedStatus") ||
                            "Currently (Perceived)"}
                          :
                        </span>
                        <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30">
                          <MarkdownText content={rel.visible.status} />
                        </div>
                      </div>
                    )}
                    {rel.visible.dialogueStyle && (
                      <div>
                        <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.dialogueStyle") || "Speech Style"}:
                        </span>
                        <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30">
                          <MarkdownText content={rel.visible.dialogueStyle} />
                        </div>
                      </div>
                    )}
                    {rel.visible.voice && (
                      <InfoRow
                        label={t("gameViewer.voice") || "Voice"}
                        value={rel.visible.voice}
                      />
                    )}
                    {rel.visible.mannerism && (
                      <InfoRow
                        label={t("gameViewer.mannerism") || "Mannerism"}
                        value={rel.visible.mannerism}
                      />
                    )}
                    {rel.visible.mood && (
                      <InfoRow
                        label={t("gameViewer.mood") || "Mood"}
                        value={rel.visible.mood}
                      />
                    )}
                  </div>
                  {(rel.unlocked || gameState.unlockMode) && rel.hidden && (
                    <HiddenContent
                      t={t}
                      content={
                        <div className="space-y-2">
                          {rel.hidden.currentThought && (
                            <div className="mb-2 italic text-theme-primary/70">
                              "{rel.hidden.currentThought}"
                            </div>
                          )}
                          {rel.hidden.trueName && (
                            <InfoRow
                              label={t("gameViewer.trueName") || "True Name"}
                              value={rel.hidden.trueName}
                            />
                          )}
                          {rel.hidden.realPersonality && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.realPersonality")}:
                              </span>
                              <MarkdownText
                                content={rel.hidden.realPersonality}
                              />
                            </div>
                          )}
                          {rel.hidden.realMotives && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.realMotives")}:
                              </span>
                              <MarkdownText content={rel.hidden.realMotives} />
                            </div>
                          )}
                          {rel.hidden.secrets &&
                            rel.hidden.secrets.length > 0 && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("gameViewer.secrets")}:
                                </span>
                                <ul className="list-disc list-inside pl-2">
                                  {rel.hidden.secrets.map((secret, i) => (
                                    <li key={i}>
                                      <MarkdownText content={secret} inline />
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          {rel.hidden.trueAffinity !== undefined && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.trueAffinity")}:
                              </span>
                              <p className="pl-2">
                                {rel.hidden.trueAffinity > 0 ? "+" : ""}
                                {rel.hidden.trueAffinity}
                              </p>
                            </div>
                          )}
                          {rel.hidden.relationshipType && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.trueRelationship") ||
                                  "True Relationship"}
                                :
                              </span>
                              <MarkdownText
                                content={rel.hidden.relationshipType}
                              />
                            </div>
                          )}
                          {rel.hidden.status && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.trueStatus") || "True Status"}:
                              </span>
                              <MarkdownText content={rel.hidden.status} />
                            </div>
                          )}
                          {rel.hidden.impression && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.npcImpression") ||
                                  "Their Impression of Me"}
                                :
                              </span>
                              <MarkdownText content={rel.hidden.impression} />
                            </div>
                          )}
                          {rel.hidden.routine && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.routine") || "Daily Routine"}:
                              </span>
                              <MarkdownText content={rel.hidden.routine} />
                            </div>
                          )}
                        </div>
                      }
                    />
                  )}
                  <div className="flex flex-wrap gap-2 mt-3 text-xs pt-2 border-t border-theme-border/30">
                    <span className="text-theme-muted bg-theme-surface px-2 py-0.5 rounded border border-theme-border/50">
                      {rel.visible.relationshipType}
                    </span>
                    {rel.currentLocation &&
                      rel.currentLocation !== "unknown" && (
                        <span className="text-theme-muted bg-theme-surface px-2 py-0.5 rounded border border-theme-border/50">
                          📍 {rel.currentLocation}
                        </span>
                      )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Section>
    </div>
  );
};
