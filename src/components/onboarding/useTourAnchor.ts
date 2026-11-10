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
 * Returns null while no such element exists.
 */
export function useTourAnchor(anchor: string | null): AnchorRect | null {
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
      try {
        found.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      } catch {
        /* jsdom / older engines: ignore */
      }
      schedule();

      // A smooth scroll and any lazy layout keep moving the target for a few
      // hundred ms; keep sampling so the spotlight lands on it, not beside it.
      let ticks = 0;
      burstTimer = setInterval(() => {
        schedule();
        if (++ticks >= 16) {
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
  }, [anchor]);

  return rect;
}
