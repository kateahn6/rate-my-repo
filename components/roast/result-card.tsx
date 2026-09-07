import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface RoastResponse {
  metadata: { owner: string; name: string };
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

// Renders whatever the /api/roast response contains — no roast content is
// hardcoded here, this only changes how that data is presented.
export function ResultCard({ result }: ResultCardProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-8">
      <Card className="relative mx-auto w-full max-w-2xl rounded-2xl border-border shadow-2xl shadow-black/30">
        <div className="absolute top-6 right-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary font-heading text-2xl font-bold text-primary">
          {result.roast.grade}
        </div>
        <CardHeader>
          <CardDescription className="font-mono text-xs text-muted-foreground">
            {result.metadata.owner}/{result.metadata.name}
          </CardDescription>
          <CardTitle className="font-heading max-w-[75%] text-xl leading-snug font-semibold">
            {result.roast.headline}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {result.roast.file_comments.map((c) => (
            <div key={c.path} className="border-l-2 border-primary pl-3">
              <code className="font-mono text-xs text-muted-foreground">
                {c.path}
              </code>
              <p className="mt-1 text-accent italic">{c.comment}</p>
            </div>
          ))}
          <p className="font-heading mt-2 text-sm text-muted-foreground">
            {result.roast.closing_note}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
