"use client";

import { useState } from "react";

interface RoastResponse {
  metadata: { owner: string; name: string };
  roast: {
    grade: string;
    headline: string;
    file_comments: { path: string; comment: string }[];
    closing_note: string;
  };
}
const roasts = [
  "“This function does 9 things and I respect the chaos, but let's split it up.”",
  "“I found your test folder. It was very short. Almost like a haiku.”",
  "“Bold of you to name a variable `data2`.”",
  "“This is the fourth `utils.js` I've met today. None of them know each other.”",
];

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoastResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.hero}>
        <h1 style={styles.title}>Roast My Repo</h1>
        <p style={styles.subtitle}>Paste a public GitHub repo. Get graded. Try not to cry.</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          required
        />
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "Grading..." : "Grade it"}
        </button>
      </form>

      {error && <p style={styles.error}>{error}</p>}

      {result && (
        <section style={styles.paper}>
          <div style={styles.gradeCircle}>{result.roast.grade}</div>
          <p style={styles.repoLabel}>
            {result.metadata.owner}/{result.metadata.name}
          </p>
          <p style={styles.headline}>{result.roast.headline}</p>

          <div style={styles.comments}>
            {result.roast.file_comments.map((c) => (
              <div key={c.path} style={styles.commentRow}>
                <code style={styles.path}>{c.path}</code>
                <p style={styles.comment}>{c.comment}</p>
              </div>
            ))}
          </div>

          <p style={styles.closing}>{result.roast.closing_note}</p>
        </section>
      )}
    </main>
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-24 text-center sm:py-32">
        <span className="rounded-full border border-black/8 px-3 py-1 text-xs font-medium tracking-wide text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
          🔥 now roasting on request
        </span>

        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-6xl dark:text-zinc-50">
          Roast My Repo
        </h1>

        <p className="mt-5 max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Paste a GitHub URL. Get a code review with a personality problem.
          Brutally honest, occasionally hurtful, always technically correct.
        </p>

        <form className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <input
            type="url"
            placeholder="github.com/you/your-questionable-code"
            disabled
            className="w-full rounded-full border border-black/8 bg-white px-5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            disabled
            className="w-full shrink-0 cursor-not-allowed rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background opacity-70 sm:w-auto"
          >
            Roast it
          </button>
        </form>
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          Coming soon. Your repo is safe for now.
        </p>

        <div className="mt-20 grid w-full gap-3">
          {roasts.map((roast) => (
            <p
              key={roast}
              className="rounded-2xl border border-black/8 bg-white px-5 py-4 text-left text-sm leading-6 text-zinc-600 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-400"
            >
              {roast}
            </p>
          ))}
        </div>
      </main>

      <footer className="w-full border-t border-black/8 py-6 text-center text-xs text-zinc-400 dark:border-white/[.145] dark:text-zinc-500">
        Built to hurt your feelings, professionally.
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "4rem 1.5rem",
  },
  hero: { textAlign: "center", marginBottom: "2.5rem" },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "3rem",
    color: "var(--chalk-white)",
    margin: 0,
  },
  subtitle: {
    color: "var(--chalk-dim)",
    marginTop: "0.5rem",
    fontSize: "1rem",
  },
  form: { display: "flex", gap: "0.75rem", width: "100%", maxWidth: "540px" },
  input: {
    flex: 1,
    padding: "0.9rem 1.1rem",
    background: "transparent",
    border: "2px dashed var(--chalk-dim)",
    borderRadius: "6px",
    color: "var(--chalk-white)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.95rem",
  },
  button: {
    padding: "0.9rem 1.4rem",
    background: "var(--marker-red)",
    color: "var(--chalk-white)",
    border: "none",
    borderRadius: "6px",
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: { color: "var(--marker-red)", marginTop: "1rem", fontFamily: "var(--font-mono)" },
  paper: {
    marginTop: "3rem",
    background: "var(--paper)",
    color: "var(--ink)",
    borderRadius: "4px",
    padding: "2.5rem",
    maxWidth: "620px",
    width: "100%",
    position: "relative",
    transform: "rotate(-0.4deg)",
    boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
  },
  gradeCircle: {
    position: "absolute",
    top: "1.5rem",
    right: "1.8rem",
    fontFamily: "var(--font-display)",
    fontSize: "2.75rem",
    fontWeight: 700,
    color: "var(--marker-red)",
    border: "3px solid var(--marker-red)",
    borderRadius: "50%",
    width: "88px",
    height: "88px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: "rotate(6deg)",
  },
  repoLabel: {
    fontFamily: "var(--font-mono)",
    color: "#6b6b62",
    fontSize: "0.85rem",
    marginBottom: "0.25rem",
  },
  headline: {
    fontFamily: "var(--font-display)",
    fontSize: "1.4rem",
    fontWeight: 700,
    maxWidth: "70%",
    lineHeight: 1.3,
    marginBottom: "1.75rem",
  },
  comments: { display: "flex", flexDirection: "column", gap: "1rem" },
  commentRow: { borderLeft: "3px solid var(--marker-red)", paddingLeft: "0.9rem" },
  path: { fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#6b6b62" },
  comment: { margin: "0.25rem 0 0", color: "var(--marker-red-dim)", fontStyle: "italic" },
  closing: {
    marginTop: "2rem",
    fontFamily: "var(--font-display)",
    fontSize: "1rem",
    color: "#3a3a33",
  },
};
