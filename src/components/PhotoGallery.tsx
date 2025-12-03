import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StoredImage } from "../utils/imageStorage";
import { useImageStorageContext } from "../contexts/ImageStorageContext";
import { SaveSlot } from "../types";

interface PhotoGalleryProps {
  // If provided, only show images from this save
  saveId?: string;
  // If provided, used for filtering by save slot
  saveSlots?: SaveSlot[];
  // Called when an image is clicked
  onImageClick?: (image: StoredImage, url: string) => void;
  // Show filter controls (for StartScreen)
  showFilters?: boolean;
  // Max images to display (0 = unlimited)
  maxImages?: number;
  // Grid columns configuration
  columns?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

interface ImageWithUrl extends StoredImage {
  url: string;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  saveId,
  saveSlots = [],
  onImageClick,
  showFilters = true,
  maxImages = 0,
  columns = { mobile: 2, tablet: 3, desktop: 4 },
}) => {
  const { t } = useTranslation();
  const { getAllImages, getImagesBySaveId, getImage } =
    useImageStorageContext();

  const [images, setImages] = useState<ImageWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSaveId, setSelectedSaveId] = useState<string | "all">(
    saveId || "all",
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );

  // Build save ID to title map
  const saveIdToTitle = useMemo(() => {
    const map = new Map<string, string>();
    saveSlots.forEach((slot) => {
      map.set(slot.id, slot.name);
    });
    return map;
  }, [saveSlots]);

  // Load images
  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      let rawImages: StoredImage[];

      if (saveId) {
        // Fixed to specific save
        rawImages = await getImagesBySaveId(saveId);
      } else if (selectedSaveId !== "all") {
        // Filtered by selected save
        rawImages = await getImagesBySaveId(selectedSaveId);
      } else {
        // All images
        rawImages = await getAllImages();
      }

      // Apply max limit
      if (maxImages > 0 && rawImages.length > maxImages) {
        rawImages = rawImages.slice(0, maxImages);
      }

      // Convert blobs to URLs
      const imagesWithUrls: ImageWithUrl[] = await Promise.all(
        rawImages.map(async (img) => {
          const blob = await getImage(img.id);
          const url = blob ? URL.createObjectURL(blob) : "";
          return { ...img, url };
        }),
      );

      setImages(imagesWithUrls);
    } catch (error) {
      console.error("Failed to load gallery images:", error);
    } finally {
      setLoading(false);
    }
  }, [
    saveId,
    selectedSaveId,
    maxImages,
    getAllImages,
    getImagesBySaveId,
    getImage,
  ]);

  // Initial load and reload on filter change
  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.url) URL.revokeObjectURL(img.url);
      });
    };
  }, [images]);

  // Get unique save IDs from loaded images (for filter dropdown)
  const uniqueSaveIds = useMemo(() => {
    if (saveId) return []; // No filter needed when fixed to single save
    const ids = new Set<string>();
    images.forEach((img) => ids.add(img.saveId));
    return Array.from(ids);
  }, [images, saveId]);

  // Handle image click
  const handleImageClick = (image: ImageWithUrl, index: number) => {
    if (onImageClick) {
      onImageClick(image, image.url);
    } else {
      setSelectedImageIndex(index);
    }
  };

  // Navigate in lightbox
  const navigateLightbox = (direction: "prev" | "next") => {
    if (selectedImageIndex === null) return;

    if (direction === "prev") {
      setSelectedImageIndex(
        selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1,
      );
    } else {
      setSelectedImageIndex(
        selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0,
      );
    }
  };

  // Format timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get title for image
  const getImageTitle = (image: StoredImage) => {
    return (
      image.storyTitle ||
      saveIdToTitle.get(image.saveId) ||
      t("gallery.untitled")
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          className="w-16 h-16 text-theme-muted/30 mb-4"
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
        <p className="text-theme-muted">{t("gallery.empty")}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Filters */}
      {showFilters && !saveId && saveSlots.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm text-theme-muted">
            {t("gallery.filterBySave")}:
          </label>
          <select
            value={selectedSaveId}
            onChange={(e) => setSelectedSaveId(e.target.value)}
            className="px-3 py-1.5 bg-theme-surface border border-theme-border rounded-lg text-sm text-theme-text focus:outline-none focus:border-theme-primary"
          >
            <option value="all">{t("gallery.allSaves")}</option>
            {saveSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Image Grid */}
      <div
        className={`grid gap-3 sm:gap-4`}
        style={{
          gridTemplateColumns: `repeat(${columns.mobile}, minmax(0, 1fr))`,
        }}
      >
        <style>{`
          @media (min-width: 640px) {
            .photo-gallery-grid {
              grid-template-columns: repeat(${columns.tablet}, minmax(0, 1fr)) !important;
            }
          }
          @media (min-width: 1024px) {
            .photo-gallery-grid {
              grid-template-columns: repeat(${columns.desktop}, minmax(0, 1fr)) !important;
            }
          }
        `}</style>
        {images.map((image, index) => (
          <div
            key={image.id}
            className="group relative aspect-square overflow-hidden rounded-lg bg-theme-surface border border-theme-border cursor-pointer hover:border-theme-primary transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            onClick={() => handleImageClick(image, index)}
          >
            {/* Image */}
            <img
              src={image.url}
              alt={image.imagePrompt || "Story image"}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                <p className="text-white text-xs sm:text-sm font-medium line-clamp-1">
                  {getImageTitle(image)}
                </p>
                {image.location && (
                  <p className="text-white/70 text-[10px] sm:text-xs line-clamp-1 mt-0.5">
                    📍 {image.location}
                  </p>
                )}
                <p className="text-white/60 text-[10px] mt-1">
                  {formatDate(image.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setSelectedImageIndex(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white transition-colors"
            onClick={() => setSelectedImageIndex(null)}
          >
            <svg
              className="w-8 h-8"
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

          {/* Navigation - Previous */}
          <button
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigateLightbox("prev");
            }}
          >
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Navigation - Next */}
          <button
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigateLightbox("next");
            }}
          >
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Image */}
          <div
            className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[selectedImageIndex].url}
              alt={images[selectedImageIndex].imagePrompt || "Story image"}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
            />

            {/* Image info */}
            <div className="mt-4 text-center max-w-lg px-4">
              <h3 className="text-white font-medium text-lg">
                {getImageTitle(images[selectedImageIndex])}
              </h3>
              {images[selectedImageIndex].location && (
                <p className="text-white/70 text-sm mt-1">
                  📍 {images[selectedImageIndex].location}
                </p>
              )}
              {images[selectedImageIndex].storyTime && (
                <p className="text-white/60 text-sm mt-1">
                  🕐 {images[selectedImageIndex].storyTime}
                </p>
              )}
              {images[selectedImageIndex].imagePrompt && (
                <p className="text-white/50 text-xs mt-2 line-clamp-3">
                  {images[selectedImageIndex].imagePrompt}
                </p>
              )}
              <p className="text-white/40 text-xs mt-2">
                {formatDate(images[selectedImageIndex].timestamp)}
              </p>
              <p className="text-white/30 text-xs mt-1">
                {selectedImageIndex + 1} / {images.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
