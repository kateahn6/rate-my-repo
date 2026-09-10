// Run with:  npm test   (which is `node --test`)
//
// No test framework — Node's built-in `node:test` runner executes this file
// directly, and Node's native TypeScript support strips the types. That keeps
// the GitHub-integration slice dependency-free.
//
// `fetch` is stubbed on globalThis per-test so nothing here touches the network.

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { fetchRepoMetadata, parseRepoUrl, GitHubError } from "./github.ts";

type StubHandler = (url: string) => Response | Promise<Response>;

const realFetch = globalThis.fetch;
const savedToken = process.env.GITHUB_TOKEN;

/** Build a minimal Response-like object good enough for lib/github.ts. */
function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
): Response {
  const status = init.status ?? 200;
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(init.headers ?? {}),
    json: async () => body,
  } as Response;
}

/** Install a fetch stub and return the list of URLs it was called with. */
function stubFetch(handler: StubHandler): string[] {
  const calls: string[] = [];
  globalThis.fetch = (async (input: unknown) => {
    const url =
      typeof input === "string"
        ? input
        : String((input as { url?: string }).url ?? input);
    calls.push(url);
    return handler(url);
  }) as typeof fetch;
  return calls;
}

/** A repo whose /commits endpoint reports at least one commit. */
function nonEmptyRepoHandler(repoBody: Record<string, unknown>): StubHandler {
  return (url) => {
    if (url.includes("/commits")) return jsonResponse([{ sha: "abc123" }]);
    return jsonResponse(repoBody);
  };
}

beforeEach(() => {
  delete process.env.GITHUB_TOKEN; // exercise the unauthenticated path by default
});

afterEach(() => {
  globalThis.fetch = realFetch;
  if (savedToken === undefined) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = savedToken;
});

// ---------------------------------------------------------------------------
// parseRepoUrl
// ---------------------------------------------------------------------------

test("parseRepoUrl accepts the shapes a user might paste", () => {
  const expected = { owner: "vercel", name: "next.js" };
  for (const input of [
    "https://github.com/vercel/next.js",
    "http://www.github.com/vercel/next.js/",
    "github.com/vercel/next.js",
    "vercel/next.js",
    "https://github.com/vercel/next.js.git",
    "git@github.com:vercel/next.js.git",
    "https://github.com/vercel/next.js/tree/canary/packages",
    "  https://github.com/vercel/next.js?tab=readme-ov-file#next  ",
    // Only the first two segments are trusted; junk after them (including
    // "../.." sequences) is ignored rather than resolved.
    "https://github.com/vercel/next.js/../../etc/passwd",
  ]) {
    assert.deepEqual(parseRepoUrl(input), expected, `input: ${input}`);
  }
});

test("parseRepoUrl rejects malformed / non-GitHub input", () => {
  for (const input of [
    "",
    "   ",
    "not a url",
    "vercel", // missing repo segment
    "https://gitlab.com/vercel/next.js", // wrong host
    "https://github.com/-bad/name", // owner can't start with a hyphen
    "https://github.com/bad~owner/repo", // illegal char in owner
    `https://github.com/vercel/${"x".repeat(101)}`, // repo name too long
  ]) {
    assert.throws(() => parseRepoUrl(input), GitHubError, `input: ${input}`);
  }
});

// ---------------------------------------------------------------------------
// fetchRepoMetadata
// ---------------------------------------------------------------------------

test("valid public repo -> normalised metadata", async () => {
  const calls = stubFetch(
    nonEmptyRepoHandler({
      name: "hub",
      owner: { login: "octocat" },
      private: false,
      size: 1200,
      default_branch: "main",
      html_url: "https://github.com/octocat/hub",
      forks_count: 42,
      subscribers_count: 7,
      open_issues_count: 3,
      description: "a repo",
      language: "Go",
      license: { spdx_id: "MIT" },
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2021-01-01T00:00:00Z",
    })
  );

  const meta = await fetchRepoMetadata("https://github.com/octocat/hub");

  assert.deepEqual(meta, {
    owner: "octocat",
    name: "hub",
    defaultBranch: "main",
    sizeKb: 1200,
    isPrivate: false,
    htmlUrl: "https://github.com/octocat/hub",
    headCommitSha: "abc123",
    forks_count: 42,
    subscribers_count: 7,
    open_issues_count: 3,
    description: "a repo",
    language: "Go",
    license: "MIT",
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2021-01-01T00:00:00Z",
  });
  // Hit the repo endpoint, then the commits (empty-repo + head-SHA) check.
  assert.equal(calls.length, 2);
  assert.match(calls[1], /\/commits/);
});

test("private repo (visible via token) -> GitHubError, no commits check", async () => {
  process.env.GITHUB_TOKEN = "test-token";
  const calls = stubFetch(() =>
    jsonResponse({ name: "secret", owner: { login: "octocat" }, private: true })
  );

  await assert.rejects(
    fetchRepoMetadata("https://github.com/octocat/secret"),
    (err: unknown) =>
      err instanceof GitHubError && /private repos aren't supported/i.test(err.message)
  );
  assert.equal(calls.length, 1); // bailed before the commits call
});

test("nonexistent repo -> 404 GitHubError", async () => {
  stubFetch(() => jsonResponse({ message: "Not Found" }, { status: 404 }));

  await assert.rejects(
    fetchRepoMetadata("https://github.com/octocat/does-not-exist"),
    (err: unknown) =>
      err instanceof GitHubError &&
      err.status === 404 &&
      /not found/i.test(err.message)
  );
});

test("oversized repo -> GitHubError before the commits check", async () => {
  const calls = stubFetch(() =>
    jsonResponse({
      name: "huge",
      owner: { login: "octocat" },
      private: false,
      size: 250_000, // KB, ~244 MB, over the default 50_000 cap
    })
  );

  await assert.rejects(
    fetchRepoMetadata("https://github.com/octocat/huge"),
    (err: unknown) => err instanceof GitHubError && /too large/i.test(err.message)
  );
  assert.equal(calls.length, 1);
});

test("malformed URL -> GitHubError without any network call", async () => {
  const calls = stubFetch(() => {
    throw new Error("fetch should never be called for a malformed URL");
  });

  await assert.rejects(
    fetchRepoMetadata("https://gitlab.com/octocat/hub"),
    GitHubError
  );
  assert.equal(calls.length, 0);
});

// ---------------------------------------------------------------------------
// Extra coverage for the newly-added edge cases
// ---------------------------------------------------------------------------

test("empty repo (409 from /commits) -> GitHubError", async () => {
  stubFetch((url) => {
    if (url.includes("/commits")) {
      return jsonResponse({ message: "Git Repository is empty." }, { status: 409 });
    }
    return jsonResponse({
      name: "fresh",
      owner: { login: "octocat" },
      private: false,
      size: 0,
    });
  });

  await assert.rejects(
    fetchRepoMetadata("octocat/fresh"),
    (err: unknown) =>
      err instanceof GitHubError && /no commits yet/i.test(err.message)
  );
});

test("rate limit (403 + x-ratelimit-remaining: 0) -> 429 GitHubError with token hint", async () => {
  const reset = Math.floor(Date.now() / 1000) + 120;
  stubFetch(() =>
    jsonResponse(
      { message: "API rate limit exceeded" },
      {
        status: 403,
        headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) },
      }
    )
  );

  await assert.rejects(
    fetchRepoMetadata("octocat/hub"),
    (err: unknown) =>
      err instanceof GitHubError &&
      err.status === 429 &&
      /rate limit/i.test(err.message) &&
      /GITHUB_TOKEN/.test(err.message) // hint shown only when unauthenticated
  );
});

test("renamed repo -> canonical owner/name from the payload, not the input", async () => {
  const calls = stubFetch((url) => {
    if (url.includes("/commits")) return jsonResponse([{ sha: "abc123" }]);
    return jsonResponse({
      name: "new-name",
      owner: { login: "new-owner" },
      private: false,
      size: 10,
      default_branch: "trunk",
      html_url: "https://github.com/new-owner/new-name",
    });
  });

  const meta = await fetchRepoMetadata("https://github.com/old-owner/old-name");

  assert.equal(meta.owner, "new-owner");
  assert.equal(meta.name, "new-name");
  assert.equal(meta.defaultBranch, "trunk");
  // The commits check follows the canonical name, not the stale input.
  assert.match(calls[1], /\/repos\/new-owner\/new-name\/commits/);
});

test("network failure -> GitHubError(503), not a raw throw", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;

  await assert.rejects(
    fetchRepoMetadata("octocat/hub"),
    (err: unknown) => err instanceof GitHubError && err.status === 503
  );
});

test("head-commit lookup fails soft -> headCommitSha is null, no throw", async () => {
  stubFetch((url) => {
    if (url.includes("/commits")) {
      return jsonResponse({ message: "kaboom" }, { status: 500 });
    }
    return jsonResponse({
      name: "hub",
      owner: { login: "octocat" },
      private: false,
      size: 10,
      default_branch: "main",
      html_url: "https://github.com/octocat/hub",
    });
  });

  const meta = await fetchRepoMetadata("octocat/hub");
  assert.equal(meta.headCommitSha, null);
});
