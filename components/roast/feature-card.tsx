import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Alternates the icon chip's accent so a row of cards isn't monochrome. */
  tone?: "primary" | "accent";
}

export function FeatureCard({ icon: Icon, title, description, tone = "primary" }: FeatureCardProps) {
  return (
    <div
      className={cn(
        "group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1",
        tone === "primary" ? "hover:border-primary/50" : "hover:border-accent/50"
      )}
    >
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-xl transition-shadow",
          tone === "primary"
            ? "bg-primary/20 text-primary group-hover:glow-primary"
            : "bg-accent/20 text-accent group-hover:glow-accent"
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
