import { NextRequest, NextResponse } from "next/server";
import { PERSONAS, FALLBACK_LINES, isEmployeeRole } from "@/lib/personas";

// Vercel Hobby caps serverless functions at 10s; each Gemini attempt gets at
// most 7s and the chain stops when the remaining budget is too small.
export const maxDuration = 10;

const MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
const TOTAL_BUDGET_MS = 8500;
const PER_CALL_TIMEOUT_MS = 7000;

interface HistoryItem {
  from: "user" | "ai";
  text: string;
}

interface Lead {
  name: string;
  company: string;
  purpose: string;
}

function extractLead(reply: string): { reply: string; lead?: Lead } {
  const match = reply.match(/<lead>([\s\S]*?)<\/lead>/);
  if (!match) return { reply };
  const cleaned = reply.replace(match[0], "").trim();
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.name && parsed.company && parsed.purpose) {
      return {
        reply: cleaned,
        lead: {
          name: String(parsed.name),
          company: String(parsed.company),
          purpose: String(parsed.purpose),
        },
      };
    }
  } catch {
    // Malformed tag — return the cleaned text without a lead.
  }
  return { reply: cleaned };
}

async function callGemini(
  model: string,
  apiKey: string,
  system: string,
  history: HistoryItem[],
  message: string,
  timeoutMs: number
): Promise<string | null> {
  // Gemini requires the first content to be a user turn; the client seeds
  // threads with an AI greeting, so drop leading model turns.
  const firstUser = history.findIndex((h) => h.from === "user");
  const usable = firstUser === -1 ? [] : history.slice(firstUser);
  const contents = [
    ...usable.slice(-16).map((h) => ({
      role: h.from === "user" ? "user" : "model",
      parts: [{ text: h.text }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const generationConfig: Record<string, unknown> = { maxOutputTokens: 900 };
  // thinkingConfig is only valid on 2.5-series models; 1.5 models reject it.
  if (model.startsWith("gemini-2.5")) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();
    return text || null;
  } catch {
    return null; // timeout, network, abort — try the next model
  }
}

export async function POST(req: NextRequest) {
  let body: { role?: string; message?: string; history?: HistoryItem[]; visitorName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { role, message, visitorName } = body;
  const history = Array.isArray(body.history) ? body.history : [];
  if (!role || !isEmployeeRole(role) || !message || typeof message !== "string") {
    return NextResponse.json(
      { error: "Expected { role: employee role, message: string, history?: [] }" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  // Cross-room memory: once Reception has captured the visitor's name, every
  // other employee greets and addresses them by it without re-asking.
  const persona =
    visitorName && typeof visitorName === "string"
      ? `${PERSONAS[role]}\n\nThe visitor's name is ${visitorName}. Address them by name naturally, without announcing that you were told it.`
      : PERSONAS[role];
  const started = Date.now();

  if (apiKey) {
    for (const model of MODELS) {
      const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
      if (remaining < 1200) break;
      const text = await callGemini(
        model,
        apiKey,
        persona,
        history,
        message,
        Math.min(PER_CALL_TIMEOUT_MS, remaining)
      );
      if (text) {
        const { reply, lead } = extractLead(text);
        return NextResponse.json({ reply, model, ...(lead ? { lead } : {}) });
      }
    }
  }

  // Every model failed (or no key configured): scripted in-character line.
  return NextResponse.json({ reply: FALLBACK_LINES[role], model: "fallback" });
}
