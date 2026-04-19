import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

const PROTECTED_ROUTES = ["/", "/clients", "/settings"];
const AUTH_ROUTES = ["/login", "/signup"];

function isProtectedPath(pathname: string) {
  if (pathname === "/") return true;
  return PROTECTED_ROUTES.some((route) =>
    route === "/" ? false : pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAuthPath(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function updateSession(request: NextRequest) {
  const { url, key } = getSupabasePublicConfig();

  if (!url || !key) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: Record<string, unknown>) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const protectedPath = isProtectedPath(pathname);
  const authPath = isAuthPath(pathname);

  if (!user && protectedPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && authPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
