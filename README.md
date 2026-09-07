# Roast My Repo

Paste a public GitHub repo, get an honest, witty, constructive AI-generated
code roast — a grade, a headline, and per-file comments.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You'll need a `GEMINI_API_KEY` environment variable set for `/api/roast` to
generate real roasts (see `lib/gemini.ts`).

## Project Structure

- `app/page.tsx` — homepage (state/data-fetching) composed from `components/roast/*`
- `app/api/roast/route.ts` — validates the repo URL, fetches GitHub metadata, runs analysis, and generates the roast
- `lib/github.ts` — GitHub URL validation and repo metadata fetching
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
