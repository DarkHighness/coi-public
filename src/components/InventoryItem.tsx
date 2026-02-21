import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { InventoryItem as InventoryItemType } from "../types";
import { getValidIcon } from "../utils/emojiValidator";
import { MarkdownText } from "./render/MarkdownText";
import { useOptionalRuntimeContext } from "../runtime/context";
import { SidebarEntityRow } from "./sidebar/SidebarEntityRow";
import { SidebarTag } from "./sidebar/SidebarTag";
import { SidebarField, SidebarSection } from "./sidebar/SidebarSections";
import { pickFirstText } from "./sidebar/panelText";

interface InventoryItemProps {
  item: InventoryItemType;
  language: string;
  context: string;
  isPinned?: boolean;
  onPin?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isEditMode?: boolean;
  isDragging?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (id: string | number) => void;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({
  item,
  language: _language,
  context: _context,
  isPinned,
  onPin,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  isEditMode,
  isDragging,
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const engine = useOptionalRuntimeContext();
  const clearHighlight = engine?.actions.clearHighlight;
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const [isHighlight, setIsHighlight] = useState(item.highlight || false);
  const open = isExpanded !== undefined ? isExpanded : localIsOpen;

  useEffect(() => {
    if (item.highlight) {
      setIsHighlight(true);
      const timer = setTimeout(() => {
        setIsHighlight(false);
        clearHighlight?.({ kind: "inventory", id: item.id });
      }, 3000);
      return () => clearTimeout(timer);
    }
    setIsHighlight(false);
  }, [clearHighlight, item.highlight, item.id]);

  const handleToggle = () => {
    if (isEditMode) {
      return;
    }
    if (onToggleExpand) {
      onToggleExpand(item.id);
    } else {
      setLocalIsOpen((prev) => !prev);
    }
    if (isHighlight || item.highlight) {
      setIsHighlight(false);
      clearHighlight?.({ kind: "inventory", id: item.id });
    }
  };

  return (
    <div
      className={`relative ${isDragging ? "opacity-60" : "opacity-100"} ${
        isHighlight ? "ring-1 ring-theme-primary/40" : ""
      }`}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDrop={onDrop}
      draggable={Boolean(isEditMode)}
      onDragStart={isEditMode && onDragStart ? onDragStart : undefined}
    >
      {isEditMode && onPin ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          className={`absolute right-8 top-2 z-10 p-1 rounded transition-colors ${
            isPinned
              ? "text-theme-primary"
              : "text-theme-text-secondary hover:text-theme-primary"
          }`}
          title={isPinned ? t("unpin") || "Unpin" : t("pin") || "Pin"}
        >
          <svg
            className="w-3.5 h-3.5"
            fill={isPinned ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            ></path>
          </svg>
        </button>
      ) : null}

      <SidebarEntityRow
        title={item.name}
        icon={getValidIcon(item.icon, "📦")}
        tags={
          <>
            {item.visible?.condition ? (
              <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
                {item.visible.condition}
              </SidebarTag>
            ) : null}
            {item.visible?.usage ? (
              <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
                {t("usage") || "Usage"}
              </SidebarTag>
            ) : null}
            {item.unlocked ? (
              <SidebarTag className="text-theme-primary border-theme-primary/60">
                {t("unlocked") || "Unlocked"}
              </SidebarTag>
            ) : null}
          </>
        }
        summary={pickFirstText(
          item.visible?.description,
          item.visible?.usage,
          item.visible?.observation,
          item.hidden?.truth,
        )}
        isExpanded={open}
        onToggle={handleToggle}
        accentClassName={
          open ? "border-l-theme-primary/70" : "border-l-theme-divider/70"
        }
      >
        <div className="pl-2 pr-1 pb-3 text-xs text-theme-text">
          <SidebarSection title={t("visible") || "Visible"} withDivider={false}>
            <SidebarField label={t("description") || "Description"}>
              {item.visible?.description ? (
                <MarkdownText
                  content={item.visible.description}
                  indentSize={2}
                />
              ) : (
                <span className="text-theme-text-secondary">
                  {t("noDescription") || "No description available."}
                </span>
              )}
            </SidebarField>

            {item.visible?.usage ? (
              <SidebarField
                label={t("sidebar.inventory.usage") || t("usage") || "Usage"}
              >
                <MarkdownText content={item.visible.usage} indentSize={2} />
              </SidebarField>
            ) : null}

            {item.visible?.observation ? (
              <SidebarField
                label={t("sidebar.inventory.observation") || "Observation"}
              >
                <MarkdownText
                  content={item.visible.observation}
                  indentSize={2}
                />
              </SidebarField>
            ) : null}

            {item.visible?.condition ? (
              <SidebarField
                label={t("sidebar.inventory.condition") || "Condition"}
              >
                {item.visible.condition}
              </SidebarField>
            ) : null}

            {item.visible?.sensory ? (
              <SidebarField label={t("sidebar.inventory.sensory") || "Sensory"}>
                <div className="space-y-1 text-theme-text-secondary">
                  {item.visible.sensory.texture ? (
                    <div>
                      {t("sidebar.inventory.texture") || "Texture"}:{" "}
                      {item.visible.sensory.texture}
                    </div>
                  ) : null}
                  {item.visible.sensory.weight ? (
                    <div>
                      {t("sidebar.inventory.weight") || "Weight"}:{" "}
                      {item.visible.sensory.weight}
                    </div>
                  ) : null}
                  {item.visible.sensory.smell ? (
                    <div>
                      {t("sidebar.inventory.smell") || "Smell"}:{" "}
                      {item.visible.sensory.smell}
                    </div>
                  ) : null}
                </div>
              </SidebarField>
            ) : null}
          </SidebarSection>

          {item.unlocked &&
          (item.hidden?.truth || item.hidden?.secrets?.length) ? (
            <SidebarSection
              title={t("hidden.truth") || "Hidden"}
              className="sidebar-hidden-divider"
            >
              {item.hidden?.truth ? (
                <SidebarField label={t("hidden.truth") || "Truth"}>
                  <MarkdownText content={item.hidden.truth} indentSize={2} />
                </SidebarField>
              ) : null}

              {item.hidden?.secrets?.length ? (
                <SidebarField label={t("hidden.secrets") || "Secrets"}>
                  <ul className="list-disc list-inside space-y-1">
                    {item.hidden.secrets.map((secret, index) => (
                      <li key={`${secret}-${index}`}>
                        <MarkdownText content={secret} indentSize={2} inline />
                      </li>
                    ))}
                  </ul>
                </SidebarField>
              ) : null}

              {item.unlockReason ? (
                <SidebarField label={t("unlockReason") || "Unlock Reason"}>
                  <MarkdownText content={item.unlockReason} indentSize={2} />
                </SidebarField>
              ) : null}
            </SidebarSection>
          ) : null}

          <SidebarSection title={t("meta") || "Meta"}>
            {item.lore ? (
              <SidebarField label={t("history") || "History"}>
                <MarkdownText content={item.lore} indentSize={2} />
              </SidebarField>
            ) : null}
            {item.emotionalWeight ? (
              <SidebarField label={t("emotionalWeight") || "Significance"}>
                <MarkdownText content={item.emotionalWeight} indentSize={2} />
              </SidebarField>
            ) : null}
          </SidebarSection>
        </div>
      </SidebarEntityRow>

      {isEditMode ? (
        <div
          className="cursor-grab active:cursor-grabbing text-theme-text-secondary hover:text-theme-primary p-2 border-l border-theme-divider/60 touch-none absolute right-0 top-0 bottom-0 flex items-center justify-center w-8"
          title={t("dragToReorder") || "Drag to reorder"}
        >
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </div>
      ) : null}
    </div>
  );
};
