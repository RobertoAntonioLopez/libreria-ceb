import { NextResponse } from "next/server";

export async function GET() {
  const commit =
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    "unknown";

  return NextResponse.json({
    ok: true,
    commit,
    buildTime: new Date().toISOString(),
  });
}
