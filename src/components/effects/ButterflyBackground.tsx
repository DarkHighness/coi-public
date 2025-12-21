import React, { useEffect, useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import { useImageStorageContext } from "../../contexts/ImageStorageContext";

interface Butterfly {
  id: number;
  left: number;
  top: number;
  scale: number;
  rotation: number;
  duration: number;
  delay: number;
  color: string;
}

interface FloatingPhoto {
  id: string;
  imageUrl: string;
  left: number;
  startTop: number; // Starting Y position (above viewport)
  size: number; // Width in pixels
  rotation: number;
  duration: number; // Animation duration
  delay: number;
  blur: number; // Blur amount
  opacity: number;
}

const MAX_PHOTOS = 12; // Maximum photos to display

export const ButterflyBackground: React.FC = () => {
  const { settings } = useSettings();
  const { getAllImages, getImage } = useImageStorageContext();

  const [butterflies, setButterflies] = useState<Butterfly[]>([]);
  const [photos, setPhotos] = useState<FloatingPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());

  const showGalleryBackground = settings?.galleryBackground ?? false;

  // Initialize butterflies
  useEffect(() => {
    const count = 30;
    const newButterflies: Butterfly[] = [];

    for (let i = 0; i < count; i++) {
      newButterflies.push({
        id: i,
        left: Math.random() * 100, // %
        top: Math.random() * 100, // %
        scale: 0.5 + Math.random() * 0.5,
        rotation: Math.random() * 360,
        duration: 15 + Math.random() * 15, // Slower: 15-30s
        delay: Math.random() * -30,
        color: Math.random() > 0.5 ? "#ffd700" : "#ffffff", // Gold or White
      });
    }
    setButterflies(newButterflies);
  }, []);

  // Load gallery images when enabled
  useEffect(() => {
    if (!showGalleryBackground) {
      setPhotos([]);
      // Revoke old object URLs
      photoUrls.forEach((url) => URL.revokeObjectURL(url));
      setPhotoUrls(new Map());
      return;
    }

    const loadPhotos = async () => {
      try {
        const allImages = await getAllImages();
        if (allImages.length === 0) {
          setPhotos([]);
          return;
        }

        // Images are already sorted by timestamp descending from getAllImages
        // Take most recent images, limited to MAX_PHOTOS
        const recentImages = allImages.slice(0, MAX_PHOTOS);

        // Load image blobs and create object URLs
        const newUrls = new Map<string, string>();
        const loadedPhotos: FloatingPhoto[] = [];

        for (const img of recentImages) {
          const blob = await getImage(img.id);
          if (blob) {
            const url = URL.createObjectURL(blob);
            newUrls.set(img.id, url);

            loadedPhotos.push({
              id: img.id,
              imageUrl: url,
              left: 5 + Math.random() * 90, // 5-95% to avoid edges
              startTop: -20 - Math.random() * 30, // Start above viewport
              size: 60 + Math.random() * 60, // 60-120px
              rotation: -15 + Math.random() * 30, // -15 to +15 degrees
              duration: 25 + Math.random() * 20, // 25-45 seconds (slower)
              delay: Math.random() * -20, // Staggered start
              blur: 2 + Math.random() * 2, // 2-4px blur
              opacity: 0.25 + Math.random() * 0.2, // 0.25-0.45 opacity
            });
          }
        }

        // Revoke old URLs before setting new ones
        photoUrls.forEach((url) => URL.revokeObjectURL(url));
        setPhotoUrls(newUrls);
        setPhotos(loadedPhotos);
      } catch (error) {
        console.error("Failed to load gallery photos:", error);
        setPhotos([]);
      }
    };

    loadPhotos();

    // Cleanup on unmount
    return () => {
      photoUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [showGalleryBackground, getAllImages, getImage]);

  // If gallery photos are enabled and available, show them
  const showPhotos = showGalleryBackground && photos.length > 0;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gallery Photos (floating/falling) */}
      {showPhotos &&
        photos.map((photo) => (
          <div
            key={photo.id}
            className="absolute"
            style={{
              left: `${photo.left}%`,
              top: `${photo.startTop}%`,
              width: photo.size,
              height: photo.size,
              transform: `rotate(${photo.rotation}deg)`,
              animation: `photo-fall ${photo.duration}s linear infinite`,
              animationDelay: `${photo.delay}s`,
            }}
          >
            <img
              src={photo.imageUrl}
              alt=""
              className="w-full h-full object-cover rounded-lg shadow-lg"
              style={{
                filter: `blur(${photo.blur}px)`,
                opacity: photo.opacity,
              }}
            />
          </div>
        ))}

      {/* Butterflies (always shown as fallback or alongside photos) */}
      {!showPhotos &&
        butterflies.map((b) => (
          <div
            key={b.id}
            className="absolute"
            style={{
              left: `${b.left}%`,
              top: `${b.top}%`,
              transform: `rotate(${b.rotation}deg) scale(${b.scale})`,
            }}
          >
            <div
              className="butterfly"
              style={{
                position: "relative",
                animation: `butterfly-float ${b.duration}s linear infinite`,
                animationDelay: `${b.delay}s`,
              }}
            >
              <div className="butterfly-wings text-theme-primary/60">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ color: b.color }}
                >
                  {/* Body */}
                  <path
                    d="M12 3v18"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  {/* Wings */}
                  <path
                    d="M12 5c-4-3-8 0-8 5s4 6 8 2c4 4 8-1 8-2s-4-8-8-5zm0 8c-3 1-6 4-5 7s5 2 5-2c0 4 6 3 5-7z"
                    fillOpacity="0.8"
                  />
                </svg>
              </div>
            </div>
          </div>
        ))}

      {/* CSS for photo-fall animation */}
      <style>{`
        @keyframes photo-fall {
          0% {
            transform: translateY(0) rotate(var(--rotation, 0deg));
            opacity: var(--opacity, 0.3);
          }
          10% {
            opacity: var(--opacity, 0.3);
          }
          90% {
            opacity: var(--opacity, 0.3);
          }
          100% {
            transform: translateY(140vh) rotate(calc(var(--rotation, 0deg) + 10deg));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
