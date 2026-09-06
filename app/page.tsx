const roasts = [
  "“This function does 9 things and I respect the chaos, but let's split it up.”",
  "“I found your test folder. It was very short. Almost like a haiku.”",
  "“Bold of you to name a variable `data2`.”",
  "“This is the fourth `utils.js` I've met today. None of them know each other.”",
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-24 text-center sm:py-32">
        <span className="rounded-full border border-black/8 px-3 py-1 text-xs font-medium tracking-wide text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
          🔥 now roasting on request
        </span>

        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-6xl dark:text-zinc-50">
          Roast My Repo
        </h1>

        <p className="mt-5 max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Paste a GitHub URL. Get a code review with a personality problem.
          Brutally honest, occasionally hurtful, always technically correct.
        </p>

        <form className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <input
            type="url"
            placeholder="github.com/you/your-questionable-code"
            disabled
            className="w-full rounded-full border border-black/8 bg-white px-5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            disabled
            className="w-full shrink-0 cursor-not-allowed rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background opacity-70 sm:w-auto"
          >
            Roast it
          </button>
        </form>
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          Coming soon. Your repo is safe for now.
        </p>

        <div className="mt-20 grid w-full gap-3">
          {roasts.map((roast) => (
            <p
              key={roast}
              className="rounded-2xl border border-black/8 bg-white px-5 py-4 text-left text-sm leading-6 text-zinc-600 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-400"
            >
              {roast}
            </p>
          ))}
        </div>
      </main>

      <footer className="w-full border-t border-black/8 py-6 text-center text-xs text-zinc-400 dark:border-white/[.145] dark:text-zinc-500">
        Built to hurt your feelings, professionally.
      </footer>
    </div>
  );
}
