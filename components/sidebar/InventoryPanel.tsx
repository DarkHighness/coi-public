import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { InventoryItem } from "../InventoryItem";
import { LANG_MAP } from "../../utils/constants";

import { InventoryItem as InventoryItemType } from "../../types";

interface InventoryPanelProps {
  inventory: InventoryItemType[];
  themeFont: string;
  itemContext: string;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
  inventory = [],
  themeFont,
  itemContext,
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);

  const safeInventory = Array.isArray(inventory) ? inventory : [];

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left text-theme-primary uppercase text-xs font-bold tracking-widest mb-4 flex items-center justify-between group ${themeFont}`}
      >
        <span className="flex items-center">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            ></path>
          </svg>
          {t("inventory")}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-theme-muted bg-theme-surface-highlight px-1.5 rounded border border-theme-border">
            {safeInventory.length}
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </div>
      </button>

      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="space-y-2">
          {safeInventory.length === 0 ? (
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border rounded text-center opacity-50">
              {t("emptyInventory")}
            </p>
          ) : (
            safeInventory.map((item) => (
              <InventoryItem
                key={item.id}
                item={item}
                language={LANG_MAP[i18n.language as "en" | "zh"]}
                context={itemContext}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
