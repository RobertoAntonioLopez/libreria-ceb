import { NextRequest, NextResponse } from "next/server";

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/icon.png") ||
    pathname.startsWith("/ceb-logo.png") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  );
}

function hasSession(req: NextRequest) {
  return Boolean(req.cookies.get("ceb_session")?.value);
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // 1) Assets públicos
  if (isPublicAsset(pathname)) return NextResponse.next();

  // 2) Rutas públicas (login) y auth endpoints
  if (pathname === "/login") {
    // Si ya está logueado, llévalo directo a /books
    if (hasSession(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/books";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Auth endpoints siempre accesibles
  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/logout")) {
    return NextResponse.next();
  }

  // Version endpoint accesible (útil para verificar deploy)
  if (pathname.startsWith("/api/version")) {
    return NextResponse.next();
  }

  // Backup endpoint: lo protege el token en el handler, no aquí
  if (pathname.startsWith("/api/backup")) {
    return NextResponse.next();
  }

  // 3) APIs: si no hay sesión -> 401 JSON (no redirect)
  if (pathname.startsWith("/api/")) {
    if (!hasSession(req)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 4) Páginas privadas: si no hay sesión -> redirect al login
  if (!hasSession(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";

    // (Opcional) guardar a dónde iba para volver después
    // url.searchParams.set("next", pathname);

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Matcher para correr en todo menos assets de Next
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
