import { NextRequest, NextResponse } from "next/server";
import { fetchRepoMetadata, GitHubError } from "@/lib/github";
import { analyzeRepo } from "@/lib/analyze";
import { generateRoast } from "@/lib/gemini";
import { saveRoast } from "@/lib/roast-store";

// The analysis pulls a bounded set of files over the network and then hands
// them to Gemini, so give the function room beyond Vercel's 10s default.
export const maxDuration = 30;

// Simple in-memory rate limit by IP. Fine for a demo; swap for
// Redis/Upstash if this goes anywhere beyond a portfolio project.
const requestLog = new Map<string, number[]>();
const RATE_LIMIT = 5; // requests
const WINDOW_MS = 60_000; // per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Slow down — you've hit the rate limit. Try again in a minute." },
      { status: 429 }
    );
  }

  const { repoUrl } = await req.json();
  if (!repoUrl) {
    return NextResponse.json({ error: "Missing repoUrl" }, { status: 400 });
  }

  try {
    const metadata = await fetchRepoMetadata(repoUrl);
    const analysis = await analyzeRepo(metadata);
    const roast = await generateRoast(analysis);
    const id = await saveRoast({ metadata, roast });
    return NextResponse.json({ id, metadata, roast });
  } catch (err) {
    if (err instanceof GitHubError) {
      return NextResponse.json({ error: err.message }, { status: err.status ?? 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something broke roasting that repo." }, { status: 500 });
  }
}
