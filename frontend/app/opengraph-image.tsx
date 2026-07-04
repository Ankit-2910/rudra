import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RUDRA — Shivanchal's AI Digital Twin Company";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const EMPLOYEES: { name: string; color: string }[] = [
  { name: "RUDRA", color: "#f59e0b" },
  { name: "Gokarna", color: "#38bdf8" },
  { name: "Manibhadra", color: "#34d399" },
  { name: "Virabhadra", color: "#a78bfa" },
  { name: "Bhairava", color: "#fb7185" },
];

// Social-share preview card, generated at request time so it always matches
// the live brand palette without a separately maintained image asset.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0e17",
          backgroundImage:
            "radial-gradient(circle at 15% 15%, rgba(245,158,11,0.28), transparent 42%), radial-gradient(circle at 85% 85%, rgba(56,189,248,0.28), transparent 42%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: 8,
            color: "#8b9bb4",
            textTransform: "uppercase",
            marginBottom: 18,
            display: "flex",
          }}
        >
          Shivanchal Consultants · Bhopal, India
        </div>
        <div
          style={{
            fontSize: 148,
            fontWeight: 900,
            letterSpacing: 14,
            color: "#f5f8ff",
            display: "flex",
          }}
        >
          RUDRA
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#c7d2e4",
            marginTop: 14,
            display: "flex",
          }}
        >
          India&apos;s digital twin company — every employee is an AI
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 46 }}>
          {EMPLOYEES.map((e) => (
            <div
              key={e.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(17,24,39,0.7)",
                border: `1px solid ${e.color}55`,
                borderRadius: 999,
                padding: "12px 22px",
                fontSize: 24,
                color: "#e5eaf3",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: e.color,
                  display: "flex",
                }}
              />
              {e.name}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
