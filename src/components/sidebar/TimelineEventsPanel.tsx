import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { GameState, TimelineEvent } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { useOptionalRuntimeContext } from "../../runtime/context";
import { resolveEntityDisplayName } from "../../utils/entityDisplay";
import { SidebarTag } from "./SidebarTag";
import { SidebarEntityRow } from "./SidebarEntityRow";
import { SidebarField, SidebarSection } from "./SidebarSections";
import { pickFirstText } from "./panelText";
import { SidebarPanelHeader } from "./SidebarPanelHeader";

interface TimelineEventsPanelProps {
  events?: TimelineEvent[];
  gameState: Pick<
    GameState,
    | "playerActorId"
    | "character"
    | "actors"
    | "npcs"
    | "locations"
    | "quests"
    | "knowledge"
    | "factions"
    | "timeline"
    | "inventory"
  >;
  themeFont: string;
  expandedItemId?: string | null;
  onExpandItem?: (itemId: string | null) => void;
}

const TimelineEventRow: React.FC<{
  event: TimelineEvent;
  gameState: TimelineEventsPanelProps["gameState"];
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ event, gameState, isExpanded, onToggle }) => {
  const { t } = useTranslation();
  const engine = useOptionalRuntimeContext();
  const clearHighlight = engine?.actions.clearHighlight;
  const [isHighlight, setIsHighlight] = useState(event.highlight || false);

  useEffect(() => {
    setIsHighlight(event.highlight || false);
  }, [event.highlight]);

  const resolvedCausedBy = event.visible.causedBy
    ? resolveEntityDisplayName(event.visible.causedBy, gameState)
    : null;
  const resolvedTrueCausedBy = event.hidden?.trueCausedBy
    ? resolveEntityDisplayName(event.hidden.trueCausedBy, gameState)
    : null;

  return (
    <SidebarEntityRow
      title={event.name || t("timeline.event") || "Event"}
      icon={getValidIcon(event.icon, "📅")}
      tags={
        <>
          <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
            {event.gameTime}
          </SidebarTag>
          {event.category ? (
            <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
              {t(`timeline.categories.${event.category}`, {
                defaultValue: event.category.replace("_", " "),
              })}
            </SidebarTag>
          ) : null}
          {event.unlocked ? (
            <SidebarTag className="text-theme-primary border-theme-primary/60">
              {t("unlocked") || "Unlocked"}
            </SidebarTag>
          ) : null}
        </>
      }
      summary={pickFirstText(
        event.visible.description,
        event.hidden?.trueDescription,
      )}
      isExpanded={isExpanded}
      onToggle={() => {
        onToggle();
        if (isHighlight) {
          setIsHighlight(false);
          clearHighlight?.({ kind: "timeline", id: event.id });
        }
      }}
      className={isHighlight ? "ring-1 ring-theme-primary/40" : ""}
      accentClassName={
        isExpanded ? "border-l-theme-primary/70" : "border-l-theme-divider/70"
      }
    >
      <div className="pl-2 pr-1 pb-3 text-xs text-theme-text">
        <SidebarSection title={t("visible") || "Visible"} withDivider={false}>
          <SidebarField label={t("description") || "Description"}>
            <MarkdownText content={event.visible.description} indentSize={2} />
          </SidebarField>

          {resolvedCausedBy ? (
            <SidebarField label={t("worldInfo.causedBy") || "Caused By"}>
              {resolvedCausedBy}
            </SidebarField>
          ) : null}

          {event.involvedEntities?.length ? (
            <SidebarField label={t("timeline.involved") || "Involved"}>
              <div className="flex flex-wrap gap-1.5">
                {event.involvedEntities.map((entityId, index) => (
                  <SidebarTag
                    key={`${entityId}-${index}`}
                    className="text-theme-text-secondary border-theme-divider/70 text-[10px] normal-case tracking-normal"
                  >
                    {resolveEntityDisplayName(entityId, gameState)}
                  </SidebarTag>
                ))}
              </div>
            </SidebarField>
          ) : null}

          {event.chainId ? (
            <SidebarField label={t("timeline.chain") || "Chain"}>
              <span className="font-mono text-theme-text-secondary">
                {event.chainId}
              </span>
            </SidebarField>
          ) : null}
        </SidebarSection>

        {event.unlocked && event.hidden ? (
          <SidebarSection
            title={t("hidden.truth") || "Hidden"}
            className="sidebar-hidden-divider"
          >
            {event.hidden.trueDescription ? (
              <SidebarField label={t("hidden.truth") || "Truth"}>
                <MarkdownText
                  content={event.hidden.trueDescription}
                  indentSize={2}
                />
              </SidebarField>
            ) : null}

            {resolvedTrueCausedBy ? (
              <SidebarField label={t("hidden.cause") || "True Cause"}>
                {resolvedTrueCausedBy}
              </SidebarField>
            ) : null}

            {event.hidden.consequences?.length ? (
              <SidebarField label={t("hidden.consequences") || "Consequences"}>
                <ul className="list-disc list-inside space-y-1">
                  {event.hidden.consequences.map((consequence, index) => (
                    <li key={`${consequence}-${index}`}>
                      <MarkdownText
                        content={consequence}
                        indentSize={2}
                        inline
                      />
                    </li>
                  ))}
                </ul>
              </SidebarField>
            ) : null}

            {event.unlockReason ? (
              <SidebarField label={t("unlockReason") || "Unlock Reason"}>
                <MarkdownText content={event.unlockReason} indentSize={2} />
              </SidebarField>
            ) : null}
          </SidebarSection>
        ) : null}

        <SidebarSection title={t("meta") || "Meta"}>
          <SidebarField label={t("timeline.time") || "Time"}>
            {event.gameTime}
          </SidebarField>
        </SidebarSection>
      </div>
    </SidebarEntityRow>
  );
};

const TimelineEventsPanelComponent: React.FC<TimelineEventsPanelProps> = ({
  events,
  gameState,
  themeFont,
  expandedItemId,
  onExpandItem,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [localExpandedEventId, setLocalExpandedEventId] = useState<
    string | null
  >(null);
  const expandedEventId =
    expandedItemId !== undefined ? expandedItemId : localExpandedEventId;

  const playerId = gameState.playerActorId || "char:player";
  const recentEvents = useMemo(
    () =>
      events
        ? [...events]
            .filter(
              (event) =>
                !Array.isArray(event.knownBy) ||
                event.knownBy.includes(playerId),
            )
            .reverse()
            .slice(0, 5)
        : [],
    [events, playerId],
  );

  return (
    <div className="space-y-2">
      <SidebarPanelHeader
        title={t("timeline.title") || "Timeline Events"}
        icon={
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        }
        count={events?.length || 0}
        isOpen={expanded}
        onToggle={() => setExpanded((prev) => !prev)}
        themeFont={themeFont}
      />

      {expanded ? (
        <div className="space-y-2 animate-sidebar-expand">
          {recentEvents.length === 0 ? (
            <div className="text-xs text-theme-text-secondary italic pl-1">
              {t("worldInfo.noEvents") || "No recent events recorded."}
            </div>
          ) : (
            recentEvents.map((event) => (
              <TimelineEventRow
                key={event.id}
                event={event}
                gameState={gameState}
                isExpanded={expandedEventId === event.id}
                onToggle={() => {
                  const next = expandedEventId === event.id ? null : event.id;
                  if (onExpandItem) {
                    onExpandItem(next);
                    return;
                  }
                  setLocalExpandedEventId(next);
                }}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

export const TimelineEventsPanel = React.memo(TimelineEventsPanelComponent);
