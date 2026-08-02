// src/hooks/useFavicon.ts
"use client";

import { useEffect, useRef } from "react";

export function useFavicon(logoUrl: string | null | undefined, fallbackIcon: string = "/favicon.ico") {
  const previousHrefRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Find existing favicon link
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    
    // Store previous href for restoration
    if (link) {
      previousHrefRef.current = link.getAttribute("href");
    }

    // If logoUrl is provided, use it as favicon
    if (logoUrl) {
      // Create or update the favicon link
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "icon");
        document.head.appendChild(link);
      }
      
      // Use the logo URL as favicon with cache busting
      const cacheBuster = `?v=${Date.now()}`;
      link.setAttribute("href", `${logoUrl}${cacheBuster}`);
    } else {
      // Fallback to default favicon
      if (link) {
        link.setAttribute("href", fallbackIcon);
      }
    }

    // Cleanup: restore previous favicon when component unmounts
    return () => {
      if (typeof window === "undefined") return;
      
      const currentLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (currentLink && previousHrefRef.current) {
        currentLink.setAttribute("href", previousHrefRef.current);
      }
    };
  }, [logoUrl, fallbackIcon]);
}