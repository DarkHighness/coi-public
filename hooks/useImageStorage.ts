import { useState, useEffect } from "react";
import { useImageStorageContext } from "../contexts/ImageStorageContext";

export const useImageStorage = () => {
  return useImageStorageContext();
};

/**
 * Hook to resolve an image ID to a blob URL
 */
export const useImageURL = (imageId: string | undefined) => {
  const { getImage } = useImageStorageContext();
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageId) {
      setUrl(null);
      return;
    }

    let isMounted = true;
    const objectUrls: string[] = [];

    const fetchImage = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await getImage(imageId);
        if (isMounted) {
          if (blob) {
            const objectUrl = URL.createObjectURL(blob);
            objectUrls.push(objectUrl);
            setUrl(objectUrl);
          } else {
            setError("Image not found");
            setUrl(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load image");
          setUrl(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageId, getImage]);

  return { url, isLoading, error };
};
