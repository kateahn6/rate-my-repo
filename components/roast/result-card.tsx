import { Star, GitFork, Scale } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShareLink } from "@/components/roast/share-link";

export interface RoastResponse {
  id: string;
  metadata: {
    owner: string;
    name: string;
    stargazers_count?: number;
    forks_count?: number;
    language?: string | null;
    license?: string | null;
  };
  roast: {
    grade: string;
    headline: string;
    file_comments: { path: string; comment: string }[];
    closing_note: string;
  };
}

interface ResultCardProps {
  result: RoastResponse;
}

// GitHub's own convention for counts in the UI: 1_234 -> "1.2k".
function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

// Renders whatever the /api/roast response contains — no roast content is
// hardcoded here, this only changes how that data is presented.
export function ResultCard({ result }: ResultCardProps) {
  const { metadata } = result;
  const hasStats =
    metadata.stargazers_count != null ||
    metadata.forks_count != null ||
    metadata.language ||
    metadata.license;

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-8">
      <Card className="relative mx-auto w-full max-w-2xl rounded-2xl border-border shadow-2xl shadow-black/30">
        <div className="absolute top-6 right-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary font-heading text-2xl font-bold text-primary">
          {result.roast.grade}
        </div>
        <CardHeader>
          <CardDescription className="font-mono text-xs text-muted-foreground">
            {metadata.owner}/{metadata.name}
          </CardDescription>
          <CardTitle className="font-heading max-w-[75%] text-xl leading-snug font-semibold">
            {result.roast.headline}
          </CardTitle>
          {hasStats && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {metadata.stargazers_count != null && (
                <Badge variant="outline" className="gap-1">
                  <Star data-icon="inline-start" className="fill-current" />
                  {formatCount(metadata.stargazers_count)}
                </Badge>
              )}
              {metadata.forks_count != null && (
                <Badge variant="outline" className="gap-1">
                  <GitFork data-icon="inline-start" />
                  {formatCount(metadata.forks_count)}
                </Badge>
              )}
              {metadata.language && (
                <Badge variant="secondary">{metadata.language}</Badge>
              )}
              {metadata.license && (
                <Badge variant="outline" className="gap-1">
                  <Scale data-icon="inline-start" />
                  {metadata.license}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {result.roast.file_comments.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No file-by-file notes on this one — nothing stood out enough to
              call out by name.
            </p>
          ) : (
            result.roast.file_comments.map((c, i) => (
              <div
                key={`${c.path}-${i}`}
                className="border-l-2 border-primary pl-3"
              >
                <code className="font-mono text-xs text-muted-foreground">
                  {c.path}
                </code>
                <p className="mt-1 text-accent italic">{c.comment}</p>
              </div>
            ))
          )}
          <p className="font-heading mt-2 text-sm text-muted-foreground">
            {result.roast.closing_note}
          </p>
        </CardContent>
      </Card>
      <div className="mt-4 flex justify-center">
        <ShareLink id={result.id} />
      </div>
    </section>
  );
}
