import { RepoAnalysis } from "./schema";

// Three fixtures spanning the range of real outputs you'll eventually get
// from Person A's engine. Build and demo your whole pipeline against these
// first — swap in the real service call once it exists.

export const MOCK_MESSY_REPO: RepoAnalysis = {
  repo: "example/messy-project",
  commit_sha: "a1b2c3d",
  language_breakdown: { python: 0.85, javascript: 0.15 },
  files: [
    {
      path: "app/utils.py",
      functions: [
        {
          name: "process_everything",
          complexity: 22,
          lines: 140,
          has_test: false,
          issues: ["high_complexity", "no_test_coverage"],
        },
      ],
      unused_imports: ["os", "sys", "json"],
      dead_code_lines: [45, 46, 47, 88],
    },
    {
      path: "app/main.py",
      functions: [
        { name: "run", complexity: 4, lines: 20, has_test: true, issues: [] },
      ],
      unused_imports: [],
      dead_code_lines: [],
    },
  ],
  dependency_graph: { god_modules: ["app/main.py"] },
  summary: { total_files: 12, avg_complexity: 9.4, test_coverage_pct: 38 },
};

export const MOCK_CLEAN_REPO: RepoAnalysis = {
  repo: "example/tidy-project",
  commit_sha: "e4f5g6h",
  language_breakdown: { typescript: 1.0 },
  files: [
    {
      path: "src/index.ts",
      functions: [
        { name: "main", complexity: 2, lines: 15, has_test: true, issues: [] },
      ],
      unused_imports: [],
      dead_code_lines: [],
    },
  ],
  dependency_graph: { god_modules: [] },
  summary: { total_files: 8, avg_complexity: 2.1, test_coverage_pct: 96 },
};

export const MOCK_EMPTY_REPO: RepoAnalysis = {
  repo: "example/just-a-readme",
  commit_sha: "i7j8k9l",
  language_breakdown: {},
  files: [],
  dependency_graph: { god_modules: [] },
  summary: { total_files: 1, avg_complexity: 0, test_coverage_pct: 0 },
};
