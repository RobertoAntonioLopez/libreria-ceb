
1import { NextResponse } from "next/server";

export async function GET() {
  // OpenNext/Workers: usa algo simple para "versionar"
  // CF_PAGES_COMMIT_SHA existe en Pages; en Workers puede no existir.
  // Devolvemos algo estable y útil.
  const commit =
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    "unknown";

  return NextResponse.json({
    ok: true,
    commit,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    ts: new Date().toISOString(),
  });
}

