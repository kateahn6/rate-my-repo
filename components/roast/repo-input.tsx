import { Flame, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GithubMark } from "./github-mark";

interface RepoInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

// Presentational only — the actual grading request/state lives in the page
// component so this stays a dumb, reusable form.
export function RepoInput({ value, onChange, onSubmit, loading }: RepoInputProps) {
  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <GithubMark
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <label htmlFor="repo-url" className="sr-only">
          GitHub repository URL
        </label>
        <Input
          id="repo-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="github.com/owner/repo"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="h-12 w-full rounded-xl border-border bg-card pl-10 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/40"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="h-12 shrink-0 gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0 sm:w-auto"
      >
        {loading ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Grading...
          </>
        ) : (
          <>
            <Flame aria-hidden="true" className="size-4" />
            Grade it
          </>
        )}
      </Button>
    </form>
  );
}
