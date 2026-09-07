// Run with:  npm test   (Node's built-in `node:test`, types stripped natively)
//
// `fetch` is stubbed on globalThis so nothing here touches the network: GitHub
// tree/languages endpoints return JSON, and raw.githubusercontent.com returns
// file text.

import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import { analyzeRepo } from "./analyze.ts";
import type { RepoMetadata } from "./github.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const META: RepoMetadata = {
  owner: "octocat",
  name: "demo",
  defaultBranch: "main",
  sizeKb: 100,
  isPrivate: false,
  htmlUrl: "https://github.com/octocat/demo",
  headCommitSha: "deadbeefcafe",
};

function response(
  body: unknown,
  init: { status?: number; text?: string } = {}
): Response {
  const status = init.status ?? 200;
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(),
    json: async () => body,
    text: async () => init.text ?? "",
    arrayBuffer: async () =>
      new TextEncoder().encode(init.text ?? "").buffer as ArrayBuffer,
  } as Response;
}

/**
 * Stub the three endpoints analyzeRepo touches. `files` maps repo path -> file
 * body and, unless `tree` is overridden, also defines the tree listing.
 */
function stub(
  files: Record<string, string>,
  opts: { tree?: unknown; languages?: unknown } = {}
): void {
  const tree =
    opts.tree ??
    {
      tree: Object.keys(files).map((path) => ({
        path,
        type: "blob",
        size: files[path].length,
      })),
      truncated: false,
    };

  globalThis.fetch = (async (input: unknown) => {
    const url =
      typeof input === "string"
        ? input
        : String((input as { url?: string }).url ?? input);

    if (url.includes("/git/trees/")) return response(tree);
    if (url.includes("/languages")) {
      return response(opts.languages ?? { TypeScript: 900, JavaScript: 100 });
    }
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      // .../octocat/demo/<ref>/<path...>
      const path = decodeURIComponent(url.split("/").slice(6).join("/"));
      const body = files[path];
      return body === undefined
        ? response(null, { status: 404 })
        : response(null, { text: body });
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;
}

test("builds a RepoAnalysis from the tree + fetched file contents", async () => {
  stub({
    "src/app.ts":
      "import { readFile } from 'fs';\n" +
      "import { join } from 'path';\n" +
      "export function run() {\n" +
      "  const p = join('a', 'b');\n" +
      "  if (p) return p;\n" +
      "  for (let i = 0; i < 3; i++) {}\n" +
      "}\n",
    "src/app.test.ts": "test('run', () => {});\n",
    "src/util.ts": "export const noop = () => {};\n",
  });

  const analysis = await analyzeRepo(META);

  assert.equal(analysis.repo, "octocat/demo");
  assert.equal(analysis.commit_sha, "deadbeefcafe");
  assert.equal(analysis.summary.total_files, 3); // app + test + util
  assert.ok(analysis.files.length >= 1);

  const app = analysis.files.find((f) => f.path === "src/app.ts");
  assert.ok(app, "expected a finding for src/app.ts");
  assert.equal(app.functions[0].has_test, true); // src/app.test.ts covers it
  assert.ok(app.unused_imports.includes("readFile")); // imported, never used
  assert.ok(!app.unused_imports.includes("join")); // imported and used

  // app.ts is covered, util.ts is not -> 50% of the two application files.
  assert.equal(analysis.summary.test_coverage_pct, 50);
  assert.equal(analysis.language_breakdown.typescript, 0.9);
});

test("no source files -> empty analysis, no throw", async () => {
  stub(
    {},
    {
      tree: {
        tree: [
          { path: "README.md", type: "blob", size: 42 },
          { path: "docs", type: "tree", size: 0 },
        ],
        truncated: false,
      },
    }
  );

  const analysis = await analyzeRepo(META);

  assert.deepEqual(analysis.files, []);
  assert.equal(analysis.summary.total_files, 0);
  assert.equal(analysis.summary.test_coverage_pct, 0);
  assert.equal(analysis.summary.avg_complexity, 0);
  assert.deepEqual(analysis.dependency_graph.god_modules, []);
});

test("god_modules = application files far larger than the median", async () => {
  const files: Record<string, string> = {};
  for (let i = 0; i < 6; i++) files[`src/small${i}.ts`] = "a\n";
  files["src/monster.ts"] = "x\n".repeat(20_000); // ~40 KB, dwarfs the rest

  stub(files);
  const analysis = await analyzeRepo(META);

  assert.deepEqual(analysis.dependency_graph.god_modules, ["src/monster.ts"]);
});

test("falls back to inferred languages when GitHub /languages is empty", async () => {
  stub({ "src/main.py": "print('hi')\n" }, { languages: {} });

  const analysis = await analyzeRepo(META);
  assert.equal(analysis.language_breakdown.python, 1);
});

test("vendored directories are excluded from the analysis", async () => {
  stub({
    "src/real.ts": "export const x = 1;\n",
    "node_modules/dep/index.js": "module.exports = 1;\n",
    "dist/bundle.js": "var a=1;\n",
  });

  const analysis = await analyzeRepo(META);
  assert.equal(analysis.summary.total_files, 1);
  assert.equal(analysis.files[0]?.path, "src/real.ts");
});
