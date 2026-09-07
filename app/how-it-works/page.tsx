import type { Metadata } from "next";
import { FlaskConical, Link2, Sparkles, GraduationCap } from "lucide-react";

export const metadata: Metadata = {
  title: "How it works — Roast My Repo",
  description: "How Roast My Repo turns a GitHub URL into a graded, witty code review.",
};

const STEPS = [
  {
    icon: Link2,
    title: "1. Paste your repo",
    description:
      "Drop in the URL of any public GitHub repository — no sign-in, no setup.",
  },
  {
    icon: FlaskConical,
    title: "2. We look under the hood",
    description:
      "Static analysis surfaces complexity hotspots, dead code, and missing test coverage across the codebase.",
  },
  {
    icon: Sparkles,
    title: "3. The roast gets written",
    description:
      "Those findings get handed to an LLM, which turns them into a witty, structured review — not just a wall of linter output.",
  },
  {
    icon: GraduationCap,
    title: "4. You get graded",
    description:
      "A letter grade, a headline roast, and file-by-file comments you can actually act on.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          How it works
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          Four steps between your GitHub URL and an honest opinion about your
          code.
        </p>
      </div>

      <ol className="mt-16 flex flex-col gap-6">
        {STEPS.map((step) => (
          <li
            key={step.title}
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <step.icon aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                {step.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
