import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getJwtSecret, verifyCredentials } from "../../../../src/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = String(body?.user ?? "");
    const pass = String(body?.pass ?? "");

    const ok = await verifyCredentials(user, pass);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Credenciales inválidas." }, { status: 401 });
    }

    const secret = new TextEncoder().encode(getJwtSecret());

    const token = await new SignJWT({ sub: user })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const res = NextResponse.json({ ok: true });
    res.cookies.set("ceb_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Error" }, { status: 500 });
  }
}
