/**
 * NpcsTab - Known characters and NPCs display
 * Actor-first + Dual Layer:
 * - NPC -> Player true affinity is stored only in relation.attitude.hidden.affinity as text (default hidden)
 * - Player -> NPC perception is objective (relation.perception)
 */

import React from "react";
import type { TFunction } from "i18next";
import { GameState, RelationEdge } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { resolveLocationDisplayName } from "../../utils/entityDisplay";
import {
  Section,
  InfoRow,
  EmptyState,
  HiddenContent,
  SubsectionLabel,
  EntityBlock,
} from "./helpers";

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

const renderMarkdownList = (items: string[]) => (
  <ul className="list-disc list-inside space-y-1">
    {items.map((item, i) => (
      <li key={`${item}-${i}`}>
        <MarkdownText content={item} inline />
      </li>
    ))}
  </ul>
);

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

              const attitudeSignals = readStringArray(attitudeVisible?.signals);
              const perceptionEvidence = readStringArray(
                perceptionVisible?.evidence,
              );
              const hiddenSecrets = Array.isArray(npc.hidden?.secrets)
                ? npc.hidden.secrets
                : [];

              return (
                <EntityBlock
                  key={npc.id}
                  className="border-b border-theme-divider/70"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-theme-text text-xs flex items-center gap-2">
                      <span>{getValidIcon(npc.icon, "👤")}</span>
                      {npc.visible?.name || t("unknown")}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 border font-semibold uppercase tracking-[0.08em] ${
                        affinity === null
                          ? "border-theme-divider/70 text-theme-text-secondary"
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

                  {npc.visible?.description ? (
                    <InfoRow
                      label={t("description") || "Description"}
                      value={<MarkdownText content={npc.visible.description} />}
                    />
                  ) : null}

                  {npcCurrentLocationDisplay ? (
                    <InfoRow
                      label={t("gameViewer.currentLocation") || "Location"}
                      value={npcCurrentLocationDisplay}
                    />
                  ) : null}

                  {npc.visible?.appearance ? (
                    <InfoRow
                      label={t("gameViewer.appearance") || "Appearance"}
                      value={<MarkdownText content={npc.visible.appearance} />}
                    />
                  ) : null}

                  {npc.visible?.roleTag ? (
                    <InfoRow
                      label={t("gameViewer.roleTag", { defaultValue: "Role" })}
                      value={npc.visible.roleTag}
                    />
                  ) : null}
                  {npc.visible?.title ? (
                    <InfoRow
                      label={t("gameViewer.titleLabel")}
                      value={npc.visible.title}
                    />
                  ) : null}
                  {npc.visible?.profession ? (
                    <InfoRow
                      label={t("gameViewer.profession")}
                      value={npc.visible.profession}
                    />
                  ) : null}
                  {npc.visible?.age ? (
                    <InfoRow
                      label={t("gameViewer.age")}
                      value={npc.visible.age}
                    />
                  ) : null}
                  {npc.visible?.status ? (
                    <InfoRow
                      label={t("gameViewer.perceivedStatus")}
                      value={npc.visible.status}
                    />
                  ) : null}
                  <InfoRow
                    label={t("gameViewer.race")}
                    value={npc.visible?.race || t("unknown")}
                  />
                  <InfoRow
                    label={t("gameViewer.gender")}
                    value={npc.visible?.gender || t("unknown")}
                  />
                  {npc.visible?.voice ? (
                    <InfoRow
                      label={t("gameViewer.voice")}
                      value={npc.visible.voice}
                    />
                  ) : null}
                  {npc.visible?.mannerism ? (
                    <InfoRow
                      label={t("gameViewer.mannerism")}
                      value={npc.visible.mannerism}
                    />
                  ) : null}
                  {npc.visible?.mood ? (
                    <InfoRow
                      label={t("gameViewer.mood")}
                      value={npc.visible.mood}
                    />
                  ) : null}
                  {npc.visible?.background ? (
                    <InfoRow
                      label={t("gameViewer.background")}
                      value={npc.visible.background}
                    />
                  ) : null}

                  {(readString(attitudeVisible?.reputationTag) ||
                    readString(attitudeVisible?.claimedIntent) ||
                    attitudeSignals.length > 0) && (
                    <>
                      <SubsectionLabel>
                        {t("gameViewer.attitudeSignals", {
                          defaultValue: "Attitude (Signals)",
                        })}
                      </SubsectionLabel>
                      {readString(attitudeVisible?.reputationTag) ? (
                        <InfoRow
                          label={t("gameViewer.reputationTag", {
                            defaultValue: "Tag",
                          })}
                          value={
                            readString(attitudeVisible?.reputationTag) || ""
                          }
                        />
                      ) : null}
                      {readString(attitudeVisible?.claimedIntent) ? (
                        <InfoRow
                          label={t("gameViewer.claimedIntent", {
                            defaultValue: "Claims",
                          })}
                          value={
                            <MarkdownText
                              content={
                                readString(attitudeVisible?.claimedIntent) || ""
                              }
                            />
                          }
                        />
                      ) : null}
                      {attitudeSignals.length > 0 ? (
                        <InfoRow
                          label={t("gameViewer.signals", {
                            defaultValue: "Signals",
                          })}
                          value={renderMarkdownList(attitudeSignals)}
                        />
                      ) : null}
                    </>
                  )}

                  {(readString(perceptionVisible?.description) ||
                    perceptionEvidence.length > 0) && (
                    <>
                      <SubsectionLabel>
                        {t("gameViewer.myPerception", {
                          defaultValue: "My Perception",
                        })}
                      </SubsectionLabel>
                      {readString(perceptionVisible?.description) ? (
                        <InfoRow
                          label={t("description") || "Description"}
                          value={
                            <MarkdownText
                              content={
                                readString(perceptionVisible?.description) || ""
                              }
                            />
                          }
                        />
                      ) : null}
                      {perceptionEvidence.length > 0 ? (
                        <InfoRow
                          label={t("gameViewer.evidence", {
                            defaultValue: "Evidence",
                          })}
                          value={renderMarkdownList(perceptionEvidence)}
                        />
                      ) : null}
                    </>
                  )}

                  {showTrueAttitude &&
                    (readString(attitude?.unlockReason) ||
                      readString(attitudeHidden?.impression) ||
                      readString(attitudeHidden?.observation) ||
                      readString(attitudeHidden?.ambivalence) ||
                      readString(attitudeHidden?.transactionalBenefit) ||
                      readString(attitudeHidden?.motives) ||
                      readString(attitudeHidden?.currentThought)) && (
                      <>
                        <SubsectionLabel>
                          {t("gameViewer.trueAttitude", {
                            defaultValue: "True Attitude",
                          })}
                        </SubsectionLabel>
                        {readString(attitude?.unlockReason) ? (
                          <InfoRow
                            label={t("gameViewer.unlockReason", {
                              defaultValue: "Unlock Reason",
                            })}
                            value={readString(attitude?.unlockReason) || ""}
                          />
                        ) : null}
                        {readString(attitudeHidden?.impression) ? (
                          <InfoRow
                            label={t("gameViewer.impression", {
                              defaultValue: "Impression",
                            })}
                            value={readString(attitudeHidden?.impression) || ""}
                          />
                        ) : null}
                        {readString(attitudeHidden?.observation) ? (
                          <InfoRow
                            label={t("gameViewer.observation", {
                              defaultValue: "Observation",
                            })}
                            value={
                              readString(attitudeHidden?.observation) || ""
                            }
                          />
                        ) : null}
                        {readString(attitudeHidden?.ambivalence) ? (
                          <InfoRow
                            label={t("gameViewer.ambivalence", {
                              defaultValue: "Ambivalence",
                            })}
                            value={
                              readString(attitudeHidden?.ambivalence) || ""
                            }
                          />
                        ) : null}
                        {readString(attitudeHidden?.transactionalBenefit) ? (
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
                        ) : null}
                        {readString(attitudeHidden?.motives) ? (
                          <InfoRow
                            label={t("hidden.motives", {
                              defaultValue: "Motives",
                            })}
                            value={readString(attitudeHidden?.motives) || ""}
                          />
                        ) : null}
                        {readString(attitudeHidden?.currentThought) ? (
                          <InfoRow
                            label={t("sidebar.npc.currentThought", {
                              defaultValue: "Current Thought",
                            })}
                            value={
                              readString(attitudeHidden?.currentThought) || ""
                            }
                          />
                        ) : null}
                      </>
                    )}

                  {(gameState.unlockMode || npcUnlockedForPlayer) &&
                  npc.hidden ? (
                    <HiddenContent
                      t={t}
                      content={
                        <>
                          {npc.hidden.trueName ? (
                            <InfoRow
                              label={t("sidebar.npc.trueName")}
                              value={npc.hidden.trueName}
                            />
                          ) : null}
                          {npc.hidden.realPersonality ? (
                            <InfoRow
                              label={t("hidden.personality")}
                              value={
                                <MarkdownText
                                  content={npc.hidden.realPersonality}
                                />
                              }
                            />
                          ) : null}
                          {npc.hidden.realMotives ? (
                            <InfoRow
                              label={t("hidden.motives")}
                              value={
                                <MarkdownText
                                  content={npc.hidden.realMotives}
                                />
                              }
                            />
                          ) : null}
                          {npc.hidden.race ? (
                            <InfoRow
                              label={t("gameViewer.race")}
                              value={npc.hidden.race}
                            />
                          ) : null}
                          {npc.hidden.gender ? (
                            <InfoRow
                              label={t("gameViewer.gender")}
                              value={npc.hidden.gender}
                            />
                          ) : null}
                          {npc.hidden.routine ? (
                            <InfoRow
                              label={t("hidden.routine", {
                                defaultValue: "Routine",
                              })}
                              value={
                                <MarkdownText content={npc.hidden.routine} />
                              }
                            />
                          ) : null}
                          {npc.hidden.currentThought ? (
                            <InfoRow
                              label={t("sidebar.npc.currentThought")}
                              value={
                                <MarkdownText
                                  content={npc.hidden.currentThought}
                                />
                              }
                            />
                          ) : null}
                          {hiddenSecrets.length > 0 ? (
                            <InfoRow
                              label={t("hidden.secrets")}
                              value={renderMarkdownList(hiddenSecrets)}
                            />
                          ) : null}
                          {npc.hidden.status ? (
                            <InfoRow
                              label={t("hidden.actualStatus", {
                                defaultValue: "Actually Doing",
                              })}
                              value={
                                <MarkdownText content={npc.hidden.status} />
                              }
                            />
                          ) : null}
                        </>
                      }
                    />
                  ) : null}
                </EntityBlock>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
};
