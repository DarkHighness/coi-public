import { useEffect, useRef } from "react";
import { useTutorialContextOptional } from "../contexts/TutorialContext";

/**
 * Hook for components to register as tutorial targets
 *
 * Usage:
 * const ref = useTutorialTarget("settings-button");
 * <button ref={ref} data-tutorial-id="settings-button">...</button>
 */
export const useTutorialTarget = <T extends HTMLElement>(targetId: string) => {
  const ref = useRef<T>(null);
  const tutorial = useTutorialContextOptional();

  useEffect(() => {
    if (ref.current && tutorial) {
      tutorial.registerTarget(targetId, ref.current);
      return () => {
        tutorial.unregisterTarget(targetId);
      };
    }
  }, [targetId, tutorial]);

  return ref;
};
