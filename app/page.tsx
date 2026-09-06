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
