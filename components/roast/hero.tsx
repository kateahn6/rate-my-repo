import { RepoInput } from "./repo-input";
import { ErrorAlert } from "./error-alert";

interface HeroProps {
  repoUrl: string;
  onRepoUrlChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}

export function Hero({ repoUrl, onRepoUrlChange, onSubmit, loading, error }: HeroProps) {
  return (
    <section id="about" className="mx-auto w-full max-w-6xl px-6 pt-16 pb-8 sm:pt-24">
      <div className="animate-roast-fade-in mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <h1 className="font-heading text-5xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
          <span className="text-primary">Roast</span>{" "}
          <span className="text-foreground">My Repo</span>
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          Paste a public GitHub repository. Get an honest, witty, and
          constructive roast.
        </p>

        <div id="try-it" className="flex w-full flex-col gap-3">
          <RepoInput
            value={repoUrl}
            onChange={onRepoUrlChange}
            onSubmit={onSubmit}
            loading={loading}
          />
          {error && <ErrorAlert message={error} />}
        </div>
      </div>
    </section>
  );
}
