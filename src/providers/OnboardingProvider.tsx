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
import { useIsMobile } from "@/hooks/common/useIsMobile";
import type { CountryConfig } from "@/config/countries";
import {
  buildOnboardingSteps,
  isSidebarStep,
  type OnboardingStep,
} from "@/lib/onboarding/steps";
import {
  beginTour,
  currentStep as stepAt,
  finishTour,
  goBack,
  goNext,
  IDLE_TOUR,
  isTourActive,
  startBanner,
  type TourState,
} from "@/lib/onboarding/tour";
import {
  completeOnboarding,
  getOnboardingStatus,
} from "@/app/actions/reseller/onboarding/onboarding";
import en from "@/messages/en/onboarding.json";
import es from "@/messages/es/onboarding.json";
import pt from "@/messages/pt/onboarding.json";
import fr from "@/messages/fr/onboarding.json";
import ar from "@/messages/ar/onboarding.json";

const MESSAGES: Record<string, any> = { en, es, pt, fr, ar };

/** The tour is on by default; set NEXT_PUBLIC_ONBOARDING_TOUR=false to disable. */
const TOUR_ENABLED = process.env.NEXT_PUBLIC_ONBOARDING_TOUR !== "false";

/** Settle time after the status resolves and the first anchor mounts, so the
 *  banner does not flash over a half-painted dashboard. */
const START_DELAY_MS = 900;

/** How long each step stays up before the tour moves on by itself. The
 *  overlay pauses this while the reseller reads, so it is a ceiling, not a
 *  countdown they must beat. */
const AUTO_ADVANCE_MS = 14000;

interface OnboardingContextValue {
  active: boolean;
  /** Restart the tour from the settings "Show me around" control. */
  replay: () => void;
  /**
   * True while the tour needs the dashboard's mobile sidebar drawer open — it
   * is spotlighting a nav item, which only exists inside that drawer. The
   * dashboard layout uses this to drive `isMobileMenuOpen`; it is always
   * `false` on desktop, where the sidebar is permanently visible.
   */
  tourWantsSidebar: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  active: false,
  replay: () => {},
  tourWantsSidebar: false,
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
  const isMobile = useIsMobile();

  const [status, setStatus] = useState<{
    reseller_id: string;
    completed_at: string | null;
  } | null>(null);
  const [tour, setTour] = useState<TourState>(IDLE_TOUR);
  const autoStarted = useRef(false);

  const steps: OnboardingStep[] = useMemo(
    () => buildOnboardingSteps(config, countryCode),
    [config, countryCode],
  );

  const sessionKey = status?.reseller_id
    ? `onboarding-tour:${status.reseller_id}`
    : null;

  const refreshStatus = useCallback(async () => {
    const data = await getOnboardingStatus();
    if (data && !data.error) {
      setStatus({
        reseller_id: data.reseller_id,
        completed_at: data.completed_at,
      });
    }
    return data;
  }, []);

  // Load status once on mount.
  useEffect(() => {
    if (!TOUR_ENABLED) return;
    void refreshStatus();
  }, [refreshStatus]);

  // Auto-open the banner once per session, after the status resolves, while
  // the tour has not been finished or skipped. The dashboard is already on
  // screen by now (this runs in an effect, after paint), so the page shows
  // first and the banner slides in over it.
  useEffect(() => {
    if (!TOUR_ENABLED || autoStarted.current || !status || !sessionKey) return;
    if (status.completed_at) return;
    if (sessionStorage.getItem(`${sessionKey}:seen`) === "1") return;
    if (steps.length === 0) return;

    autoStarted.current = true;
    const timer = setTimeout(() => {
      sessionStorage.setItem(`${sessionKey}:seen`, "1");
      setTour(startBanner(steps.length));
    }, START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, sessionKey, steps]);

  // Keep the spotlight on the page that owns the current step. Navigation is
  // driven by the tour's own Next/Back (and its auto-advance), never by a page
  // click.
  const step = stepAt(steps, tour);
  useEffect(() => {
    if (!TOUR_ENABLED || tour.phase !== "running" || !step) return;
    if (step.path && pathname !== step.path) router.push(step.path);
  }, [tour.phase, tour.index, step, pathname, router]);

  // On phones the sidebar is an off-canvas drawer: a nav step points at an item
  // inside it, so the tour has to open the drawer or the spotlight lands on an
  // off-screen element. On desktop the sidebar is always visible, so this stays
  // false and the layout keeps ignoring it.
  const tourWantsSidebar =
    isMobile && tour.phase === "running" && isSidebarStep(step);

  const rect = useTourAnchor(
    tour.phase === "running" ? step?.anchor ?? null : null,
    tourWantsSidebar,
  );

  // The banner spotlights the sidebar instead of a step anchor.
  const welcomeRect = useTourAnchor(tour.phase === "banner" ? "welcome" : null);

  // The running card waits until we are actually on the step's page, so it
  // never flashes the "another page" copy during a Next/Back navigation.
  const onStepPage =
    tour.phase !== "running" || !step?.path || pathname === step.path;

  const onStart = useCallback(() => setTour((s) => beginTour(s)), []);
  const onNext = useCallback(
    () => setTour((s) => goNext(steps.length, s)),
    [steps.length],
  );
  const onBack = useCallback(() => setTour((s) => goBack(s)), []);

  // Skip and the X both end the tour for good: the tour is a one-time
  // walkthrough, so once it is seen (or skipped) it never opens on its own
  // again. It stays replayable from Settings.
  const endTour = useCallback(() => {
    setTour((s) => finishTour(s));
    if (sessionKey) sessionStorage.setItem(`${sessionKey}:seen`, "1");
    void completeOnboarding().finally(() => router.refresh());
  }, [router, sessionKey]);

  const replay = useCallback(() => {
    if (!TOUR_ENABLED || steps.length === 0) return;
    if (sessionKey) sessionStorage.removeItem(`${sessionKey}:seen`);
    autoStarted.current = true;
    setTour(beginTour(startBanner(steps.length)));
  }, [steps.length, sessionKey]);

  const ctxValue = useMemo<OnboardingContextValue>(
    () => ({ active: isTourActive(tour), replay, tourWantsSidebar }),
    [tour, replay, tourWantsSidebar],
  );

  const stepIndex = tour.phase === "running" ? tour.index + 1 : 0;

  // While a Next/Back is mid-navigation the dim stays up but the card is held
  // back a beat, so it never flashes over the page we are leaving.
  const waiting = tour.phase === "running" && !onStepPage;

  return (
    <OnboardingContext.Provider value={ctxValue}>
      {children}
      {TOUR_ENABLED && (
        <TourOverlay
          phase={tour.phase}
          waiting={waiting}
          step={step}
          rect={rect}
          welcomeRect={welcomeRect}
          stepIndex={stepIndex}
          stepCount={steps.length}
          autoAdvanceMs={AUTO_ADVANCE_MS}
          t={t?.tour}
          onStart={onStart}
          onNext={onNext}
          onBack={onBack}
          onSkip={endTour}
          onExit={endTour}
          onDone={endTour}
        />
      )}
    </OnboardingContext.Provider>
  );
}
