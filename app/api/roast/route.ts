import { NextRequest, NextResponse } from "next/server";
import { fetchRepoMetadata, GitHubError } from "@/lib/github";
import { generateRoast } from "@/lib/gemini";
import { MOCK_MESSY_REPO } from "@/lib/mock-analysis";
import { RepoAnalysis } from "@/lib/schema";

// TODO(Person A): replace this with a real call to your analysis service,
// e.g. `await fetch(`${ANALYSIS_SERVICE_URL}/analyze`, { body: repoUrl })`.
// Keep the return type as RepoAnalysis so this route doesn't need to change.
async function runAnalysis(_repoUrl: string): Promise<RepoAnalysis> {
  return MOCK_MESSY_REPO;
}

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
    const analysis = await runAnalysis(metadata.htmlUrl);
    const roast = await generateRoast(analysis);
    return NextResponse.json({ metadata, roast });
  } catch (err) {
    if (err instanceof GitHubError) {
      return NextResponse.json({ error: err.message }, { status: err.status ?? 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something broke roasting that repo." }, { status: 500 });
  }
}
