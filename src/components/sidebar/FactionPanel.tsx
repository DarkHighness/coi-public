import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Faction } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import {
  extractBracketDisplayName,
  resolveEntityDisplayName,
  isSameEntityRef,
} from "../../utils/entityDisplay";
import { MarkdownText } from "../render/MarkdownText";
import { SidebarTag } from "./SidebarTag";
import { SidebarEntityRow } from "./SidebarEntityRow";
import { SidebarField, SidebarSection } from "./SidebarSections";
import { SidebarPanelHeader } from "./SidebarPanelHeader";
import { useOptionalRuntimeContext } from "../../runtime/context";

interface FactionPanelProps {
  factions?: Faction[];
  themeFont: string;
  unlockMode?: boolean;
}

const FactionPanelComponent: React.FC<FactionPanelProps> = ({
  factions = [],
  themeFont,
  unlockMode,
}) => {
  const { t } = useTranslation();
  const runtime = useOptionalRuntimeContext();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedFactionId, setExpandedFactionId] = useState<string | null>(
    null,
  );
  const runtimeGameState = runtime?.state.gameState;

  const resolveFactionTarget = (target: unknown): string => {
    if (typeof target !== "string") {
      return "";
    }
    const raw = target.trim();
    if (!raw) {
      return "";
    }
    const specialDisplayName = extractBracketDisplayName(raw);
    if (specialDisplayName) {
      return specialDisplayName;
    }
    if (runtimeGameState) {
      const resolved = resolveEntityDisplayName(raw, runtimeGameState);
      if (resolved) {
        return resolved;
      }
    }
    const matchedFaction = factions.find(
      (faction) => isSameEntityRef(faction.id, raw) || faction.name === raw,
    );
    return matchedFaction?.name || raw;
  };

  return (
    <div>
      <SidebarPanelHeader
        title={t("worldInfo.factions") || "Factions"}
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"
            />
          </svg>
        }
        count={factions.length}
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
        themeFont={themeFont}
        openMarginClassName="mb-4"
      />

      {isOpen ? (
        <div className="space-y-2 animate-sidebar-expand">
          {factions.length === 0 ? (
            <div className="text-theme-text-secondary text-xs italic py-3 text-center border-t border-theme-divider/60">
              {t("worldInfo.noFactions") ||
                t("worldInfo.empty") ||
                "No factions"}
            </div>
          ) : (
            factions.map((faction) => {
              const isExpanded = expandedFactionId === faction.id;
              return (
                <SidebarEntityRow
                  key={faction.id}
                  title={faction.name}
                  icon={getValidIcon(faction.icon, "⚔️")}
                  tags={
                    <>
                      {faction.visible?.influence ? (
                        <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
                          {faction.visible.influence}
                        </SidebarTag>
                      ) : null}
                      {faction.unlocked || unlockMode ? (
                        <SidebarTag className="text-theme-primary border-theme-primary/60">
                          {t("unlocked") || "Unlocked"}
                        </SidebarTag>
                      ) : null}
                    </>
                  }
                  summary={faction.visible?.agenda || ""}
                  isExpanded={isExpanded}
                  onToggle={() =>
                    setExpandedFactionId((prev) =>
                      prev === faction.id ? null : faction.id,
                    )
                  }
                  accentClassName={
                    isExpanded
                      ? "border-l-theme-primary/70"
                      : "border-l-theme-divider/70"
                  }
                >
                  <div className="pl-2 pr-1 pb-3 text-xs text-theme-text">
                    <SidebarSection
                      title={t("visible") || "Visible"}
                      withDivider={false}
                    >
                      {faction.visible?.agenda ? (
                        <SidebarField label={t("faction.agenda") || "Agenda"}>
                          <MarkdownText
                            content={faction.visible.agenda}
                            indentSize={2}
                          />
                        </SidebarField>
                      ) : null}

                      {faction.visible?.members?.length ? (
                        <SidebarField label={t("faction.members") || "Members"}>
                          <ul className="space-y-1">
                            {faction.visible.members.map((member, index) => (
                              <li key={`${member.name}-${index}`}>
                                {member.name}
                                {member.title ? ` (${member.title})` : ""}
                              </li>
                            ))}
                          </ul>
                        </SidebarField>
                      ) : null}

                      {faction.visible?.influence ? (
                        <SidebarField
                          label={t("faction.influence") || "Influence"}
                        >
                          {faction.visible.influence}
                        </SidebarField>
                      ) : null}

                      {faction.visible?.relations?.length ? (
                        <SidebarField
                          label={t("faction.relations") || "Relations"}
                        >
                          <div className="space-y-1">
                            {faction.visible.relations.map(
                              (relation, index) => (
                                <div
                                  key={`${relation.target}-${index}`}
                                  className="flex items-start justify-between gap-2"
                                >
                                  <span>
                                    {resolveFactionTarget(relation.target)}
                                  </span>
                                  <span className="text-theme-text-secondary">
                                    {relation.status}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        </SidebarField>
                      ) : null}
                    </SidebarSection>

                    {(faction.unlocked || unlockMode) && faction.hidden ? (
                      <SidebarSection
                        title={t("hidden.truth") || "Hidden"}
                        className="sidebar-hidden-divider"
                      >
                        {faction.hidden.agenda ? (
                          <SidebarField
                            label={t("secretAgenda") || "Secret Agenda"}
                          >
                            <MarkdownText
                              content={faction.hidden.agenda}
                              indentSize={2}
                            />
                          </SidebarField>
                        ) : null}

                        {faction.hidden.members?.length ? (
                          <SidebarField
                            label={t("faction.members") || "Members"}
                          >
                            <ul className="space-y-1">
                              {faction.hidden.members.map((member, index) => (
                                <li key={`${member.name}-${index}`}>
                                  {member.name}
                                  {member.title ? ` (${member.title})` : ""}
                                </li>
                              ))}
                            </ul>
                          </SidebarField>
                        ) : null}

                        {faction.hidden.influence ? (
                          <SidebarField
                            label={t("faction.influence") || "Influence"}
                          >
                            {faction.hidden.influence}
                          </SidebarField>
                        ) : null}

                        {faction.hidden.internalConflict ? (
                          <SidebarField
                            label={
                              t("faction.internalConflict") ||
                              "Internal Conflict"
                            }
                          >
                            <MarkdownText
                              content={faction.hidden.internalConflict}
                              indentSize={2}
                            />
                          </SidebarField>
                        ) : null}

                        {faction.hidden.relations?.length ? (
                          <SidebarField
                            label={t("faction.relations") || "Relations"}
                          >
                            <div className="space-y-1">
                              {faction.hidden.relations.map(
                                (relation, index) => (
                                  <div
                                    key={`${relation.target}-${index}`}
                                    className="flex items-start justify-between gap-2"
                                  >
                                    <span>
                                      {resolveFactionTarget(relation.target)}
                                    </span>
                                    <span className="text-theme-text-secondary">
                                      {relation.status}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </SidebarField>
                        ) : null}

                        {faction.unlockReason ? (
                          <SidebarField
                            label={t("unlockReason") || "Unlock Reason"}
                          >
                            <MarkdownText
                              content={faction.unlockReason}
                              indentSize={2}
                            />
                          </SidebarField>
                        ) : null}
                      </SidebarSection>
                    ) : null}

                    <SidebarSection title={t("meta") || "Meta"}>
                      <SidebarField label={t("id") || "ID"}>
                        {faction.id}
                      </SidebarField>
                    </SidebarSection>
                  </div>
                </SidebarEntityRow>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
};

export const FactionPanel = React.memo(FactionPanelComponent);
