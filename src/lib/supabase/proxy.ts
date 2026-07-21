import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isSupabaseConfigured,
  supabaseKey,
  supabaseUrl,
} from "@/lib/supabase/config";

function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
) {
  const redirect = NextResponse.redirect(new URL(pathname, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = response.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}

export async function updateSession(request: NextRequest) {
  // Hardware authenticates with its own device key inside the route handler.
  if (request.nextUrl.pathname === "/api/rfid/scan") {
    return NextResponse.next({ request });
  }

  if (!isSupabaseConfigured || !supabaseUrl || !supabaseKey) {
    return request.nextUrl.pathname === "/login"
      ? NextResponse.next({ request })
      : NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  let isAuthenticated = false;

  try {
    const { data: claimsData } = await supabase.auth.getClaims();
    isAuthenticated = Boolean(claimsData?.claims);
  } catch {
    if (isLoginPage) return response;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "auth_unavailable");
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return redirectWithCookies(
      request,
      response,
      `${loginUrl.pathname}${loginUrl.search}`,
    );
  }

  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return redirectWithCookies(
      request,
      response,
      `${loginUrl.pathname}${loginUrl.search}`,
    );
  }

  if (isAuthenticated && isLoginPage) {
    return redirectWithCookies(request, response, "/");
  }

  return response;
}
