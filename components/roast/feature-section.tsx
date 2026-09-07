import { BarChart3, Heart, Sparkle } from "lucide-react";
import { FeatureCard } from "./feature-card";

const FEATURES = [
  {
    icon: Sparkle,
    title: "Honest Feedback",
    description:
      "Get a fun, candid review of your code, structure, and documentation.",
  },
  {
    icon: BarChart3,
    title: "Actionable Insights",
    description:
      "Not just roast — learn what to improve and how to level up.",
  },
  {
    icon: Heart,
    title: "Built for Developers",
    description: "Made by devs, for devs. Embrace the roast.",
  },
];

export function FeatureSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
      <div className="grid gap-6 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}
