// Owns: fetching repo metadata, validating the URL before it hits the
// (expensive) clone + analysis pipeline. Rejecting bad input early saves
// you from wasted compute and confusing errors downstream.

export interface RepoMetadata {
  owner: string;
  name: string;
  defaultBranch: string;
  sizeKb: number;
  isPrivate: boolean;
  htmlUrl: string;
  // SHA of the latest commit on the default branch, or null if the secondary
  // lookup failed softly. The analysis pins itself to this so a branch moving
  // mid-request can't hand back a mismatched file tree.
  headCommitSha: string | null;
}

// One entry from the Git "tree" (recursive file listing) endpoint.
export interface RepoTreeEntry {
  path: string;
  type: "blob" | "tree";
  // Size in bytes. 0 for directories, and occasionally absent on blobs.
  size: number;
}

// Plain field + assignment instead of a `public status` constructor parameter
// property: the latter is TypeScript-only syntax that Node's native type
// stripping (used by the test runner) refuses to compile. This form is
// behaviourally identical and runs everywhere.
export class GitHubError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";
// GitHub rejects API requests with no User-Agent ("Request forbidden by
// administrative rules"), and Node's default UA is not guaranteed, so set one.
const USER_AGENT = "roast-my-repo";
// A hung socket would otherwise pin the request open until the platform kills
// it. Fail fast instead.
const REQUEST_TIMEOUT_MS = 10_000;

// GitHub usernames/orgs: <=39 chars, alphanumeric or single internal hyphens.
const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
// Repo names: <=100 chars, alphanumeric plus - _ . (but not "." or ".." alone).
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

export function parseRepoUrl(input: string): { owner: string; name: string } {
  if (typeof input !== "string" || input.trim().length === 0 || input.length > 300) {
    throw new GitHubError("That doesn't look like a valid GitHub repo URL.");
  }

  // Normalise every shape someone might paste into a bare "owner/repo[/...]":
  //   https://github.com/owner/repo         git@github.com:owner/repo.git
  //   http://www.github.com/owner/repo/     ssh://git@github.com/owner/repo
  //   github.com/owner/repo?tab=readme#x    owner/repo
  let cleaned = input
    .trim()
    .replace(/^git@github\.com:/i, "github.com/")
    .replace(/^ssh:\/\/git@/i, "")
    .replace(/^[a-z]+:\/\//i, "")
    .replace(/^www\./i, "");

  // Drop query string / fragment, then a trailing ".git", then trailing slashes.
  cleaned = cleaned
    .split(/[?#]/)[0]
    .replace(/\/+$/, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");

  const segments = cleaned.split("/").filter(Boolean);

  // A first segment containing a dot is a hostname (usernames can't contain
  // dots) — it must be github.com, so a GitLab/Bitbucket URL can't slip past.
  if (segments.length > 0 && segments[0].includes(".")) {
    if (segments[0].toLowerCase() !== "github.com") {
      throw new GitHubError("Only github.com repositories are supported.");
    }
    segments.shift();
  }

  // Trust only the first two path segments; ignore "/tree/main", "/blob/...",
  // "/pull/123" and similar deep links rather than mistaking them for the repo.
  if (segments.length < 2) {
    throw new GitHubError("That doesn't look like a valid GitHub repo URL.");
  }
  const [owner, name] = segments;
  if (
    !OWNER_RE.test(owner) ||
    !REPO_RE.test(name) ||
    name === "." ||
    name === ".."
  ) {
    throw new GitHubError("That doesn't look like a valid GitHub repo URL.");
  }

  return { owner, name };
}

function githubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": API_VERSION,
    // A token raises the rate limit from 60/hr to 5,000/hr — set it in .env.
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function githubFetch(path: string): Promise<Response> {
  try {
    return await fetch(`${GITHUB_API}${path}`, {
      headers: githubHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // DNS failure, offline, or the timeout above firing (AbortError). The route
    // only knows how to turn a GitHubError into a clean response, so never let
    // a raw network error bubble out as an opaque 500.
    throw new GitHubError(
      "Couldn't reach GitHub just now. Check your connection and try again.",
      503
    );
  }
}

// GitHub signals a primary rate limit as either 429, or 403 with the remaining
// header at 0. A plain 403 with budget left is something else (blocked repo,
// TOS) and must NOT be reported as a rate limit.
function assertNotRateLimited(res: Response): void {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const limited = res.status === 429 || (res.status === 403 && remaining === "0");
  if (!limited) return;

  const resetSec = Number(res.headers.get("x-ratelimit-reset"));
  const waitMin = Number.isFinite(resetSec)
    ? Math.max(1, Math.ceil((resetSec * 1000 - Date.now()) / 60_000))
    : null;
  const tokenHint = process.env.GITHUB_TOKEN
    ? ""
    : " Set GITHUB_TOKEN to raise the limit from 60 to 5,000 requests/hour.";

  throw new GitHubError(
    `GitHub rate limit hit.${
      waitMin ? ` Try again in ~${waitMin} min.` : " Try again soon."
    }${tokenHint}`,
    429
  );
}

// Doubles as the empty-repo guard and the head-SHA lookup. A repo with zero
// commits clones to an empty tree — analysing it is pure waste — and GitHub
// returns 409 ("Git Repository is empty.") from the commits endpoint for that
// case; an empty array is the belt-and-braces fallback. Any *other* failure
// here is non-fatal: the metadata call already succeeded, so fall open with a
// null SHA rather than block the pipeline on a flaky secondary request.
async function fetchHeadCommitSha(
  owner: string,
  name: string
): Promise<string | null> {
  const res = await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits?per_page=1`
  );
  assertNotRateLimited(res);

  if (res.status === 409) {
    throw new GitHubError("This repo has no commits yet — nothing to roast.");
  }
  if (!res.ok) return null;

  let commits: unknown;
  try {
    commits = await res.json();
  } catch {
    return null;
  }
  if (Array.isArray(commits) && commits.length === 0) {
    throw new GitHubError("This repo has no commits yet — nothing to roast.");
  }
  const sha =
    Array.isArray(commits) && commits[0] && typeof commits[0] === "object"
      ? (commits[0] as { sha?: unknown }).sha
      : undefined;
  return typeof sha === "string" ? sha : null;
}

export async function fetchRepoMetadata(
  url: string,
  maxSizeKb = 50_000 // ~50MB cap — tune based on what your sandbox can handle
): Promise<RepoMetadata> {
  const { owner, name } = parseRepoUrl(url);

  const res = await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
  );
  assertNotRateLimited(res);

  if (res.status === 404) {
    // GitHub returns 404 (not 403) for private repos you can't see, to avoid
    // leaking their existence — so "not found" and "private" look identical here.
    throw new GitHubError(
      "Repo not found. Check the URL — private repos also show up as \"not found\".",
      404
    );
  }
  if (res.status === 403) {
    throw new GitHubError(
      "GitHub refused that request — the repo may be blocked or access-restricted.",
      403
    );
  }
  if (!res.ok) {
    throw new GitHubError(`GitHub API error (${res.status}).`, res.status);
  }

  let data: {
    private?: boolean;
    disabled?: boolean;
    size?: number;
    default_branch?: string;
    html_url?: string;
    name?: string;
    owner?: { login?: string };
  };
  try {
    data = await res.json();
  } catch {
    throw new GitHubError("GitHub returned a response we couldn't parse.", 502);
  }

  if (data.private) {
    // Only reachable when a GITHUB_TOKEN that CAN see the repo is set;
    // unauthenticated callers get the 404 above.
    throw new GitHubError("Private repos aren't supported yet.");
  }
  if (data.disabled) {
    throw new GitHubError(
      "This repo has been disabled by GitHub and can't be cloned."
    );
  }
  const sizeKb = data.size ?? 0;
  if (sizeKb > maxSizeKb) {
    throw new GitHubError(
      `Repo is too large to roast right now (~${Math.round(
        sizeKb / 1024
      )} MB, limit ${Math.round(maxSizeKb / 1024)} MB).`
    );
  }

  // A renamed repo 301-redirects and fetch follows it silently, so the input
  // owner/name can be stale. Trust the payload for everything downstream (the
  // clone target, the commits check, what we hand back to the caller).
  const canonicalOwner = data.owner?.login ?? owner;
  const canonicalName = data.name ?? name;

  const headCommitSha = await fetchHeadCommitSha(canonicalOwner, canonicalName);

  return {
    owner: canonicalOwner,
    name: canonicalName,
    defaultBranch: data.default_branch ?? "main",
    sizeKb,
    isPrivate: Boolean(data.private),
    htmlUrl: data.html_url ?? `https://github.com/${canonicalOwner}/${canonicalName}`,
    headCommitSha,
  };
}

// The Git "tree" endpoint returns a repo's entire file listing for one ref in a
// single request (recursive=1) — far cheaper than walking the contents API
// directory by directory. GitHub truncates the response for very large trees;
// when that happens we analyse what we got and flag it upstream.
export async function fetchRepoTree(
  owner: string,
  name: string,
  ref: string
): Promise<{ entries: RepoTreeEntry[]; truncated: boolean }> {
  const res = await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/git/trees/${encodeURIComponent(
      ref
    )}?recursive=1`
  );
  assertNotRateLimited(res);
  if (!res.ok) return { entries: [], truncated: false };

  let data: { tree?: unknown; truncated?: unknown };
  try {
    data = await res.json();
  } catch {
    return { entries: [], truncated: false };
  }

  const raw = Array.isArray(data.tree) ? data.tree : [];
  const entries: RepoTreeEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { path, type, size } = item as Record<string, unknown>;
    if (typeof path !== "string") continue;
    if (type !== "blob" && type !== "tree") continue;
    entries.push({ path, type, size: typeof size === "number" ? size : 0 });
  }
  return { entries, truncated: Boolean(data.truncated) };
}

// Byte counts per language, normalised to fractions of the total. Non-fatal: an
// empty map just means the roast skips the language commentary.
export async function fetchLanguages(
  owner: string,
  name: string
): Promise<Record<string, number>> {
  const res = await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/languages`
  );
  assertNotRateLimited(res);
  if (!res.ok) return {};

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return {};
  }
  if (!data || typeof data !== "object") return {};

  const counts = Object.entries(data as Record<string, unknown>).filter(
    (entry): entry is [string, number] =>
      typeof entry[1] === "number" && entry[1] > 0
  );
  const total = counts.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) return {};

  const breakdown: Record<string, number> = {};
  for (const [lang, n] of counts) {
    breakdown[lang.toLowerCase()] = Math.round((n / total) * 1000) / 1000;
  }
  return breakdown;
}
