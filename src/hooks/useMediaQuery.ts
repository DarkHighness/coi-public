import { useState, useEffect } from "react";

/**
 * Custom hook that tracks if a media query matches
 * @param query CSS media query string, e.g. '(max-width: 767px)'
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Set initial state
    setMatches(mediaQueryList.matches);

    mediaQueryList.addEventListener("change", handler);
    return () => mediaQueryList.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/**
 * Hook that returns true if the viewport is mobile-sized (< 768px, Tailwind md breakpoint)
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
