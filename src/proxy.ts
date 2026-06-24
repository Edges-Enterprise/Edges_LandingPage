// src/proxy.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Protected routes
  const isDashboard = pathname.startsWith("/dashboard");
  const isProtectedApp = pathname.startsWith("/home");
  const isAdminDashboard = pathname.startsWith("/panel");
  
  // Auth pages
  const isAuthPage =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  // Public routes — let through without auth
  const isLanding = pathname === "/";
  const isResellerSignup = pathname.startsWith("/reseller");

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
    !pathname.includes(".");

  // ✅ Allow store routes through without any redirect
  if (isStore) {
    return response;
  }

  // Allow public routes
  if (isLanding || isResellerSignup || pathname.startsWith("/reseller")) {
    return response;
  }

  // Redirect unauthenticated users from dashboard
  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = "/reseller";
    return NextResponse.redirect(url);
  }

  // Redirect unauthenticated users from protected app routes
  if (!user && isProtectedApp) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages and landing
  if (user && (isAuthPage || isLanding)) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

// // src/proxy.ts
// import { createServerClient } from '@supabase/ssr';
// import { NextResponse, type NextRequest } from 'next/server';

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
//           cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
//           response = NextResponse.next({ request });
//           cookiesToSet.forEach(({ name, value, options }) =>
//             response.cookies.set(name, value, options)
//           );
//         },
//       },
//     }
//   );

//   // Refresh & validate user (do NOT remove getUser())
//   const { data: { user } } = await supabase.auth.getUser();

//   const pathname = request.nextUrl.pathname;
//   const isProtected = pathname.startsWith('/home');
//   const isAuth = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password');
//   const isPublic = pathname === '/';
//   const isAdmin = pathname === '/dashboard'

//   if (!user && isProtected) {
//     // Redirect to welcome if not auth'd
//     const url = request.nextUrl.clone();
//     url.pathname = '/';
//     return NextResponse.redirect(url);
//   }

//   if (user && (isPublic || isAuth)) {
//     // Redirect to protected if auth'd
//     const url = request.nextUrl.clone();
//     url.pathname = '/home';
//     return NextResponse.redirect(url);
//   }

//   // Handle rememberMe expiry (adjust session if needed; Supabase auto-refreshes)
//   if (user && request.cookies.has('rememberMe')) {
//     const rememberMe = request.cookies.get('rememberMe')?.value === 'true';
//     // Optional: Extend session expiry via admin (requires service role; use Edge Function)
//   }

//   if (user && (isAdmin)) {
//     // Redirect to protected if auth'd
//     const url = request.nextUrl.clone();
//     url.pathname = '/dashboard';
//     return NextResponse.redirect(url);
//   }

//   return response;
// }

// export const config = {
//   matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
// };
