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
 * Polls briefly while the target is not yet mounted (a page may render the
 * anchor a frame or two after navigation), then settles onto scroll/resize
 * listeners. Returns null when no such element exists.
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
      schedule();
      // Scroll the anchor into view so the spotlight is visible on entry.
      try {
        found.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch {
        /* jsdom / older engines: ignore */
      }
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
      // Poll until the anchor mounts, then stop.
      pollTimer = setInterval(() => {
        const found = find();
        if (found) {
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = null;
          attach(found);
        }
      }, 200);
    }

    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(raf);
      if (pollTimer) clearInterval(pollTimer);
      if (ro) ro.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [anchor]);

  return rect;
}
