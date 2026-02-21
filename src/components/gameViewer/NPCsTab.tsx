/**
 * NpcsTab - Known characters and NPCs display
 * Actor-first + Dual Layer:
 * - NPC → Player true affinity is stored only in relation.attitude.hidden.affinity as text (default hidden)
 * - Player → NPC perception is objective (relation.perception)
 */

import React from "react";
import type { TFunction } from "i18next";
import { GameState, RelationEdge } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { resolveLocationDisplayName } from "../../utils/entityDisplay";
import { Section, InfoRow, EmptyState, HiddenContent } from "./helpers";

interface NpcsTabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: TFunction;
}

const isRelationEdge = (value: unknown): value is RelationEdge =>
  typeof value === "object" && value !== null;

const toRelationEdges = (value: unknown): RelationEdge[] =>
  Array.isArray(value) ? value.filter(isRelationEdge) : [];

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null;

const readString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const readStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const actorKnows = (knownBy: unknown, actorId: string): boolean =>
  Array.isArray(knownBy) && knownBy.some((entry) => entry === actorId);

type AttitudeRelation = RelationEdge & {
  kind: "attitude";
  hidden?: unknown;
  visible?: unknown;
};

type PerceptionRelation = RelationEdge & {
  kind: "perception";
  visible?: unknown;
};

const isAttitudeRelationTo = (
  edge: RelationEdge,
  targetId: string,
): edge is AttitudeRelation =>
  edge.kind === "attitude" &&
  edge.to?.kind === "character" &&
  edge.to?.id === targetId;

const isPerceptionRelationTo = (
  edge: RelationEdge,
  targetId: string,
): edge is PerceptionRelation =>
  edge.kind === "perception" &&
  edge.to?.kind === "character" &&
  edge.to?.id === targetId;

export const NPCsTab: React.FC<NpcsTabProps> = ({
  gameState,
  expandedSections,
  toggleSection,
  t,
}) => {
  const playerId = gameState.playerActorId || "char:player";
  const playerProfile = gameState.actors.find(
    (b) => b?.profile?.id === playerId,
  )?.profile;
  const playerRelations = toRelationEdges(playerProfile?.relations);

  const visibleNpcs = (gameState.npcs || []).filter(
    (npc) =>
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
            {visibleNpcs.map((npc) => {
              const npcRelations = toRelationEdges(npc.relations);
              const attitude = npcRelations.find(
                (edge): edge is AttitudeRelation =>
                  isAttitudeRelationTo(edge, playerId),
              );
              const attitudeVisible = isRecord(attitude?.visible)
                ? attitude.visible
                : null;
              const attitudeHidden = isRecord(attitude?.hidden)
                ? attitude.hidden
                : null;
              const npcUnlockedForPlayer = Boolean(
                npc.unlocked === true && actorKnows(npc.knownBy, playerId),
              );
              const attitudeUnlockedForPlayer = Boolean(
                attitude?.unlocked === true &&
                actorKnows(attitude?.knownBy, playerId),
              );
              const showTrueAttitude = Boolean(
                gameState.unlockMode || attitudeUnlockedForPlayer,
              );
              const affinity =
                showTrueAttitude &&
                typeof attitudeHidden?.affinity === "string" &&
                attitudeHidden.affinity.trim().length > 0
                  ? attitudeHidden.affinity.trim()
                  : null;

              const perception = playerRelations.find(
                (edge): edge is PerceptionRelation =>
                  isPerceptionRelationTo(edge, npc.id),
              );
              const perceptionVisible = isRecord(perception?.visible)
                ? perception.visible
                : null;
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
                          : "bg-theme-primary/15 text-theme-primary border border-theme-primary/30"
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
                      {affinity === null ? "?" : affinity}
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

                    {npc.visible?.title && (
                      <InfoRow
                        label={t("gameViewer.titleLabel")}
                        value={npc.visible.title}
                      />
                    )}

                    {npc.visible?.profession && (
                      <InfoRow
                        label={t("gameViewer.profession")}
                        value={npc.visible.profession}
                      />
                    )}

                    {npc.visible?.age && (
                      <InfoRow
                        label={t("gameViewer.age")}
                        value={npc.visible.age}
                      />
                    )}

                    {npc.visible?.status && (
                      <InfoRow
                        label={t("gameViewer.perceivedStatus")}
                        value={npc.visible.status}
                      />
                    )}

                    <InfoRow
                      label={t("gameViewer.race")}
                      value={npc.visible?.race || t("unknown")}
                    />

                    <InfoRow
                      label={t("gameViewer.gender")}
                      value={npc.visible?.gender || t("unknown")}
                    />

                    {npc.visible?.voice && (
                      <InfoRow
                        label={t("gameViewer.voice")}
                        value={npc.visible.voice}
                      />
                    )}

                    {npc.visible?.mannerism && (
                      <InfoRow
                        label={t("gameViewer.mannerism")}
                        value={npc.visible.mannerism}
                      />
                    )}

                    {npc.visible?.mood && (
                      <InfoRow
                        label={t("gameViewer.mood")}
                        value={npc.visible.mood}
                      />
                    )}

                    {npc.visible?.background && (
                      <InfoRow
                        label={t("gameViewer.background")}
                        value={npc.visible.background}
                      />
                    )}
                    {(readString(attitudeVisible?.reputationTag) ||
                      readString(attitudeVisible?.claimedIntent) ||
                      readStringArray(attitudeVisible?.signals).length > 0) && (
                      <div>
                        <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.attitudeSignals", {
                            defaultValue: "Attitude (Signals)",
                          })}
                          :
                        </span>
                        <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30 space-y-1">
                          {readString(attitudeVisible?.reputationTag) && (
                            <div>
                              <span className="opacity-70">
                                {t("gameViewer.reputationTag", {
                                  defaultValue: "Tag",
                                })}
                                :
                              </span>{" "}
                              {readString(attitudeVisible?.reputationTag)}
                            </div>
                          )}
                          {readString(attitudeVisible?.claimedIntent) && (
                            <div>
                              <span className="opacity-70">
                                {t("gameViewer.claimedIntent", {
                                  defaultValue: "Claims",
                                })}
                                :
                              </span>{" "}
                              <MarkdownText
                                content={
                                  readString(attitudeVisible?.claimedIntent) ||
                                  ""
                                }
                                inline
                              />
                            </div>
                          )}
                          {readStringArray(attitudeVisible?.signals).length >
                            0 && (
                            <ul className="list-disc list-inside">
                              {readStringArray(attitudeVisible?.signals).map(
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

                    {readString(perceptionVisible?.description) && (
                      <div>
                        <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.myPerception", {
                            defaultValue: "My Perception",
                          })}
                          :
                        </span>
                        <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30">
                          <MarkdownText
                            content={
                              readString(perceptionVisible?.description) || ""
                            }
                          />
                        </div>
                        {readStringArray(perceptionVisible?.evidence).length >
                          0 && (
                          <div className="mt-2 text-theme-text/80 pl-2 border-l-2 border-theme-border/20">
                            <span className="text-xs uppercase tracking-wider text-theme-primary/70 block mb-1">
                              {t("gameViewer.evidence", {
                                defaultValue: "Evidence",
                              })}
                              :
                            </span>
                            <ul className="list-disc list-inside">
                              {readStringArray(perceptionVisible?.evidence).map(
                                (e: string, i: number) => (
                                  <li key={i}>
                                    <MarkdownText content={e} inline />
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {showTrueAttitude &&
                      (readString(attitude?.unlockReason) ||
                        readString(attitudeHidden?.impression) ||
                        readString(attitudeHidden?.observation) ||
                        readString(attitudeHidden?.ambivalence) ||
                        readString(attitudeHidden?.transactionalBenefit) ||
                        readString(attitudeHidden?.motives) ||
                        readString(attitudeHidden?.currentThought)) && (
                        <div>
                          <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                            {t("gameViewer.trueAttitude", {
                              defaultValue: "True Attitude",
                            })}
                            :
                          </span>
                          <div className="text-theme-text/80 pl-2 border-l-2 border-theme-unlocked/30 space-y-1">
                            {readString(attitude?.unlockReason) && (
                              <InfoRow
                                label={t("gameViewer.unlockReason", {
                                  defaultValue: "Unlock Reason",
                                })}
                                value={readString(attitude?.unlockReason) || ""}
                              />
                            )}
                            {readString(attitudeHidden?.impression) && (
                              <InfoRow
                                label={t("gameViewer.impression", {
                                  defaultValue: "Impression",
                                })}
                                value={
                                  readString(attitudeHidden?.impression) || ""
                                }
                              />
                            )}
                            {readString(attitudeHidden?.observation) && (
                              <InfoRow
                                label={t("gameViewer.observation", {
                                  defaultValue: "Observation",
                                })}
                                value={
                                  readString(attitudeHidden?.observation) || ""
                                }
                              />
                            )}
                            {readString(attitudeHidden?.ambivalence) && (
                              <InfoRow
                                label={t("gameViewer.ambivalence", {
                                  defaultValue: "Ambivalence",
                                })}
                                value={
                                  readString(attitudeHidden?.ambivalence) || ""
                                }
                              />
                            )}
                            {readString(
                              attitudeHidden?.transactionalBenefit,
                            ) && (
                              <InfoRow
                                label={t("gameViewer.transactionalBenefit", {
                                  defaultValue: "Transactional Benefit",
                                })}
                                value={
                                  readString(
                                    attitudeHidden?.transactionalBenefit,
                                  ) || ""
                                }
                              />
                            )}
                            {readString(attitudeHidden?.motives) && (
                              <InfoRow
                                label={t("hidden.motives", {
                                  defaultValue: "Motives",
                                })}
                                value={
                                  readString(attitudeHidden?.motives) || ""
                                }
                              />
                            )}
                            {readString(attitudeHidden?.currentThought) && (
                              <InfoRow
                                label={t("sidebar.npc.currentThought", {
                                  defaultValue: "Current Thought",
                                })}
                                value={
                                  readString(attitudeHidden?.currentThought) ||
                                  ""
                                }
                              />
                            )}
                          </div>
                        </div>
                      )}
                  </div>

                  {(gameState.unlockMode || npcUnlockedForPlayer) &&
                    npc.hidden && (
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
                                <MarkdownText
                                  content={npc.hidden.realMotives}
                                />
                              </div>
                            )}
                            {npc.hidden.race && (
                              <InfoRow
                                label={t("gameViewer.race")}
                                value={npc.hidden.race}
                              />
                            )}
                            {npc.hidden.gender && (
                              <InfoRow
                                label={t("gameViewer.gender")}
                                value={npc.hidden.gender}
                              />
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
