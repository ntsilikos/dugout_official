"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { TUTORIAL_STEPS } from "./tutorial-steps";
import TutorialOverlay from "./TutorialOverlay";

const COMPLETED_KEY = "dugout_tutorial_completed";

interface TutorialContextValue {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  start: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside <TutorialProvider>");
  return ctx;
}

interface Props {
  children: ReactNode;
  // When true, auto-starts the tutorial on first visit (for new signups)
  autoStart?: boolean;
}

export function TutorialProvider({ children, autoStart = false }: Props) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Auto-start for new users (only if they haven't already completed or dismissed it)
  useEffect(() => {
    if (!autoStart) return;
    if (typeof window === "undefined") return;
    const completed = window.localStorage.getItem(COMPLETED_KEY);
    if (completed) return;
    // Small delay so the page layout has time to render / nav items exist
    const t = setTimeout(() => {
      setCurrentStep(0);
      setIsActive(true);
    }, 800);
    return () => clearTimeout(t);
  }, [autoStart]);

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(COMPLETED_KEY, new Date().toISOString());
    }
  }, []);

  const next = useCallback(() => {
    setCurrentStep((s) => {
      if (s >= TUTORIAL_STEPS.length - 1) {
        // Last step → close
        setIsActive(false);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(COMPLETED_KEY, new Date().toISOString());
        }
        return s;
      }
      return s + 1;
    });
  }, []);

  const prev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const value = useMemo<TutorialContextValue>(
    () => ({
      isActive,
      currentStep,
      totalSteps: TUTORIAL_STEPS.length,
      start,
      stop,
      next,
      prev,
    }),
    [isActive, currentStep, start, stop, next, prev]
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {isActive && <TutorialOverlay />}
    </TutorialContext.Provider>
  );
}
