// This is the contract with Person A's analysis engine.
// Lock this down together BEFORE either of you builds much further —
// changing it later means re-touching both halves of the app.

export interface FunctionFinding {
  name: string;
  complexity: number;
  lines: number;
  has_test: boolean;
  issues: string[]; // e.g. "high_complexity", "no_test_coverage"
}

export interface FileFinding {
  path: string;
  functions: FunctionFinding[];
  unused_imports: string[];
  dead_code_lines: number[];
}

export interface DependencyGraph {
  god_modules: string[];
}

export interface AnalysisSummary {
  total_files: number;
  avg_complexity: number;
  test_coverage_pct: number;
}

export interface RepoAnalysis {
  repo: string; // "owner/name"
  commit_sha: string;
  language_breakdown: Record<string, number>;
  files: FileFinding[];
  dependency_graph: DependencyGraph;
  summary: AnalysisSummary;
}

// What your prompt/roast function returns to the frontend
export interface RoastResult {
  grade: string; // "B-", "F", "A+" etc — you decide the rubric
  headline: string; // one-liner summary roast
  file_comments: {
    path: string;
    comment: string;
  }[];
  closing_note: string;
}
