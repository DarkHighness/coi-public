import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SavePresetProfile } from "../types";
import {
  DEFAULT_SAVE_PRESET_PROFILE,
  normalizeSavePresetProfile,
} from "../services/ai/utils";
import { PresetProfileFields } from "./PresetProfileFields";

interface PresetProfileModalProps {
  isOpen: boolean;
  initialProfile?: SavePresetProfile;
  onClose: () => void;
  onConfirm: (profile: SavePresetProfile) => void;
}

export const PresetProfileModal: React.FC<PresetProfileModalProps> = ({
  isOpen,
  initialProfile,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<SavePresetProfile>(
    normalizeSavePresetProfile(initialProfile ?? DEFAULT_SAVE_PRESET_PROFILE),
  );

  useEffect(() => {
    if (!isOpen) return;
    setDraft(
      normalizeSavePresetProfile(initialProfile ?? DEFAULT_SAVE_PRESET_PROFILE),
    );
  }, [isOpen, initialProfile]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center ui-overlay backdrop-blur-sm animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="bg-theme-surface border border-theme-divider/60 rounded-xl shadow-lg w-full max-w-2xl overflow-hidden flex flex-col animate-slide-in-up max-h-[90dvh]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6 border-b border-theme-divider/60">
          <h2 className="text-xl font-bold text-theme-primary uppercase tracking-wider">
            {t("presetProfile.modal.title")}
          </h2>
          <p className="text-sm text-theme-text-secondary mt-1 leading-relaxed">
            {t("presetProfile.modal.subtitle")}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <PresetProfileFields value={draft} onChange={setDraft} />
        </div>

        <div className="p-6 border-t border-theme-divider/60 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-theme-divider/60 text-theme-text hover:bg-theme-surface-highlight transition-all rounded-lg"
          >
            {t("cancel")}
          </button>
          <button
            onClick={() => onConfirm(normalizeSavePresetProfile(draft))}
            className="flex-1 px-4 py-3 bg-theme-primary text-theme-bg font-bold hover:bg-theme-primary-hover transition-all rounded-lg"
          >
            {t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};
