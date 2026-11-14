// src/lib/utils/deepLink.ts
//
// "Open the app, or install it if it isn't there" — one tap, every platform.
//
//  • Android (Chrome & friends): an `intent://` URL. Chrome opens the app if
//    the package is installed, otherwise it navigates to the
//    `S.browser_fallback_url` extra (the APK / store page). NOTE the `S.`
//    prefix: Android only reads string extras with it, a bare
//    `browser_fallback_url=` is silently ignored.
//  • Android in-app browsers (Facebook, Instagram, TikTok… WebViews) block
//    intent://, so they use the custom scheme + a timer instead.
//  • iOS: custom scheme first; if the page is still in the foreground after
//    the timeout the app is not installed, so we go to the store page.
//  • Desktop: there is no app to open, so we offer the download.

export interface OpenAppOptions {
  /** Custom URL scheme the app registers, e.g. "edges-network". */
  scheme: string;
  /** Optional in-app route, e.g. "deposit" -> edges-network://deposit */
  path?: string;
  /** Android package id (needed for the intent:// link). */
  androidPackage?: string | null;
  /** Where Android goes when the app is missing (APK or Play Store page). */
  androidFallbackUrl?: string | null;
  /** Where iOS goes when the app is missing (App Store / TestFlight page). */
  iosFallbackUrl?: string | null;
  /** Where desktop goes (defaults to the Android fallback). */
  desktopFallbackUrl?: string | null;
  /** How long to wait before concluding the app is not installed. */
  timeoutMs?: number;
}

const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|Snapchat|Twitter|; wv\)/i;

/**
 * Fires the custom scheme and calls `onMissing` only if the page never left
 * the foreground (i.e. nothing handled the link).
 */
function trySchemeThenFallback(
  url: string,
  onMissing: () => void,
  timeoutMs: number,
) {
  const startedAt = Date.now();
  let left = false;

  const markLeft = () => {
    if (document.hidden) left = true;
  };
  const markBlur = () => {
    left = true;
  };
  const cleanup = () => {
    document.removeEventListener("visibilitychange", markLeft);
    window.removeEventListener("pagehide", markBlur);
    window.removeEventListener("blur", markBlur);
  };

  document.addEventListener("visibilitychange", markLeft);
  window.addEventListener("pagehide", markBlur);
  window.addEventListener("blur", markBlur);

  window.setTimeout(() => {
    cleanup();
    // If the timer fired very late the user was away in the app; don't yank
    // them to the store when they come back.
    const tookTooLong = Date.now() - startedAt > timeoutMs + 600;
    if (!left && !tookTooLong && !document.hidden) onMissing();
  }, timeoutMs);

  window.location.href = url;
}

export function openAppOrInstall(opts: OpenAppOptions): void {
  if (typeof window === "undefined") return;

  const {
    scheme,
    androidPackage,
    androidFallbackUrl,
    iosFallbackUrl,
    desktopFallbackUrl,
    timeoutMs = 1600,
  } = opts;
  const path = (opts.path || "").replace(/^\/+/, "");
  const schemeUrl = `${scheme}://${path}`;

  const ua = window.navigator.userAgent || "";
  const isAndroid = /android/i.test(ua);
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as a Mac with touch support.
    (/macintosh/i.test(ua) && window.navigator.maxTouchPoints > 1);

  const go = (url?: string | null) => {
    if (url) window.location.href = url;
  };

  if (isAndroid) {
    if (androidPackage && !IN_APP_BROWSER.test(ua)) {
      const fallback = androidFallbackUrl
        ? `S.browser_fallback_url=${encodeURIComponent(androidFallbackUrl)};`
        : "";
      window.location.href = `intent://${path}#Intent;scheme=${scheme};package=${androidPackage};${fallback}end`;
      return;
    }
    trySchemeThenFallback(schemeUrl, () => go(androidFallbackUrl), timeoutMs);
    return;
  }

  if (isIOS) {
    trySchemeThenFallback(schemeUrl, () => go(iosFallbackUrl), timeoutMs);
    return;
  }

  // Desktop / unknown: nothing to open, so offer the download.
  const url = desktopFallbackUrl || androidFallbackUrl;
  if (url) window.open(url, "_blank", "noopener");
}
