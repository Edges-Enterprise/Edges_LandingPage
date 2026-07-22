// src/proxy.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// IP detection cache
const ipCache = new Map<string, { country: string; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function detectCountryFromIP(ip: string): Promise<string> {
  // Check cache first
  const cached = ipCache.get(ip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.country;
  }

  try {
    // Use ip-api.com free tier - fast and reliable
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,countryCode`,
      {
        signal: AbortSignal.timeout(3000),
      },
    );

    if (!response.ok) throw new Error("IP lookup failed");

    const data = await response.json();

    if (data.status === "success") {
      const countryCode = data.countryCode?.toLowerCase() || "ng";

      // Cache the result
      ipCache.set(ip, { country: countryCode, timestamp: Date.now() });

      return countryCode;
    }

    return "ng";
  } catch (error) {
    console.error("IP detection failed:", error);
    return "ng"; // Default to Nigeria
  }
}

// Helper to get client IP from request
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",");
    const clientIP = ips[0]?.trim();
    if (clientIP) return clientIP;
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;

  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  if (cfConnectingIP) return cfConnectingIP;

  const trueClientIP = request.headers.get("true-client-ip");
  if (trueClientIP) return trueClientIP;

  return "127.0.0.1";
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Skip API routes, static files, etc.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return response;
  }

  // Detect country for root and reseller routes
  const shouldDetectCountry =
    pathname === "/" ||
    pathname === "/reseller" ||
    pathname.startsWith("/reseller/");

  let detectedCountry = "ng";

  if (shouldDetectCountry) {
    const ip = getClientIP(request);
    const savedCountry = request.cookies.get("edges-country")?.value;

    if (
      savedCountry &&
      ["ng", "gh", "zm", "eg", "ma", "cd", "cm", "tg"].includes(savedCountry)
    ) {
      detectedCountry = savedCountry;
    } else {
      if (process.env.NODE_ENV === "development") {
        const testCountry = request.headers.get("x-test-country");
        if (
          testCountry &&
          ["ng", "gh", "zm", "eg", "ma", "cd", "cm", "tg"].includes(testCountry)
        ) {
          detectedCountry = testCountry;
          response.cookies.set("edges-country", detectedCountry, {
            maxAge: 60 * 60 * 24 * 30,
            path: "/",
          });
          response.headers.set("x-country", detectedCountry);
          return response;
        }
      }

      detectedCountry = await detectCountryFromIP(ip);
      response.cookies.set("edges-country", detectedCountry, {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }
  }

  // For country-specific paths, extract the country code
  const countryMatch = pathname.match(/^\/(ng|gh|zm|eg|ma|cd|cm|tg)(\/|$)/);
  if (countryMatch) {
    detectedCountry = countryMatch[1];
  }

  // Redirect /reseller to /[country]/apply
  if (pathname === "/reseller" || pathname === "/reseller/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${detectedCountry}/apply`;
    return NextResponse.redirect(url);
  }

  // Set country header for use in layouts/pages
  response.headers.set("x-country", detectedCountry);

  // ============================================
  // AUTHENTICATION LOGIC
  // ============================================

  const isDashboard = pathname.startsWith(`/${detectedCountry}/dashboard`);
  const isProtectedApp = pathname.startsWith("/home");
  const isAdminDashboard = pathname.startsWith("/panel");
  const isAuthPage =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith(`/${detectedCountry}/sign-in`);

  // ✅ Check if user is on the apply page (allowed without auth)
  const isApplyPage = pathname.includes("/apply");
  const isSuccessPage = pathname.includes("/success");
  const isPendingPage = pathname.includes("/dashboard/pending");
  const isRejectedPage = pathname.includes("/dashboard/rejected");

  // Store route: matches /storename (single segment, not a known path)
  const isStore =
    pathname !== "/" &&
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/reseller") &&
    !pathname.startsWith("/home") &&
    !pathname.startsWith("/sign-in") &&
    !pathname.startsWith("/sign-up") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.includes(".") &&
    !pathname.match(/^\/(ng|gh|zm|eg|ma|cd|cm|tg)(\/|$)/);

  if (isStore) {
    return response;
  }

  // Allow public country routes
  if (pathname.match(/^\/(ng|gh|zm|eg|ma|cd|cm|tg)(\/.*)?$/)) {
    return response;
  }

  // ============================================
  // DASHBOARD ACCESS CONTROL
  // ============================================

  if (isDashboard) {
    // ✅ If user is not logged in, redirect to apply
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${detectedCountry}/apply`;
      return NextResponse.redirect(url);
    }

    // ✅ Check application status from the database
    try {
      const { data: application, error: appError } = await supabase
        .from("global_reseller_applications")
        .select("application_status")
        .eq("auth_user_id", user.id)
        .single();

      // If no application found, redirect to apply
      if (appError || !application) {
        const url = request.nextUrl.clone();
        url.pathname = `/${detectedCountry}/apply`;
        return NextResponse.redirect(url);
      }

      // ✅ If status is active, allow access to dashboard
      if (application.application_status === "active") {
        return response;
      }

      // ✅ If status is pending (unlikely now but keep for safety), show pending page
      if (application.application_status === "pending") {
        const url = request.nextUrl.clone();
        url.pathname = `/${detectedCountry}/dashboard/pending`;
        return NextResponse.redirect(url);
      }

      // ✅ If status is rejected, redirect to rejected page
      if (application.application_status === "rejected") {
        const url = request.nextUrl.clone();
        url.pathname = `/${detectedCountry}/dashboard/rejected`;
        return NextResponse.redirect(url);
      }

      // ✅ Default: allow access
      return response;
    } catch (error) {
      console.error("Dashboard auth check error:", error);
      // On error, allow access (the layout will handle it)
      return response;
    }
  }

  // Redirect unauthenticated users from protected app routes
  if (!user && isProtectedApp) {
    const url = request.nextUrl.clone();
    url.pathname = `/`;
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  // ✅ Allow apply and success pages without auth
  if (isApplyPage || isSuccessPage) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

// // src/proxy.ts
// import { createServerClient } from "@supabase/ssr";
// import { NextResponse, type NextRequest } from "next/server";

// // IP detection cache
// const ipCache = new Map<string, { country: string; timestamp: number }>();
// const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// async function detectCountryFromIP(ip: string): Promise<string> {
//   // Check cache first
//   const cached = ipCache.get(ip);
//   if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
//     return cached.country;
//   }

//   try {
//     // Use ip-api.com free tier - fast and reliable
//     const response = await fetch(
//       `http://ip-api.com/json/${ip}?fields=status,countryCode`,
//       {
//         signal: AbortSignal.timeout(3000),
//       },
//     );

//     if (!response.ok) throw new Error("IP lookup failed");

//     const data = await response.json();

//     if (data.status === "success") {
//       const countryCode = data.countryCode?.toLowerCase() || "ng";

//       // Cache the result
//       ipCache.set(ip, { country: countryCode, timestamp: Date.now() });

//       return countryCode;
//     }

//     return "ng";
//   } catch (error) {
//     console.error("IP detection failed:", error);
//     return "ng"; // Default to Nigeria
//   }
// }

// // Helper to get client IP from request
// function getClientIP(request: NextRequest): string {
//   // Check various headers for the real IP
//   const forwardedFor = request.headers.get("x-forwarded-for");
//   if (forwardedFor) {
//     // x-forwarded-for can be a comma-separated list
//     // The first IP is the client
//     const ips = forwardedFor.split(",");
//     const clientIP = ips[0]?.trim();
//     if (clientIP) return clientIP;
//   }

//   const realIP = request.headers.get("x-real-ip");
//   if (realIP) return realIP;

//   const cfConnectingIP = request.headers.get("cf-connecting-ip");
//   if (cfConnectingIP) return cfConnectingIP;

//   const trueClientIP = request.headers.get("true-client-ip");
//   if (trueClientIP) return trueClientIP;

//   // Fallback for development
//   return "127.0.0.1";
// }

// export async function proxy(request: NextRequest) {
//   let response = NextResponse.next({ request });

//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return request.cookies.getAll();
//         },
//         setAll(cookiesToSet) {
//           cookiesToSet.forEach(({ name, value, options }) =>
//             request.cookies.set(name, value),
//           );
//           response = NextResponse.next({ request });
//           cookiesToSet.forEach(({ name, value, options }) =>
//             response.cookies.set(name, value, options),
//           );
//         },
//       },
//     },
//   );

//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   const pathname = request.nextUrl.pathname;

//   // Skip API routes, static files, etc.
//   if (
//     pathname.startsWith("/api") ||
//     pathname.startsWith("/_next") ||
//     pathname.includes(".")
//   ) {
//     return response;
//   }

//   // Detect country for root and reseller routes
//   const shouldDetectCountry =
//     pathname === "/" ||
//     pathname === "/reseller" ||
//     pathname.startsWith("/reseller/");

//   let detectedCountry = "ng";

//   if (shouldDetectCountry) {
//     // ✅ Get client IP using helper function
//     const ip = getClientIP(request);

//     // Check cookie first (user preference overrides IP)
//     const savedCountry = request.cookies.get("edges-country")?.value;

//     if (
//       savedCountry &&
//       ["ng", "gh", "zm", "eg", "ma", "cd", "cm", "tg"].includes(savedCountry)
//     ) {
//       detectedCountry = savedCountry;
//     } else {
//       // ✅ FIXED: Development test country logic moved here
//       if (process.env.NODE_ENV === "development") {
//         // Allow testing different countries in dev
//         const testCountry = request.headers.get("x-test-country");
//         if (
//           testCountry &&
//           ["ng", "gh", "zm", "eg", "ma", "cd", "cm", "tg"].includes(testCountry)
//         ) {
//           detectedCountry = testCountry;
//           // Set cookie for this test country
//           response.cookies.set("edges-country", detectedCountry, {
//             maxAge: 60 * 60 * 24 * 30,
//             path: "/",
//           });
//           response.headers.set("x-country", detectedCountry);
//           return response;
//         }
//       }

//       detectedCountry = await detectCountryFromIP(ip);

//       // Set cookie for future visits
//       response.cookies.set("edges-country", detectedCountry, {
//         maxAge: 60 * 60 * 24 * 30,
//         path: "/",
//       });
//     }
//   }

//   // For country-specific paths, extract the country code
//   const countryMatch = pathname.match(/^\/(ng|gh|zm|eg|ma|cd|cm|tg)(\/|$)/);
//   if (countryMatch) {
//     detectedCountry = countryMatch[1];
//   }

//   // Redirect /reseller to /[country]/apply
//   if (pathname === "/reseller" || pathname === "/reseller/") {
//     const url = request.nextUrl.clone();
//     url.pathname = `/${detectedCountry}/apply`;
//     return NextResponse.redirect(url);
//   }

//   // ✅ Root stays at /, no redirect
//   // The root page will use the country from the cookie/header

//   // Set country header for use in layouts/pages
//   response.headers.set("x-country", detectedCountry);

//   // ============================================
//   // AUTHENTICATION LOGIC
//   // ============================================

//   const isDashboard = pathname.startsWith("/dashboard");
//   const isProtectedApp = pathname.startsWith("/home");
//   const isAdminDashboard = pathname.startsWith("/panel");
//   const isAuthPage =
//     pathname.startsWith("/sign-in") ||
//     pathname.startsWith("/sign-up") ||
//     pathname.startsWith("/forgot-password") ||
//     pathname.startsWith("/reset-password");

//   // Store route: matches /storename (single segment, not a known path)
//   const isStore =
//     pathname !== "/" &&
//     !pathname.startsWith("/dashboard") &&
//     !pathname.startsWith("/reseller") &&
//     !pathname.startsWith("/home") &&
//     !pathname.startsWith("/sign-in") &&
//     !pathname.startsWith("/sign-up") &&
//     !pathname.startsWith("/api") &&
//     !pathname.startsWith("/_next") &&
//     !pathname.includes(".") &&
//     !pathname.match(/^\/(ng|gh|zm|eg|ma|cd|cm|tg)(\/|$)/);

//   if (isStore) {
//     return response;
//   }

//   // Allow public country routes
//   if (pathname.match(/^\/(ng|gh|zm|eg|ma|cd|cm|tg)(\/.*)?$/)) {
//     return response;
//   }

//   // Redirect unauthenticated users from dashboard
//   if (!user && isDashboard) {
//     const url = request.nextUrl.clone();
//     url.pathname = `/${detectedCountry}/apply`;
//     return NextResponse.redirect(url);
//   }

//   // Redirect unauthenticated users from protected app routes
//   if (!user && isProtectedApp) {
//     const url = request.nextUrl.clone();
//     url.pathname = `/`;
//     return NextResponse.redirect(url);
//   }

//   // Redirect authenticated users away from auth pages
//   if (user && isAuthPage) {
//     const url = request.nextUrl.clone();
//     url.pathname = "/home";
//     return NextResponse.redirect(url);
//   }

//   return response;
// }

// export const config = {
//   matcher: [
//     "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
//   ],
// };
