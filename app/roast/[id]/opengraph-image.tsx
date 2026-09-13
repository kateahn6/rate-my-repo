import { ImageResponse } from "next/og";
import { getRoast } from "@/lib/roast-store";

// Generates the og:image for a shared roast link — this is what shows up as
// the preview card on Twitter/Discord/Slack/iMessage. Colors are hardcoded
// hex (matching app/globals.css's --background/--card/--primary/--accent)
// rather than CSS vars, since the image renderer (satori) doesn't resolve
// custom properties.

export const alt = "Repo roast result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface ImageProps {
  params: { id: string };
}

export default async function Image({ params }: ImageProps) {
  const stored = await getRoast(params.id);

  const repo = stored ? `${stored.metadata.owner}/${stored.metadata.name}` : "unknown/repo";
  const grade = stored?.roast.grade ?? "?";
  const headline = stored?.roast.headline ?? "This roast wandered off somewhere.";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          backgroundColor: "#1b0d09",
          color: "#f7f1e8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              color: "#f25a3c",
            }}
          >
            Roast
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>My Repo</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 30, color: "#a89b91", fontFamily: "monospace" }}>
            {repo}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: 820,
            }}
          >
            {headline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignSelf: "flex-end",
            alignItems: "center",
            justifyContent: "center",
            width: 140,
            height: 140,
            borderRadius: 70,
            border: "6px solid #f25a3c",
            fontSize: 56,
            fontWeight: 700,
            color: "#f25a3c",
          }}
        >
          {grade}
        </div>
      </div>
    ),
    { ...size }
  );
}
