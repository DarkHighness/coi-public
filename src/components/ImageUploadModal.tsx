import React, { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (imageBlob: Blob) => void;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }
    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleConfirm = useCallback(() => {
    if (selectedImage) {
      onConfirm(selectedImage);
      onClose();
    }
  }, [selectedImage, onConfirm, onClose]);

  const handleClear = useCallback(() => {
    setSelectedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-slide-in">
        {/* Header */}
        <div className="p-6 border-b border-theme-border flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-theme-primary uppercase tracking-wider">
              {t("imageUpload.title")}
            </h2>
            <p className="text-sm text-theme-muted mt-1">
              {t("imageUpload.subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-theme-muted hover:text-theme-text transition-colors rounded-full hover:bg-theme-surface-highlight"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative w-full h-64 border-2 border-dashed rounded-xl cursor-pointer
              transition-all duration-300 flex flex-col items-center justify-center gap-4
              ${
                isDragging
                  ? "border-theme-primary bg-theme-primary/10 scale-105"
                  : "border-theme-border hover:border-theme-primary/50 bg-theme-surface-highlight/30"
              }
              ${previewUrl ? "border-solid" : ""}
            `}
          >
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt={t("common.preview")}
                  className="absolute inset-0 w-full h-full object-contain rounded-xl"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {t("imageUpload.clickToChange")}
                  </span>
                </div>
              </>
            ) : (
              <>
                <svg
                  className={`w-16 h-16 transition-colors ${isDragging ? "text-theme-primary" : "text-theme-muted"}`}
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
                <div className="text-center">
                  <p className="text-theme-text font-medium">
                    {t("imageUpload.dropHere")}
                  </p>
                  <p className="text-theme-muted text-sm mt-1">
                    {t("imageUpload.orClick")}
                  </p>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Info Box */}
          <div className="mt-4 p-4 bg-theme-bg/50 rounded-lg border border-theme-border/50">
            <p className="text-xs text-theme-muted leading-relaxed">
              <strong className="text-theme-primary">{t("tip")}:</strong>{" "}
              {t("imageUpload.tips")}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-theme-border flex gap-3">
          {selectedImage && (
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-theme-border text-theme-muted hover:text-theme-text hover:border-theme-muted transition-all rounded-lg"
            >
              {t("clear")}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-theme-border text-theme-text hover:bg-theme-surface-highlight transition-all rounded-lg"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedImage}
            className={`
              flex-1 px-4 py-3 font-bold transition-all rounded-lg shadow-lg
              ${
                selectedImage
                  ? "bg-theme-primary text-theme-bg hover:bg-theme-primary-hover"
                  : "bg-theme-muted/20 text-theme-muted cursor-not-allowed"
              }
            `}
          >
            {t("imageUpload.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};
