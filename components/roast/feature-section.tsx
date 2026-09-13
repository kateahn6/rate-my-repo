import { BarChart3, Heart, Sparkle } from "lucide-react";
import { FeatureCard } from "./feature-card";

const FEATURES = [
  {
    icon: Sparkle,
    title: "Honest Feedback",
    description:
      "Get a fun, candid review of your code, structure, and documentation.",
    tone: "primary" as const,
  },
  {
    icon: BarChart3,
    title: "Actionable Insights",
    description:
      "Not just roast — learn what to improve and how to level up.",
    tone: "accent" as const,
  },
  {
    icon: Heart,
    title: "Built for Developers",
    description: "Made by devs, for devs. Embrace the roast.",
    tone: "primary" as const,
  },
];

// A full-bleed, slightly elevated band — differentiates this section from
// the hero above and the quote below instead of everything sitting on the
// same flat background.
export function FeatureSection() {
  return (
    <section className="border-y border-border/60 bg-background-elevated">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
