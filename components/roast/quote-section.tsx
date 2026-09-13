export function QuoteSection() {
  return (
    <section className="relative overflow-hidden px-6 py-20 text-center sm:py-28">
      {/* Soft radial glow behind the quote — gives this section its own
          identity instead of blending into the flat background. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-xl -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-3xl">
        <span
          aria-hidden="true"
          className="font-heading block text-6xl leading-none text-primary/40 select-none"
        >
          &ldquo;
        </span>
        <p className="font-heading -mt-4 text-2xl leading-snug font-medium text-foreground italic sm:text-3xl">
          A little roast goes a long way.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">— Probably a developer</p>
      </div>
    </section>
  );
}
