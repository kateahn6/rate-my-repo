"use client";

import { useEffect, useState } from "react";

// Purely cosmetic — the roast can take several seconds (repo fetch + static
// analysis + Gemini), so this keeps the wait from feeling dead.
const MESSAGES = [
  "Reading way too many if-statements...",
  "Counting your TODOs (there are a lot)...",
  "Judging your variable names...",
  "Checking whether 'temp' ever got renamed...",
  "Looking for tests that don't exist...",
  "Measuring how many files one function touches...",
  "Grading on a curve, mostly out of pity...",
];

const INTERVAL_MS = 1800;

export function LoadingMessages() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <p
      key={index}
      className="animate-roast-fade-in text-sm text-muted-foreground italic"
    >
      {MESSAGES[index]}
    </p>
  );
}
