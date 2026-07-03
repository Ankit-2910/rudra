"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { EMPLOYEES, roomById, type EmployeeRole } from "../lib/rooms";
import { speak, stopSpeaking, synthesisSupported } from "../lib/voice";
import AvatarCard from "./AvatarCard";
import RoomDashboard from "./RoomDashboard";

interface Message {
  from: "user" | "ai";
  text: string;
}

export interface Lead {
  name: string;
  company: string;
  purpose: string;
}

// Full employee panel: avatar card, room dashboard, chat thread, input.
// Mount with key={role} from the parent so switching rooms resets the thread.
export default function ChatPanel({
  role,
  pendingMessage,
  onPendingConsumed,
  onLead,
}: {
  role: EmployeeRole;
  pendingMessage: string | null;
  onPendingConsumed: () => void;
  onLead: (lead: Lead) => void;
}) {
  const employee = EMPLOYEES[role];
  const color = roomById(employee.room).color;
  const [messages, setMessages] = useState<Message[]>([
    { from: "ai", text: employee.tagline },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [tts, setTts] = useState(true);
  // Decided on mount, not during render — SSR has no speechSynthesis and
  // rendering the toggle server-side causes a hydration mismatch.
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTtsAvailable(synthesisSupported());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setInput("");
      setBusy(true);
      const history = messages;
      setMessages((m) => [...m, { from: "user", text: trimmed }]);
      let reply = "";
      let lead: Lead | undefined;
      try {
        const res = await fetch("/api/employee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, message: trimmed, history }),
        });
        const data = await res.json();
        reply = data.reply ?? "";
        lead = data.lead;
      } catch {
        reply = "Connection hiccup — please try that once more.";
      }
      setBusy(false);
      setMessages((m) => [...m, { from: "ai", text: reply }]);
      if (lead) onLead(lead);
      if (tts && synthesisSupported()) {
        speak(
          reply,
          () => setSpeaking(true),
          () => setSpeaking(false)
        );
      }
    },
    [busy, messages, role, tts, onLead]
  );

  // Voice commands like "prepare proposal" arrive as a pending message.
  // Wait out any in-flight request (send() would drop the text while busy).
  useEffect(() => {
    if (pendingMessage && !busy) {
      onPendingConsumed();
      void send(pendingMessage);
    }
  }, [pendingMessage, busy, onPendingConsumed, send]);

  return (
    <div className="flex h-full flex-col bg-panel/95 backdrop-blur">
      <AvatarCard employee={employee} color={color} speaking={speaking} />
      <RoomDashboard role={role} speaking={speaking} />

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.from === "user" ? "flex justify-end" : "flex"}>
            <div
              className={
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed " +
                (m.from === "user" ? "bg-accent2/20 text-white" : "bg-base/80 text-[#dfe6f2]")
              }
              style={m.from === "ai" ? { border: `1px solid ${color}33` } : undefined}
            >
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-1.5 pl-2 text-muted">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="wave-bar inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: color, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-edge p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${employee.name} anything…`}
          className="min-w-0 flex-1 rounded-lg border border-edge bg-base px-3 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-accent2/60"
        />
        {ttsAvailable && (
          <button
            type="button"
            title={tts ? "Voice replies on" : "Voice replies off"}
            onClick={() => {
              if (tts) stopSpeaking();
              setTts(!tts);
            }}
            className="rounded-lg border border-edge px-2.5 py-2 text-sm"
            style={{ color: tts ? color : "#4b5a75" }}
          >
            {tts ? "🔊" : "🔇"}
          </button>
        )}
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-lg px-3.5 py-2 text-sm font-semibold text-base disabled:opacity-40"
          style={{ background: color }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
