// Run with:
//   node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test "lib/**/*.test.mts"
//
// Same setup as github.test.mts — Node's built-in runner, native type stripping,
// no test framework. These cover the pure prompt-building logic only;
// generateRoast() talks to the real Gemini SDK and isn't exercised here.

import test from "node:test";
import assert from "node:assert/strict";

import { buildPrompt, roastWorthiness } from "./gemini.ts";
import type { RepoAnalysis, FileFinding } from "./schema.ts";

// --- fixtures ---------------------------------------------------------------

function makeFile(path: string, over: Partial<FileFinding> = {}): FileFinding {
  return {
    path,
    functions: [],
    unused_imports: [],
    dead_code_lines: [],
    ...over,
  };
}

function makeAnalysis(files: FileFinding[]): RepoAnalysis {
  return {
    repo: "octocat/hub",
    commit_sha: "abc123",
    language_breakdown: { TypeScript: 100 },
    files,
    dependency_graph: { god_modules: [] },
    summary: { total_files: files.length, avg_complexity: 1, test_coverage_pct: 0 },
  };
}

// --- roastWorthiness -------------------------------------------------------

// The ranking only has to be *directionally* right: a file carrying real
// findings must sort ahead of one with none, so it survives the top-20 slice
// in buildPrompt. Exact score values are an implementation detail, not asserted.
test("roastWorthiness: a file with issues outranks a clean file", () => {
  const messy = makeFile("messy.ts", {
    functions: [
      { name: "f", complexity: 9, lines: 40, has_test: false, issues: ["high_complexity", "no_test_coverage"] },
    ],
  });
  const clean = makeFile("clean.ts");

  assert.ok(roastWorthiness(messy, []) > roastWorthiness(clean, []));
});

// Being in dependency_graph.god_modules should lift a file's rank even when it
// has no per-function findings — a god module is a problem in itself.
test("roastWorthiness: god modules get a bonus", () => {
  const file = makeFile("core.ts");
  // TODO: assert roastWorthiness(file, ["core.ts"]) > roastWorthiness(file, [])
  assert.ok(roastWorthiness(file, ["core.ts"]) > roastWorthiness(file, []));
});

// --- buildPrompt ---------------------------------------------------------

// Under the MAX_FILES_IN_PROMPT threshold, buildPrompt must hand the model the
// whole file list verbatim and add no "showing N of M" disclaimer.
test("buildPrompt: a small analysis is passed through untrimmed", () => {
  const files = Array.from({ length: 10 }, (_, i) => makeFile(`src/file${i}.ts`));
  const prompt = buildPrompt(makeAnalysis(files));

  // TODO: assert every path "src/file0.ts" .. "src/file9.ts" appears in `prompt`
  for (const f of files) assert.ok(prompt.includes(f.path));
  // TODO: assert `prompt` does NOT contain "most notable files of"
  assert.ok(!prompt.includes("most notable files of"));
});

// Over the threshold, buildPrompt trims to the highest-scoring files. The one
// file with findings (src/hot.ts) must make the cut, the prompt must disclose
// the "of 900" total, and the untrusted repo data must stay fenced in the
// <repo_analysis> delimiters (the prompt-injection guard).
test("buildPrompt: a large analysis is trimmed to the most notable files", () => {
  const files = Array.from({ length: 900 }, (_, i) => makeFile(`src/file${i}.ts`));
  // one clearly-interesting file buried in the noise
  files[500] = makeFile("src/hot.ts", { dead_code_lines: [1, 2, 3, 4, 5, 6, 7, 8] });

  const prompt = buildPrompt(makeAnalysis(files));

  // TODO: assert `prompt` contains "src/hot.ts"
  assert.ok(prompt.includes("src/hot.ts"));
  // TODO: assert `prompt` contains "of 900"
  assert.ok(prompt.includes("of 900"));
  // TODO: assert `prompt` contains "<repo_analysis>" and "</repo_analysis>"
  assert.ok(prompt.includes("<repo_analysis>"));
  assert.ok(prompt.includes("</repo_analysis>"));
});
