import { NextRequest, NextResponse } from "next/server";

/**
 * Rutas públicas
 */
const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",

  "/favicon.ico",
  "/icon.png",
  "/ceb-logo.png",
"/api/version",
]);

/**
 * Endpoints protegidos por token propio (no por cookie)
 */
const TOKEN_ENDPOINTS = new Set([
  "/api/export/books",
  "/api/export/books-csv",
  "/api/export/loans",
  "/api/backup",
  "/api/test-db",
]);

function isPublicAsset(pathname: string) {
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.endsWith(".png")) return true;
  if (pathname.endsWith(".jpg")) return true;
  if (pathname.endsWith(".jpeg")) return true;
  if (pathname.endsWith(".svg")) return true;
  if (pathname.endsWith(".css")) return true;
  if (pathname.endsWith(".js")) return true;
  if (pathname.endsWith(".ico")) return true;
  return false;
}

function hasSessionCookie(req: NextRequest) {
  // ✅ TU COOKIE REAL
  const c0 = req.cookies.get("ceb_session")?.value;

  const c1 = req.cookies.get("auth")?.value;
  const c2 = req.cookies.get("auth_token")?.value;
  const c3 = req.cookies.get("token")?.value;
  const c4 = req.cookies.get("session")?.value;
  const c5 = req.cookies.get("session_token")?.value;
  const c6 = req.cookies.get("jwt")?.value;

  return Boolean(c0 || c1 || c2 || c3 || c4 || c5 || c6);
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Assets
  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  // Públicas
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Token endpoints
  if (TOKEN_ENDPOINTS.has(pathname)) {
    return NextResponse.next();
  }

  // Validar sesión
  if (hasSessionCookie(req)) {
    return NextResponse.next();
  }

  // APIs => JSON
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Páginas => redirect login
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/:path*"],
};
