// src/components/onboarding/useTourAnchor.ts
"use client";

import { useEffect, useState } from "react";

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
  /** Viewport-relative bottom/right, for tooltip placement. */
  bottom: number;
  right: number;
}

function measure(el: Element): AnchorRect {
  const r = el.getBoundingClientRect();
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    bottom: r.bottom,
    right: r.right,
  };
}

/** Breathing room kept between a settled anchor and the viewport edge. */
const SETTLE_GAP = 24;

/**
 * Track the on-screen rectangle of the element carrying
 * `data-tour="<anchor>"`. Pages just tag their real button/link; the tour
 * finds it and follows it as the page scrolls or resizes.
 *
 * The anchor is often mounted a frame or two after navigation, and a smooth
 * scroll-into-view keeps moving the element for a while afterwards, so we
 * poll until it appears and then take a short burst of re-measurements to
 * catch the settle. After that we hold still and only re-measure on
 * scroll/resize and DOM resizes.
 *
 * `rearm` is a dependency the caller flips when the anchor is about to move
 * for a reason the hook cannot observe — on phones the mobile sidebar drawer
 * slides open (a transform, which fires no scroll/resize) to reveal the nav
 * item being spotlighted. Bumping it re-runs the attach/scroll/measure cycle
 * so the spotlight tracks the drawer instead of the off-screen element.
 *
 * Returns null while no such element exists.
 */
export function useTourAnchor(
  anchor: string | null,
  rearm: unknown = null,
): AnchorRect | null {
  const [rect, setRect] = useState<AnchorRect | null>(null);

  useEffect(() => {
    if (!anchor) {
      setRect(null);
      return;
    }

    let el: Element | null = null;
    let raf = 0;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let burstTimer: ReturnType<typeof setInterval> | null = null;
    let ro: ResizeObserver | null = null;

    const update = () => {
      if (!el || !el.isConnected) return;
      setRect(measure(el));
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    const attach = (found: Element) => {
      el = found;

      // Settle the target into view. A single scrollIntoView is not enough:
      // Next can restore scroll to the top right after we call it, and a page
      // that lazily expands (a plan list growing its groups) shifts the target
      // out from under a scroll that already ran. So snap it into view, then
      // keep watching: if it drifts out of a comfortable spot, snap again,
      // until it holds still.
      const fitsInView = (r: DOMRect) => r.height <= window.innerHeight - SETTLE_GAP * 2;
      const wellPlaced = (r: DOMRect) =>
        fitsInView(r)
          ? r.top >= SETTLE_GAP && r.bottom <= window.innerHeight - SETTLE_GAP
          : r.top >= -2 && r.top <= SETTLE_GAP;
      const snap = () => {
        if (!el || !el.isConnected) return;
        const r = el.getBoundingClientRect();
        try {
          el.scrollIntoView({
            block: fitsInView(r) ? "center" : "start",
            inline: "nearest",
            behavior: "auto",
          });
        } catch {
          /* jsdom / older engines: ignore */
        }
      };

      snap();
      schedule();

      let stable = 0;
      let lastY = NaN;
      let ticks = 0;
      burstTimer = setInterval(() => {
        if (!el || !el.isConnected) return;
        const placed = wellPlaced(el.getBoundingClientRect());
        if (!placed && ticks < 30) {
          snap();
          stable = 0;
        } else if (Math.abs(window.scrollY - lastY) < 1) {
          stable += 1;
        } else {
          stable = 0;
        }
        lastY = window.scrollY;
        schedule();
        if ((placed && stable >= 2) || ++ticks >= 50) {
          if (burstTimer) clearInterval(burstTimer);
          burstTimer = null;
        }
      }, 80);

      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(schedule);
        ro.observe(found);
      }
    };

    const find = () => document.querySelector(`[data-tour="${anchor}"]`);

    const existing = find();
    if (existing) {
      attach(existing);
    } else {
      // Poll until the anchor mounts, then stop. Give up after ~5s so a step
      // whose target never renders cannot wedge the tour.
      let waited = 0;
      pollTimer = setInterval(() => {
        const found = find();
        if (found) {
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = null;
          attach(found);
        } else if ((waited += 200) >= 5000) {
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = null;
        }
      }, 200);
    }

    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(raf);
      if (pollTimer) clearInterval(pollTimer);
      if (burstTimer) clearInterval(burstTimer);
      if (ro) ro.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [anchor, rearm]);

  return rect;
}
