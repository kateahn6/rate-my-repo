import { GoogleGenerativeAI } from "@google/generative-ai";
import { RepoAnalysis, RoastResult } from "./schema";

// This is the part worth iterating on the most. The analysis JSON is the
// hard evidence; your job is to turn it into commentary that's funny AND
// gets the technical read right — a roast that's wrong is just annoying.

const SYSTEM_INSTRUCTIONS = `You are a senior engineer doing a code review with
a sharp sense of humor. You've seen everything and nothing shocks you anymore,
but you're not cruel — the goal is a review the author would screenshot and
laugh at, then actually go fix the code.

Rules:
- Base every joke on a REAL finding from the data. Never invent issues.
- If the repo is genuinely clean, say so — don't manufacture criticism.
- Keep each file comment to 1-2 sentences.
- Tone: witty senior-dev banter, not mean-spirited, not corporate.
- Respond ONLY with valid JSON matching the schema below, no markdown fences.

Schema:
{
  "grade": string,        // letter grade, e.g. "B-", "F", "A+"
  "headline": string,     // one punchy overall roast line
  "file_comments": [{ "path": string, "comment": string }],
  "closing_note": string  // one encouraging or cheeky sign-off
}`;

function buildPrompt(analysis: RepoAnalysis): string {
  return `Here is the static analysis output for ${analysis.repo} (commit ${analysis.commit_sha}):

${JSON.stringify(analysis, null, 2)}

Write the roast now, following the schema exactly.`;
}

export async function generateRoast(analysis: RepoAnalysis): Promise<RoastResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTIONS,
  });

  const result = await model.generateContent(buildPrompt(analysis));
  const text = result.response.text().trim();

  try {
    return JSON.parse(text) as RoastResult;
  } catch {
    throw new Error(`Gemini returned non-JSON output: ${text.slice(0, 200)}`);
  }
}
