import React, { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { SaveSlot } from "../types";

// Lazy load PhotoGallery for code splitting
const PhotoGallery = React.lazy(() => import("./PhotoGallery"));

interface PhotoGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  // For StartScreen: show all images with filtering
  saveSlots?: SaveSlot[];
  // For GamePage: filter to single save
  currentSaveId?: string;
  currentSaveTitle?: string;
}

export const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({
  isOpen,
  onClose,
  saveSlots = [],
  currentSaveId,
  currentSaveTitle,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-md animate-fade-in">
      {/* Modal Container */}
      <div className="bg-theme-surface border border-theme-border rounded-lg w-full max-w-5xl max-h-[90vh] mx-4 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-theme-border flex justify-between items-center bg-gradient-to-r from-theme-surface-highlight/50 to-theme-surface-highlight/30 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-theme-primary flex items-center gap-2">
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {t("gallery.title")}
            </h2>
            {currentSaveTitle && (
              <p className="text-xs sm:text-sm text-theme-muted mt-1">
                {currentSaveTitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-surface-highlight rounded-full transition-colors"
            aria-label={t("close")}
          >
            <svg
              className="w-6 h-6 text-theme-muted hover:text-theme-text"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <PhotoGallery
              saveId={currentSaveId}
              saveSlots={saveSlots}
              showFilters={!currentSaveId}
              columns={{ mobile: 2, tablet: 3, desktop: 4 }}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default PhotoGalleryModal;
