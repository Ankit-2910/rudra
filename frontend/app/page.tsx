"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatPanel, { type Lead } from "../components/ChatPanel";
import IsometricFallback from "../components/IsometricFallback";
import VoiceControls from "../components/VoiceControls";
import { EMPLOYEES, ROOMS, matchVoiceCommand, roomById, type RoomId } from "../lib/rooms";

const Scene3D = dynamic(() => import("../components/Scene3D"), { ssr: false });

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export default function Home() {
  const [mode, setMode] = useState<"3d" | "2d" | null>(null);
  const [activeRoom, setActiveRoom] = useState<RoomId>("lobby");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const historyRef = useRef<RoomId[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Decide 3D vs 2D once on mount: WebGL plus a reasonably wide viewport.
  useEffect(() => {
    setMode(webglAvailable() && window.innerWidth >= 768 ? "3d" : "2d");
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const navigate = useCallback(
    (room: RoomId) => {
      setActiveRoom((current) => {
        if (room === current) return current;
        historyRef.current.push(current);
        return room;
      });
    },
    []
  );

  const goBack = useCallback(() => {
    const prev = historyRef.current.pop();
    setActiveRoom(prev ?? "lobby");
  }, []);

  const handleTranscript = useCallback(
    (transcript: string) => {
      const cmd = matchVoiceCommand(transcript);
      if (!cmd) {
        showToast(`Heard "${transcript.split(" | ")[0]}" — try "Show Finance" or "Reception".`);
        return;
      }
      if (cmd.kind === "back") {
        goBack();
      } else if (cmd.kind === "proposal") {
        navigate("lobby");
        setPendingMessage("I'd like a proposal prepared for my company, please.");
        showToast("Routing you to Reception for a proposal…");
      } else {
        navigate(cmd.room);
      }
    },
    [goBack, navigate, showToast]
  );

  const handleLead = useCallback(
    (lead: Lead) => {
      const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backend) {
        showToast("Details noted — thank you!");
        return;
      }
      fetch(`${backend.replace(/\/$/, "")}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, source: "reception" }),
      })
        .then((r) => {
          showToast(
            r.ok
              ? "Details shared with the Shivanchal team ✓"
              : "Details noted — thank you!"
          );
        })
        .catch(() => showToast("Details noted — thank you!"));
    },
    [showToast]
  );

  const room = roomById(activeRoom);
  const employee = EMPLOYEES[room.employee];

  return (
    <main className="flex h-dvh flex-col md:flex-row">
      {/* Headquarters view */}
      <div className="relative h-[42dvh] min-h-0 flex-none md:h-auto md:flex-1">
        {mode === "3d" && (
          <Scene3D activeRoom={activeRoom} onRoomSelect={navigate} />
        )}
        {mode === "2d" && (
          <div className="absolute inset-0 p-3 pb-16">
            <IsometricFallback activeRoom={activeRoom} onRoomSelect={navigate} />
          </div>
        )}

        {/* Brand */}
        <header className="pointer-events-none absolute left-4 top-4 z-10">
          <h1 className="text-lg font-bold tracking-widest text-white">
            RUDRA<span className="text-accent">.</span>
          </h1>
          <p className="text-xs text-muted">
            Shivanchal Consultants — a company run by AI employees
          </p>
        </header>

        {/* Navigation: always-available buttons + mic */}
        <nav className="absolute bottom-3 left-1/2 z-10 flex w-full max-w-[95%] -translate-x-1/2 flex-wrap items-center justify-center gap-2 px-2">
          <button
            onClick={goBack}
            className="rounded-full border border-edge bg-panel/90 px-3.5 py-2 text-xs font-medium text-muted hover:text-white"
          >
            ← Back
          </button>
          {ROOMS.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(r.id)}
              className="rounded-full border px-3.5 py-2 text-xs font-medium transition-colors"
              style={{
                borderColor: activeRoom === r.id ? r.color : "#1f2a3d",
                color: activeRoom === r.id ? r.color : "#b9c5d8",
                background:
                  activeRoom === r.id ? `${r.color}1a` : "rgba(17,24,39,0.9)",
              }}
            >
              {r.id === "lobby" ? "Reception" : r.name.split(" ")[0]}
            </button>
          ))}
          <VoiceControls onTranscript={handleTranscript} />
        </nav>

        {toast && (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-edge bg-panel/95 px-4 py-2 text-xs text-white shadow-lg">
            {toast}
          </div>
        )}
      </div>

      {/* Employee panel — key resets the thread when the employee changes */}
      <aside className="min-h-0 flex-1 border-t border-edge md:w-[390px] md:flex-none md:border-l md:border-t-0">
        <ChatPanel
          key={employee.role}
          role={employee.role}
          pendingMessage={activeRoom === "lobby" ? pendingMessage : null}
          onPendingConsumed={() => setPendingMessage(null)}
          onLead={handleLead}
        />
      </aside>
    </main>
  );
}
