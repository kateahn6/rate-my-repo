# Roast My Repo

Paste a public GitHub repo, get an honest, witty, constructive AI-generated
code roast — a grade, a headline, and per-file comments.

**Live:** [rate-my-repo.vercel.app](https://rate-my-repo.vercel.app/)

## Getting Started

```bash
npm install
npm run dev
```

You'll need a `GEMINI_API_KEY` environment variable set for `/api/roast` to
generate real roasts (see `lib/gemini.ts`).
Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and set:

- `GEMINI_API_KEY` — required, roast generation fails without it.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — required, every roast is
  persisted so it can be shared via `/roast/[id]`.
- `GITHUB_TOKEN` — optional but recommended, lifts the GitHub API rate limit
  from 60 to 5,000 requests/hour.

## Project Structure

- `app/page.tsx` — homepage (state/data-fetching) composed from `components/roast/*`
- `app/roast/[id]/page.tsx` — shareable results page; renders a previously-generated roast fetched by id
- `app/roast/[id]/opengraph-image.tsx` — generates the share-card image (grade + headline) for link previews
- `app/api/roast/route.ts` — validates the repo URL, fetches GitHub metadata, runs analysis, generates the roast, and persists it
- `lib/github.ts` — GitHub URL validation, repo metadata, file tree, and language stats
- `lib/analyze.ts` — builds a `RepoAnalysis` from the GitHub API + a light lexical scan of the largest source files (AST-free stand-in until a real static-analysis engine exists)
- `lib/gemini.ts` — roast generation via the Gemini API, with prompt-injection defense and large-repo trimming
- `lib/roast-store.ts` — persists/fetches roasts in Supabase, keyed by a short id, for the `/roast/[id]` share flow
- `lib/schema.ts` — shared types for analysis/roast data
- `components/ui/*` — shadcn/ui primitives
- `components/roast/*` — app-specific presentational components (Navbar, Hero, RepoInput, ResultCard, ShareLink, etc.)

## Stack

- [Next.js](https://nextjs.org) (App Router)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- TypeScript
- [Gemini API](https://ai.google.dev/) for roast generation
- [Supabase](https://supabase.com) (Postgres) for persisting shareable roasts

## Testing

`npm test` is currently broken on Node 22 (its `--test` glob needs
`--experimental-strip-types` to load `.mts` files, which the script doesn't
pass yet). Run it directly instead:

```bash
node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test "lib/**/*.test.mts"
```
