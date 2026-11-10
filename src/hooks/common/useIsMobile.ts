// src/hooks/common/useIsMobile.ts
"use client";

import { useEffect, useState } from "react";

/**
 * Whether the viewport is phone-width, matching the dashboard's own
 * `max-width: 767px` breakpoint (below which the sidebar becomes an off-canvas
 * drawer). Starts `false` on the server and the first client render so the
 * markup hydrates identically, then corrects on mount.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
