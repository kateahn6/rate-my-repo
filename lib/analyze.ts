// Turns a public GitHub repo into a RepoAnalysis without cloning it: the file
// tree and language stats come from the GitHub API, and the biggest source
// files are pulled from the raw CDN for a light lexical scan (branch-token
// complexity, unused imports, size). It is deliberately AST-free — a stand-in
// that tracks the *real* repo until Person A's static-analysis engine exists.
// The route only depends on the return type, so swapping in that engine later
// means changing this file and nothing else.

import {
  fetchLanguages,
  fetchRepoTree,
  type RepoMetadata,
  type RepoTreeEntry,
} from "./github.ts";
import type { FileFinding, FunctionFinding, RepoAnalysis } from "./schema.ts";

const SOURCE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "py", "rb", "go", "rs", "java", "kt", "kts",
  "c", "h", "cpp", "cc", "hpp", "cs",
  "php", "swift", "scala", "sh", "bash",
]);

const EXT_LANGUAGE: Record<string, string> = {
  ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
  mjs: "javascript", cjs: "javascript", py: "python", rb: "ruby", go: "go",
  rs: "rust", java: "java", kt: "kotlin", kts: "kotlin", c: "c", h: "c",
  cpp: "cpp", cc: "cpp", hpp: "cpp", cs: "csharp", php: "php", swift: "swift",
  scala: "scala", sh: "shell", bash: "shell",
};

// Directories that are vendored, generated, or otherwise not the author's code.
const IGNORED_SEGMENTS = new Set([
  "node_modules", "vendor", "dist", "build", "out", ".next", ".nuxt",
  "coverage", "__pycache__", ".venv", "venv", "target", "bin", "obj",
  "third_party", "vendored", ".git",
]);

const TEST_PATH_RE = /(^|\/)(tests?|__tests__|specs?|e2e|__mocks__)(\/|$)/i;
const TEST_FILE_RE =
  /(?:^|\/)(?:tests?|specs?)\.[a-z0-9]+$|(?:[._-])(?:test|spec)(?:-d)?\.[a-z0-9]+$|(?:^|\/)test_[^/]+$/i;

// Bound the work: only the largest source files cross the wire, capped in size.
// Enough signal for a roast, predictable cost per request.
const MAX_FILES_TO_SCAN = 12;
const MAX_BYTES_PER_FILE = 200_000;
const RAW_HOST = "https://raw.githubusercontent.com";
const RAW_TIMEOUT_MS = 8_000;

const COMPLEXITY_THRESHOLD = 20;
const LONG_FILE_LINES = 400;

export async function analyzeRepo(metadata: RepoMetadata): Promise<RepoAnalysis> {
  const { owner, name, defaultBranch, headCommitSha } = metadata;
  const ref = headCommitSha ?? defaultBranch;

  const [tree, languages] = await Promise.all([
    fetchRepoTree(owner, name, ref),
    fetchLanguages(owner, name),
  ]);

  const sourceFiles = tree.entries.filter(isSourceFile);
  const testFiles = sourceFiles.filter((f) => isTestPath(f.path));
  const appFiles = sourceFiles.filter((f) => !isTestPath(f.path));

  const toScan = [...appFiles]
    .sort((a, b) => b.size - a.size)
    .slice(0, MAX_FILES_TO_SCAN);

  const scanned = await Promise.all(
    toScan.map((entry) => scanFile(owner, name, ref, entry, testFiles))
  );
  const files = scanned.filter((f): f is FileFinding => f !== null);

  const complexities = files.flatMap((f) =>
    f.functions.map((fn) => fn.complexity)
  );
  const avgComplexity =
    complexities.length > 0
      ? complexities.reduce((s, n) => s + n, 0) / complexities.length
      : 0;

  // Heuristic coverage: the share of application files that have a test file
  // naming them. A cheap proxy, not a real coverage run — but it moves with
  // reality instead of being a number someone typed once.
  const coveredCount = appFiles.filter((f) =>
    hasMatchingTest(f.path, testFiles)
  ).length;
  const testCoveragePct =
    appFiles.length > 0
      ? Math.round((coveredCount / appFiles.length) * 100)
      : 0;

  return {
    repo: `${owner}/${name}`,
    commit_sha: ref.slice(0, 12),
    language_breakdown:
      Object.keys(languages).length > 0
        ? languages
        : inferLanguages(sourceFiles),
    files,
    dependency_graph: { god_modules: pickGodModules(appFiles) },
    summary: {
      total_files: sourceFiles.length,
      avg_complexity: Math.round(avgComplexity * 10) / 10,
      test_coverage_pct: testCoveragePct,
    },
  };
}

async function scanFile(
  owner: string,
  name: string,
  ref: string,
  entry: RepoTreeEntry,
  testFiles: RepoTreeEntry[]
): Promise<FileFinding | null> {
  const source = await fetchRawFile(owner, name, ref, entry.path);
  if (source === null) return null;

  const language = EXT_LANGUAGE[extname(entry.path)] ?? "unknown";
  const lines = source.split("\n").length;
  const complexity = estimateComplexity(source);
  const hasTest = hasMatchingTest(entry.path, testFiles);
  const unusedImports = findUnusedImports(source, language);

  const issues: string[] = [];
  if (complexity >= COMPLEXITY_THRESHOLD) issues.push("high_complexity");
  if (lines >= LONG_FILE_LINES) issues.push("very_long_file");
  if (!hasTest) issues.push("no_test_coverage");
  if (unusedImports.length > 0) issues.push("unused_imports");

  // File-granular until the AST engine lands: one synthetic "function" entry
  // standing in for the module as a whole, named for the file so the roast can
  // cite it by path.
  const moduleFinding: FunctionFinding = {
    name: `${basename(entry.path)} (module)`,
    complexity,
    lines,
    has_test: hasTest,
    issues,
  };

  return {
    path: entry.path,
    functions: [moduleFinding],
    unused_imports: unusedImports,
    dead_code_lines: [],
  };
}

async function fetchRawFile(
  owner: string,
  name: string,
  ref: string,
  path: string
): Promise<string | null> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `${RAW_HOST}/${owner}/${name}/${ref}/${encodedPath}`;
  const token = process.env.GITHUB_TOKEN;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "roast-my-repo",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(RAW_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const slice =
      buf.byteLength > MAX_BYTES_PER_FILE
        ? buf.slice(0, MAX_BYTES_PER_FILE)
        : buf;
    return new TextDecoder("utf-8", { fatal: false }).decode(slice);
  } catch {
    // A single unreadable file must not sink the whole analysis.
    return null;
  }
}

// --- lexical heuristics ----------------------------------------------------

const COMPLEXITY_KEYWORD_RE =
  /\b(if|elif|elsif|for|foreach|while|case|when|catch|except|rescue)\b/g;
const COMPLEXITY_OPERATOR_RE = /&&|\|\||\?\?/g;

// A rough cyclomatic-complexity proxy: one path through the file plus one per
// branch/loop/short-circuit token. Not an AST, but enough to tell a tidy
// helper from a 40-branch monster, which is all the roast needs.
function estimateComplexity(source: string): number {
  const keywords = source.match(COMPLEXITY_KEYWORD_RE)?.length ?? 0;
  const operators = source.match(COMPLEXITY_OPERATOR_RE)?.length ?? 0;
  return 1 + keywords + operators;
}

// Best-effort: flag imported names that never appear again in the file. Covers
// the common ES and Python import shapes; anything exotic is simply skipped.
function findUnusedImports(source: string, language: string): string[] {
  const names =
    language === "python"
      ? collectPythonImports(source)
      : collectEsImports(source);

  const unused: string[] = [];
  for (const name of names) {
    if (!name || name === "*") continue;
    // >1 occurrence means the name is referenced somewhere beyond its own
    // import statement.
    if (countWord(source, name) <= 1) unused.push(name);
  }
  return unused.slice(0, 10);
}

function collectEsImports(source: string): Set<string> {
  const names = new Set<string>();
  const importRe =
    /import\s+(?:type\s+)?(?:([A-Za-z0-9_$]+)\s*,?\s*)?(?:\*\s+as\s+([A-Za-z0-9_$]+)\s*)?(?:\{([^}]*)\})?\s+from\s/g;
  for (const m of source.matchAll(importRe)) {
    if (m[1]) names.add(m[1]);
    if (m[2]) names.add(m[2]);
    for (const part of splitList(m[3])) {
      names.add(lastSegment(part).replace(/\s/g, ""));
    }
  }
  return names;
}

function collectPythonImports(source: string): Set<string> {
  const names = new Set<string>();
  for (const m of source.matchAll(/^[ \t]*import[ \t]+([\w.,\s]+)$/gm)) {
    for (const part of splitList(m[1])) {
      const alias = part.split(/\s+as\s+/)[1];
      names.add((alias ?? part.split(".")[0]).trim());
    }
  }
  for (const m of source.matchAll(
    /^[ \t]*from[ \t]+\S+[ \t]+import[ \t]+(.+)$/gm
  )) {
    for (const part of splitList(m[1].replace(/[()]/g, ""))) {
      if (part !== "*") names.add(lastSegment(part));
    }
  }
  return names;
}

function splitList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// "foo as bar" -> "bar"; "foo" -> "foo".
function lastSegment(part: string): string {
  return part.split(/\s+as\s+/).pop()!.trim();
}

function countWord(source: string, word: string): number {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`\\b${escaped}\\b`, "g"))?.length ?? 0;
}

// --- file classification -------------------------------------------------

function extname(path: string): string {
  const dot = path.lastIndexOf(".");
  const slash = path.lastIndexOf("/");
  return dot > slash ? path.slice(dot + 1).toLowerCase() : "";
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

// Filename without any extensions: "foo.test.ts" -> "foo", "server.ts" -> "server".
function stem(path: string): string {
  const base = basename(path).toLowerCase();
  const dot = base.indexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

function isIgnored(path: string): boolean {
  return path.split("/").some((seg) => IGNORED_SEGMENTS.has(seg));
}

function isTestPath(path: string): boolean {
  return TEST_PATH_RE.test(path) || TEST_FILE_RE.test(path);
}

function isSourceFile(entry: RepoTreeEntry): boolean {
  return (
    entry.type === "blob" &&
    !isIgnored(entry.path) &&
    !entry.path.endsWith(".d.ts") && // type declarations, no runtime logic
    SOURCE_EXTENSIONS.has(extname(entry.path))
  );
}

// A test file "covers" a source file when its name contains the source stem:
// foo.ts <- foo.test.ts / foo.spec.ts / test_foo.py / FooTest.java …
function hasMatchingTest(sourcePath: string, testFiles: RepoTreeEntry[]): boolean {
  const s = stem(sourcePath);
  if (s.length < 2) return false;
  return testFiles.some((t) => basename(t.path).toLowerCase().includes(s));
}

// "God modules": the handful of application files far larger than the median.
// Real dependency-fan-in needs the import graph; size is the honest proxy we
// can get from the tree alone.
function pickGodModules(appFiles: RepoTreeEntry[]): string[] {
  if (appFiles.length < 4) return [];
  const sizes = appFiles.map((f) => f.size).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)] || 1;
  return appFiles
    .filter((f) => f.size > Math.max(median * 4, 8_000))
    .sort((a, b) => b.size - a.size)
    .slice(0, 3)
    .map((f) => f.path);
}

// Fallback language breakdown when GitHub's /languages is empty (very new or
// tiny repos): weight each detected language by total source bytes.
function inferLanguages(sourceFiles: RepoTreeEntry[]): Record<string, number> {
  const bytes: Record<string, number> = {};
  for (const f of sourceFiles) {
    const lang = EXT_LANGUAGE[extname(f.path)] ?? "other";
    bytes[lang] = (bytes[lang] ?? 0) + Math.max(f.size, 1);
  }
  const total = Object.values(bytes).reduce((s, n) => s + n, 0);
  if (total === 0) return {};
  const out: Record<string, number> = {};
  for (const [lang, n] of Object.entries(bytes)) {
    out[lang] = Math.round((n / total) * 1000) / 1000;
  }
  return out;
}
