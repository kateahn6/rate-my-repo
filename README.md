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

Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` (required by
`/api/roast`). `GITHUB_TOKEN` is optional but recommended — it lifts the GitHub
API rate limit from 60 to 5,000 requests/hour.

## Project Structure

- `app/page.tsx` — homepage (state/data-fetching) composed from `components/roast/*`
- `app/api/roast/route.ts` — validates the repo URL, fetches GitHub metadata, runs analysis, and generates the roast
- `lib/github.ts` — GitHub URL validation, repo metadata, file tree, and language stats
- `lib/analyze.ts` — builds a `RepoAnalysis` from the GitHub API + a light lexical scan of the largest source files (AST-free stand-in until a real static-analysis engine exists)
- `lib/gemini.ts` — roast generation via the Gemini API
- `lib/schema.ts` — shared types for analysis/roast data
- `components/ui/*` — shadcn/ui primitives
- `components/roast/*` — app-specific presentational components (Navbar, Hero, RepoInput, ResultCard, etc.)

## Stack

- [Next.js](https://nextjs.org) (App Router)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- TypeScript
- [Gemini API](https://ai.google.dev/) for roast generation

## Testing

```bash
npm test
```
