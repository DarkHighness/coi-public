/**
 * NpcsTab - Known characters and NPCs display
 * Actor-first + Dual Layer:
 * - NPC → Player true affinity is stored only in relation.attitude.hidden.affinity (default hidden)
 * - Player → NPC perception is objective (relation.perception)
 */

import React from "react";
import { GameState, RelationEdge } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { resolveLocationDisplayName } from "../../utils/entityDisplay";
import { Section, InfoRow, EmptyState, HiddenContent } from "./helpers";

interface NpcsTabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: (key: string, options?: any) => string;
}

const getAffinityBadgeClass = (val: number): string => {
  if (val >= 80) return "bg-green-500/20 text-green-400";
  if (val >= 60) return "bg-blue-500/20 text-blue-400";
  if (val >= 40) return "bg-yellow-500/20 text-yellow-400";
  if (val >= 20) return "bg-orange-500/20 text-orange-400";
  return "bg-red-500/20 text-red-400";
};

export const NPCsTab: React.FC<NpcsTabProps> = ({
  gameState,
  expandedSections,
  toggleSection,
  t,
}) => {
  const playerId = gameState.playerActorId || "char:player";
  const playerProfile = gameState.actors.find(
    (b) => b?.profile?.id === playerId,
  )?.profile as any;
  const playerRelations = (
    Array.isArray(playerProfile?.relations) ? playerProfile.relations : []
  ) as RelationEdge[];

  const visibleNpcs = (gameState.npcs || []).filter(
    (npc: any) =>
      gameState.unlockMode ||
      !Array.isArray(npc.knownBy) ||
      npc.knownBy.includes(playerId),
  );

  return (
    <div className="space-y-4">
      <Section
        id="npcs"
        title={t("gameViewer.knownCharacters")}
        icon="👥"
        isExpanded={expandedSections.has("npcs")}
        onToggle={toggleSection}
      >
        {visibleNpcs.length === 0 ? (
          <EmptyState message={t("gameViewer.noNpcs")} />
        ) : (
          <div className="space-y-3">
            {visibleNpcs.map((npc: any) => {
              const attitude = (
                Array.isArray(npc.relations) ? npc.relations : []
              ).find(
                (r: any) =>
                  r?.kind === "attitude" &&
                  r?.to?.kind === "character" &&
                  r?.to?.id === playerId,
              );
              const showTrueAttitude = Boolean(
                gameState.unlockMode || attitude?.unlocked === true,
              );
              const affinity =
                showTrueAttitude &&
                typeof attitude?.hidden?.affinity === "number"
                  ? attitude.hidden.affinity
                  : null;

              const perception = playerRelations.find(
                (r: any) =>
                  r?.kind === "perception" &&
                  r?.to?.kind === "character" &&
                  r?.to?.id === npc.id,
              ) as any;
              const npcCurrentLocationDisplay = npc.currentLocation
                ? resolveLocationDisplayName(npc.currentLocation, gameState)
                : "";

              return (
                <div
                  key={npc.id}
                  className="p-4 bg-theme-bg rounded-none border border-theme-border/40"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-theme-primary text-base flex items-center gap-2">
                      <span>{getValidIcon(npc.icon, "👤")}</span>
                      {npc.visible?.name || t("unknown")}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        affinity === null
                          ? "bg-theme-surface text-theme-muted"
                          : getAffinityBadgeClass(affinity)
                      }`}
                      title={
                        affinity === null
                          ? t(
                              "gameViewer.affinityHidden",
                              "True attitude is hidden unless confirmed.",
                            )
                          : undefined
                      }
                    >
                      {affinity === null ? "?" : `${Math.round(affinity)}/100`}
                    </span>
                  </div>

                  {npc.visible?.description && (
                    <div className="story-text text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50 leading-relaxed">
                      <MarkdownText content={npc.visible.description} />
                    </div>
                  )}

                  <div className="mt-3 space-y-2 text-sm">
                    {npcCurrentLocationDisplay && (
                      <InfoRow
                        label={t("gameViewer.currentLocation") || "Location"}
                        value={npcCurrentLocationDisplay}
                      />
                    )}

                    {npc.visible?.appearance && (
                      <div>
                        <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.appearance") || "Appearance"}:
                        </span>
                        <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30">
                          <MarkdownText content={npc.visible.appearance} />
                        </div>
                      </div>
                    )}

                    {npc.visible?.roleTag && (
                      <InfoRow
                        label={t("gameViewer.roleTag", {
                          defaultValue: "Role",
                        })}
                        value={npc.visible.roleTag}
                      />
                    )}

                    {(attitude?.visible?.reputationTag ||
                      attitude?.visible?.claimedIntent ||
                      (Array.isArray(attitude?.visible?.signals) &&
                        attitude.visible.signals.length > 0)) && (
                      <div>
                        <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.attitudeSignals", {
                            defaultValue: "Attitude (Signals)",
                          })}
                          :
                        </span>
                        <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30 space-y-1">
                          {attitude?.visible?.reputationTag && (
                            <div>
                              <span className="opacity-70">
                                {t("gameViewer.reputationTag", {
                                  defaultValue: "Tag",
                                })}
                                :
                              </span>{" "}
                              {attitude.visible.reputationTag}
                            </div>
                          )}
                          {attitude?.visible?.claimedIntent && (
                            <div>
                              <span className="opacity-70">
                                {t("gameViewer.claimedIntent", {
                                  defaultValue: "Claims",
                                })}
                                :
                              </span>{" "}
                              <MarkdownText
                                content={attitude.visible.claimedIntent}
                                inline
                              />
                            </div>
                          )}
                          {Array.isArray(attitude?.visible?.signals) &&
                            attitude.visible.signals.length > 0 && (
                              <ul className="list-disc list-inside">
                                {attitude.visible.signals.map(
                                  (s: string, i: number) => (
                                    <li key={i}>
                                      <MarkdownText content={s} inline />
                                    </li>
                                  ),
                                )}
                              </ul>
                            )}
                        </div>
                      </div>
                    )}

                    {perception?.visible?.description && (
                      <div>
                        <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.myPerception", {
                            defaultValue: "My Perception",
                          })}
                          :
                        </span>
                        <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30">
                          <MarkdownText
                            content={perception.visible.description}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {(gameState.unlockMode || npc.unlocked) && npc.hidden && (
                    <HiddenContent
                      t={t}
                      content={
                        <div className="space-y-2">
                          {npc.hidden.trueName && (
                            <InfoRow
                              label={t("sidebar.npc.trueName")}
                              value={npc.hidden.trueName}
                            />
                          )}
                          {npc.hidden.realPersonality && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                                {t("hidden.personality")}:
                              </span>
                              <MarkdownText
                                content={npc.hidden.realPersonality}
                              />
                            </div>
                          )}
                          {npc.hidden.realMotives && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                                {t("hidden.motives")}:
                              </span>
                              <MarkdownText content={npc.hidden.realMotives} />
                            </div>
                          )}
                          {npc.hidden.routine && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                                {t("hidden.routine", {
                                  defaultValue: "Routine",
                                })}
                                :
                              </span>
                              <MarkdownText content={npc.hidden.routine} />
                            </div>
                          )}
                          {npc.hidden.currentThought && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                                {t("sidebar.npc.currentThought")}:
                              </span>
                              <MarkdownText
                                content={npc.hidden.currentThought}
                              />
                            </div>
                          )}
                          {Array.isArray(npc.hidden.secrets) &&
                            npc.hidden.secrets.length > 0 && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                                  {t("hidden.secrets")}:
                                </span>
                                <ul className="list-disc list-inside">
                                  {npc.hidden.secrets.map(
                                    (s: string, i: number) => (
                                      <li key={i}>
                                        <MarkdownText content={s} inline />
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                          {npc.hidden.status && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                                {t("hidden.actualStatus", {
                                  defaultValue: "Actually Doing",
                                })}
                                :
                              </span>
                              <MarkdownText content={npc.hidden.status} />
                            </div>
                          )}
                        </div>
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
};
