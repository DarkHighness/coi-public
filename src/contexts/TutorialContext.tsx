import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useSettings } from "../hooks/useSettings";

// Tutorial step definition
export interface TutorialStep {
  id: string;
  targetId?: string; // data-tutorial-id of target element
  title: string;
  content: string;
  icon?: string;
  canSkip: boolean;
  // Action to perform when step becomes active
  onActivate?: () => void;
  // Condition to check if step can proceed
  canProceed?: () => boolean;
  // For steps that require user action
  waitForAction?: boolean;
  // Position of tooltip relative to target
  position?: "top" | "bottom" | "left" | "right" | "center";
}

export interface TutorialFlow {
  id: string;
  name: string;
  steps: TutorialStep[];
}

interface TutorialContextType {
  // Current state
  isActive: boolean;
  currentFlow: TutorialFlow | null;
  currentStepIndex: number;
  currentStep: TutorialStep | null;

  // Target element tracking
  targetElement: HTMLElement | null;
  registerTarget: (id: string, element: HTMLElement | null) => void;
  unregisterTarget: (id: string) => void;

  // Navigation
  startTutorial: (flow: TutorialFlow) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;

  // Step completion
  markStepActionComplete: () => void;
  canSkipCurrentStep: boolean;

  // External triggers (for opening modals, switching tabs, etc.)
  triggerAction: (actionId: string) => void;
  onActionTriggered: (callback: (actionId: string) => void) => () => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export const useTutorialContext = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error(
      "useTutorialContext must be used within a TutorialProvider",
    );
  }
  return context;
};

// Optional hook that doesn't throw if context is missing
export const useTutorialContextOptional = () => {
  return useContext(TutorialContext);
};

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { settings, updateSettings } = useSettings();

  // State
  const [isActive, setIsActive] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<TutorialFlow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepActionComplete, setStepActionComplete] = useState(false);

  // Target element registry
  const targetRegistry = useRef<Map<string, HTMLElement>>(new Map());
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  // Action listeners
  const actionListeners = useRef<Set<(actionId: string) => void>>(new Set());

  // Current step
  const currentStep = currentFlow?.steps[currentStepIndex] ?? null;

  // Check if provider is configured
  const hasValidProvider = () => {
    const providers = settings.providers?.instances || [];
    return providers.some(
      (p) => p.enabled && p.apiKey && p.apiKey.trim() !== "",
    );
  };

  // Check if model is selected
  const hasValidModel = () => {
    return (
      settings.story?.modelId &&
      settings.story.modelId.trim() !== "" &&
      settings.story?.providerId &&
      settings.story.providerId.trim() !== ""
    );
  };

  // Can skip current step
  const canSkipCurrentStep = currentStep?.canSkip ?? true;

  // Register/unregister targets
  const registerTarget = useCallback(
    (id: string, element: HTMLElement | null) => {
      if (element) {
        targetRegistry.current.set(id, element);
        // Update target element if this is the current target
        if (currentStep?.targetId === id) {
          setTargetElement(element);
        }
      }
    },
    [currentStep?.targetId],
  );

  const unregisterTarget = useCallback((id: string) => {
    targetRegistry.current.delete(id);
  }, []);

  // Update target element when step changes - query DOM directly as fallback
  useEffect(() => {
    if (!currentStep?.targetId) {
      setTargetElement(null);
      return;
    }

    const findElement = () => {
      // First check registry
      let element = targetRegistry.current.get(currentStep.targetId!);

      // Fallback: query DOM directly
      if (!element) {
        element = document.querySelector(
          `[data-tutorial-id="${currentStep.targetId}"]`,
        ) as HTMLElement | null;
      }

      return element;
    };

    // Try immediately
    let element = findElement();
    if (element) {
      setTargetElement(element);
      return;
    }

    // Poll for element if not found (it might be in a modal that appears later)
    const pollInterval = setInterval(() => {
      element = findElement();
      if (element) {
        setTargetElement(element);
        clearInterval(pollInterval);
      }
    }, 100);

    // Cleanup after 5 seconds if still not found
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [currentStep?.targetId, currentStepIndex]);

  // Start tutorial
  const startTutorial = useCallback((flow: TutorialFlow) => {
    setCurrentFlow(flow);
    setCurrentStepIndex(0);
    setStepActionComplete(false);
    setIsActive(true);
  }, []);

  // Next step
  const nextStep = useCallback(() => {
    if (!currentFlow) return;

    // Check if we can proceed
    if (currentStep?.waitForAction && !stepActionComplete) {
      return; // Wait for action to complete
    }

    if (currentStep?.canProceed && !currentStep.canProceed()) {
      return; // Condition not met
    }

    if (currentStepIndex < currentFlow.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setStepActionComplete(false);

      // Trigger onActivate for next step
      const nextStepObj = currentFlow.steps[currentStepIndex + 1];
      if (nextStepObj?.onActivate) {
        nextStepObj.onActivate();
      }
    } else {
      // Last step - complete tutorial
      completeTutorial();
    }
  }, [currentFlow, currentStep, currentStepIndex, stepActionComplete]);

  // Previous step
  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setStepActionComplete(false);
    }
  }, [currentStepIndex]);

  // Skip tutorial - always allowed to prevent getting stuck
  const skipTutorial = useCallback(() => {
    // Inline completion logic to avoid dependency issues
    if (currentFlow) {
      if (currentFlow.id === "startScreen") {
        updateSettings({
          extra: {
            ...settings.extra,
            tutorialStartScreenCompleted: true,
          },
        });
      } else if (currentFlow.id === "gamePage") {
        updateSettings({
          extra: {
            ...settings.extra,
            tutorialGamePageCompleted: true,
          },
        });
      }
    }
    setIsActive(false);
    setCurrentFlow(null);
    setCurrentStepIndex(0);
    setStepActionComplete(false);
  }, [currentFlow, settings.extra, updateSettings]);

  // Complete tutorial
  const completeTutorial = useCallback(() => {
    skipTutorial();
  }, [skipTutorial]);

  // Mark step action as complete
  const markStepActionComplete = useCallback(() => {
    setStepActionComplete(true);
  }, []);

  // Trigger action for external components
  const triggerAction = useCallback((actionId: string) => {
    actionListeners.current.forEach((listener) => listener(actionId));
  }, []);

  // Subscribe to action triggers
  const onActionTriggered = useCallback(
    (callback: (actionId: string) => void) => {
      actionListeners.current.add(callback);
      return () => {
        actionListeners.current.delete(callback);
      };
    },
    [],
  );

  const value: TutorialContextType = {
    isActive,
    currentFlow,
    currentStepIndex,
    currentStep,
    targetElement,
    registerTarget,
    unregisterTarget,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
    markStepActionComplete,
    canSkipCurrentStep,
    triggerAction,
    onActionTriggered,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};
