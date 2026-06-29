import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["tr", "en"];
const defaultLocale = "en";

function getLocale(request: NextRequest) {
  // Check if there is a preferred language cookie
  const cookieLocale = request.cookies.get("preferred_language")?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // Check accept-language header
  const acceptLang = request.headers.get("accept-language");
  if (acceptLang) {
    const preferredLocales = acceptLang
      .split(",")
      .map((lang) => lang.split(";")[0].trim().substring(0, 2));

    for (const locale of preferredLocales) {
      if (locales.includes(locale)) {
        return locale;
      }
    }
  }

  return defaultLocale;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, images, etc.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // e.g., favicon.ico, .png files
  ) {
    return NextResponse.next();
  }

  // 1. Supabase Session Refresh
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This call automatically refreshes the session if it's about to expire and updates the cookies.
  await supabase.auth.getUser();

  // 2. Language/Locale Routing
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return supabaseResponse;
  }

  // If there is no language parameter, redirect
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  
  const redirectResponse = NextResponse.redirect(request.nextUrl);
  
  // Copy Supabase cookies to redirect response as well
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      expires: cookie.expires,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
    });
  });

  return redirectResponse;
}

export const config = {
  matcher: [
    // Exclude Next.js internal paths, favicon, and static assets
    "/((?!_next|api|favicon.ico|.*\\.).*)",
  ],
};
