"use client";

import { useState } from "react";
import { Navbar } from "@/components/roast/navbar";
import { Hero } from "@/components/roast/hero";
import { ResultCard, type RoastResponse } from "@/components/roast/result-card";
import { FeatureSection } from "@/components/roast/feature-section";
import { QuoteSection } from "@/components/roast/quote-section";
import { Footer } from "@/components/roast/footer";

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
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero
          repoUrl={repoUrl}
          onRepoUrlChange={setRepoUrl}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
        {result && <ResultCard result={result} />}
        <FeatureSection />
        <QuoteSection />
      </main>
      <Footer />
    </div>
  );
}
