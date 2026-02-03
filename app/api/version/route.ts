import { NextResponse } from "next/server";

export async function GET() {
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
