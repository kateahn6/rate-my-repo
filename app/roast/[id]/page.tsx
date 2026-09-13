import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getRoast } from "@/lib/roast-store";
import { ResultCard } from "@/components/roast/result-card";

interface RoastPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: RoastPageProps) {
  const stored = await getRoast(params.id);
  if (!stored) return { title: "Roast not found — Roast My Repo" };

  const { owner, name } = stored.metadata;
  return {
    title: `${owner}/${name} got roasted — Roast My Repo`,
    description: stored.roast.headline,
  };
}

export default async function RoastPage({ params }: RoastPageProps) {
  const stored = await getRoast(params.id);
  if (!stored) notFound();

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-16 pb-8 sm:pt-24">
      <div className="animate-roast-fade-in mx-auto flex max-w-xl flex-col items-center gap-3 pb-8 text-center">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          Shared roast
        </p>
        <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          {stored.metadata.owner}/{stored.metadata.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Someone shared this review with you — here&apos;s the damage.
        </p>
      </div>

      <ResultCard result={{ id: params.id, ...stored }} />

      <div className="mt-6 flex justify-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Roast your own repo
        </Link>
      </div>
    </section>
  );
}
