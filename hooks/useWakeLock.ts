import { useEffect, useRef, useState, useCallback } from "react";

export const useWakeLock = (isActive: boolean) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const requestWakeLock = useCallback(async () => {
    if (!isActive) return;

    try {
      if ("wakeLock" in navigator) {
        const wakeLock = await navigator.wakeLock.request("screen");
        wakeLockRef.current = wakeLock;
        setIsLocked(true);

        wakeLock.addEventListener("release", () => {
          setIsLocked(false);
          wakeLockRef.current = null;
        });
      }
    } catch (err) {
      console.warn("Wake Lock request failed:", err);
    }
  }, [isActive]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsLocked(false);
      } catch (err) {
        console.warn("Wake Lock release failed:", err);
      }
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [isActive, requestWakeLock, releaseWakeLock]);

  // Re-acquire lock if visibility changes (e.g. user switches tabs and comes back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isActive) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isActive, requestWakeLock]);

  return { isLocked };
};
