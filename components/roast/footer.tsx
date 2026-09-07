import Link from "next/link";
import { Flame } from "lucide-react";

const FOOTER_LINKS = [{ label: "How it works", href: "/how-it-works" }];

export function Footer() {
  return (
    <footer className="border-t border-border/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
            <Flame className="size-4 text-primary" aria-hidden="true" />
            Roast My Repo
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Code. Roast. Improve. Repeat.
          </p>
        </div>

        <nav aria-label="Footer" className="flex items-center gap-6">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
