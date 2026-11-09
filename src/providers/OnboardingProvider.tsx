// src/providers/OnboardingProvider.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import TourOverlay from "@/components/onboarding/TourOverlay";
import { useTourAnchor } from "@/components/onboarding/useTourAnchor";
import type { CountryConfig } from "@/config/countries";
import {
  buildOnboardingSteps,
  isOnboardingComplete,
  type OnboardingSignals,
  type OnboardingStep,
} from "@/lib/onboarding/steps";
import {
  advance,
  beginCelebration,
  IDLE_TOUR,
  isTourActive,
  reconcile,
  startTour,
  stepByKey,
  type TourState,
} from "@/lib/onboarding/tour";
import {
  completeOnboarding,
  dismissOnboarding,
  getOnboardingStatus,
  markStorefrontVisited,
} from "@/app/actions/reseller/onboarding/onboarding";
import en from "@/messages/en/onboarding.json";
import es from "@/messages/es/onboarding.json";
import pt from "@/messages/pt/onboarding.json";
import fr from "@/messages/fr/onboarding.json";
import ar from "@/messages/ar/onboarding.json";

const MESSAGES: Record<string, any> = { en, es, pt, fr, ar };

/** The tour is on by default; set NEXT_PUBLIC_ONBOARDING_TOUR=false to disable. */
const TOUR_ENABLED = process.env.NEXT_PUBLIC_ONBOARDING_TOUR !== "false";

/** How long the "nice — done!" beat shows before moving on. */
const CELEBRATION_MS = 1100;

interface OnboardingContextValue {
  active: boolean;
  /** Restart the tour from the settings "Show me around" control. */
  replay: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  active: false,
  replay: () => {},
});

/** Hook for the replay control; safe outside a provider (no-op). */
export function useOnboarding(): OnboardingContextValue {
  return useContext(OnboardingContext);
}

interface OnboardingProviderProps {
  countryCode: string;
  config: CountryConfig;
  children: React.ReactNode;
}

export default function OnboardingProvider({
  countryCode,
  config,
  children,
}: OnboardingProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = MESSAGES[config.language?.code] ?? en;

  const [status, setStatus] = useState<{
    reseller_id: string;
    store_slug: string | null;
    completed_at: string | null;
    signals: OnboardingSignals;
  } | null>(null);
  const [tour, setTour] = useState<TourState>(IDLE_TOUR);
  // Replay ("show me around") walks every applicable step even when its real
  // signal is already set, so a finished reseller can see the whole tour again.
  const [forced, setForced] = useState(false);
  const autoStarted = useRef(false);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps: OnboardingStep[] = useMemo(() => {
    if (!status) return [];
    return buildOnboardingSteps(
      config,
      countryCode,
      status.store_slug,
      status.signals,
    );
  }, [status, config, countryCode]);

  // What the state machine walks. Identical to `steps` except during a forced
  // replay, when every step is presented as pending.
  const tourSteps: OnboardingStep[] = useMemo(
    () => (forced ? steps.map((s) => ({ ...s, done: false })) : steps),
    [forced, steps],
  );

  const sessionKey = status?.reseller_id
    ? `onboarding-tour:${status.reseller_id}`
    : null;

  const refreshStatus = useCallback(async () => {
    const data = await getOnboardingStatus();
    if (data && !data.error) {
      setStatus({
        reseller_id: data.reseller_id,
        store_slug: data.store_slug,
        completed_at: data.completed_at,
        signals: data.signals,
      });
    }
    return data;
  }, []);

  // Load status once on mount.
  useEffect(() => {
    if (!TOUR_ENABLED) return;
    void refreshStatus();
  }, [refreshStatus]);

  // Auto-start once per session while the guide is unfinished and the
  // reseller has not already exited it this session.
  useEffect(() => {
    if (!TOUR_ENABLED || autoStarted.current || !status || !sessionKey) return;
    if (status.completed_at) return;
    if (sessionStorage.getItem(`${sessionKey}:seen`) === "1") return;
    if (sessionStorage.getItem(`${sessionKey}:exited`) === "1") return;
    if (isOnboardingComplete(steps)) return;

    autoStarted.current = true;
    sessionStorage.setItem(`${sessionKey}:seen`, "1");
    setTour(startTour(steps));
  }, [status, sessionKey, steps]);

  // Reconcile the running tour with fresh signals on each navigation.
  useEffect(() => {
    if (!TOUR_ENABLED || !isTourActive(tour)) return;
    void refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!TOUR_ENABLED) return;
    setTour((prev) => reconcile(tourSteps, prev));
  }, [tourSteps]);

  // Keep the tour on the page that owns the current step.
  const currentStep = stepByKey(tourSteps, tour.current);
  useEffect(() => {
    if (!TOUR_ENABLED || tour.phase !== "running" || !currentStep) return;
    if (currentStep.path && pathname !== currentStep.path) {
      router.push(currentStep.path);
    }
  }, [tour.phase, tour.current, currentStep, pathname, router]);

  // Finish the tour: stamp completion, then refresh so the guide stays gone.
  useEffect(() => {
    if (tour.phase !== "done") return;
    setForced(false);
    void completeOnboarding().finally(() => router.refresh());
  }, [tour.phase, router]);

  const advancePast = useCallback(
    (state: TourState): TourState => {
      const passed = state.current;
      const next = advance(tourSteps, state);
      if (passed === "visit_storefront") {
        void markStorefrontVisited();
      }
      return next;
    },
    [tourSteps],
  );

  const onAnchorClick = useCallback(() => {
    setTour((prev) => (prev.phase === "running" ? beginCelebration(prev) : prev));
  }, []);

  // Drive the celebration beat -> advance.
  useEffect(() => {
    if (tour.phase !== "celebrating") return;
    celebrateTimer.current = setTimeout(
      () => setTour((prev) => advancePast(prev)),
      CELEBRATION_MS,
    );
    return () => {
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    };
  }, [tour.phase, advancePast]);

  const onSkipStep = useCallback(() => {
    setTour((prev) => advancePast(prev));
  }, [advancePast]);

  const onExit = useCallback(() => {
    if (sessionKey) sessionStorage.setItem(`${sessionKey}:exited`, "1");
    setTour(IDLE_TOUR);
    void dismissOnboarding();
  }, [sessionKey]);

  const replay = useCallback(() => {
    if (!TOUR_ENABLED || !status) return;
    if (sessionKey) {
      sessionStorage.removeItem(`${sessionKey}:exited`);
      sessionStorage.removeItem(`${sessionKey}:seen`);
    }
    autoStarted.current = true;
    setForced(true);
    setTour(startTour(steps.map((s) => ({ ...s, done: false }))));
  }, [status, steps, sessionKey]);

  const rect = useTourAnchor(
    tour.phase === "running" ? currentStep?.anchor ?? null : null,
  );

  const stepIndex = currentStep
    ? tourSteps.findIndex((s) => s.key === currentStep.key) + 1
    : 0;

  const ctxValue = useMemo<OnboardingContextValue>(
    () => ({ active: isTourActive(tour), replay }),
    [tour, replay],
  );

  return (
    <OnboardingContext.Provider value={ctxValue}>
      {children}
      {TOUR_ENABLED && (
        <TourOverlay
          phase={tour.phase}
          step={currentStep}
          rect={rect}
          stepIndex={stepIndex}
          stepCount={steps.length}
          t={t?.tour}
          onAnchorClick={onAnchorClick}
          onContinue={onSkipStep}
          onSkipStep={onSkipStep}
          onExit={onExit}
        />
      )}
    </OnboardingContext.Provider>
  );
}
