"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatPanel, { type Lead } from "../components/ChatPanel";
import IsometricFallback from "../components/IsometricFallback";
import Landing from "../components/Landing";
import VoiceControls from "../components/VoiceControls";
import { warmUpVoices } from "../lib/voice";
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

// Guided tour script: one stop per department, skipping the lobby (the
// visitor is already there). Each prompt is auto-sent when that room mounts.
const TOUR_STOPS: { room: RoomId; prompt: string }[] = [
  { room: "ceo", prompt: "Please introduce yourself and give me a quick tour of what Shivanchal does." },
  { room: "finance", prompt: "Please introduce yourself and walk me through the finance dashboard." },
  { room: "legal", prompt: "Please introduce yourself and tell me about FinePrint." },
  { room: "tenders", prompt: "Please introduce yourself and tell me about BidSight." },
];

// How long a visitor must stay in one room before it's a real signal worth a
// Slack ping, versus just passing through.
const DWELL_THRESHOLD_MS = 45_000;

export default function Home() {
  const [mode, setMode] = useState<"3d" | "2d" | null>(null);
  const [entered, setEntered] = useState(false);
  const [activeRoom, setActiveRoom] = useState<RoomId>("lobby");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [touring, setTouring] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const historyRef = useRef<RoomId[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellNotified = useRef<Set<RoomId>>(new Set());
  const visitorNameRef = useRef<string | null>(null);
  visitorNameRef.current = visitorName;

  // Decide 3D vs 2D once on mount: WebGL plus a reasonably wide viewport.
  // Also warm up the speech synthesis voice list — the browser loads it
  // asynchronously, and doing this early avoids the first reply falling
  // back to a low-quality default voice while the real list is still loading.
  useEffect(() => {
    setMode(webglAvailable() && window.innerWidth >= 768 ? "3d" : "2d");
    warmUpVoices();
  }, []);

  // Dwell-time tracking: if a visitor stays in one room past the threshold,
  // fire a one-time Slack signal so the team can see live interest forming.
  useEffect(() => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    if (dwellNotified.current.has(activeRoom)) return;
    dwellTimer.current = setTimeout(() => {
      dwellNotified.current.add(activeRoom);
      const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backend) return;
      fetch(`${backend.replace(/\/$/, "")}/events/dwell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: roomById(activeRoom).name,
          seconds: Math.round(DWELL_THRESHOLD_MS / 1000),
          visitor_name: visitorNameRef.current,
        }),
      }).catch(() => {
        // Best-effort signal — silently drop on failure.
      });
    }, DWELL_THRESHOLD_MS);
    return () => {
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
    };
  }, [activeRoom]);

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

  // Guided tour: Gokarna → Manibhadra → Virabhadra → Bhairava, each room's
  // question auto-sent on arrival and the tour advancing once the reply
  // finishes speaking (see ChatPanel's onReplyComplete).
  const startTour = useCallback(() => {
    setTouring(true);
    setTourStep(0);
    navigate(TOUR_STOPS[0].room);
    showToast("Starting the guided tour — sit back and listen.");
  }, [navigate, showToast]);

  const handleTourReplyComplete = useCallback(() => {
    if (!touring) return;
    const next = tourStep + 1;
    if (next >= TOUR_STOPS.length) {
      setTouring(false);
      showToast("That's the full tour — feel free to explore or ask anything.");
      return;
    }
    setTimeout(() => {
      setTourStep(next);
      navigate(TOUR_STOPS[next].room);
    }, 1000);
  }, [touring, tourStep, navigate, showToast]);

  const handleLead = useCallback(
    (lead: Lead) => {
      // Cross-room memory: every employee after Reception can now greet and
      // address the visitor by name (threaded through /api/employee).
      setVisitorName(lead.name.split(/\s+/)[0]);
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
    <main className="relative flex h-dvh flex-col md:flex-row">
      {/* Premium landing gate — the 3D scene loads behind it */}
      {!entered && <Landing onEnter={() => setEntered(true)} />}
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
        <header className="pointer-events-none absolute left-4 top-4 z-10 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-widest text-white">
              RUDRA<span className="text-accent">.</span>
            </h1>
            <p className="text-xs text-muted">
              Shivanchal Consultants — a company run by AI employees
            </p>
          </div>
        </header>

        {!touring && (
          <button
            onClick={startTour}
            className="nav-pill cta-glow absolute right-4 top-4 z-10 rounded-full bg-accent px-4 py-2 text-xs font-bold text-base"
          >
            🎬 Take the Tour
          </button>
        )}
        {touring && (
          <div className="absolute right-4 top-4 z-10 rounded-full border border-accent/50 bg-panel/90 px-4 py-2 text-xs font-semibold text-accent backdrop-blur">
            Touring — stop {tourStep + 1} of {TOUR_STOPS.length}
          </div>
        )}

        {/* Navigation: always-available buttons + mic */}
        <nav className="absolute bottom-3 left-1/2 z-10 flex w-full max-w-[95%] -translate-x-1/2 flex-wrap items-center justify-center gap-2 px-2">
          <button
            onClick={goBack}
            className="nav-pill rounded-full border border-edge bg-panel/90 px-3.5 py-2 text-xs font-medium text-muted backdrop-blur hover:text-white"
          >
            ← Back
          </button>
          {ROOMS.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(r.id)}
              className="nav-pill rounded-full border px-3.5 py-2 text-xs font-medium backdrop-blur"
              style={{
                borderColor: activeRoom === r.id ? r.color : "#1f2a3d",
                color: activeRoom === r.id ? r.color : "#b9c5d8",
                background:
                  activeRoom === r.id ? `${r.color}1a` : "rgba(17,24,39,0.85)",
                boxShadow: activeRoom === r.id ? `0 0 18px ${r.color}44` : undefined,
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
          visitorName={visitorName}
          tourPrompt={
            touring && TOUR_STOPS[tourStep]?.room === activeRoom
              ? TOUR_STOPS[tourStep].prompt
              : null
          }
          onReplyComplete={handleTourReplyComplete}
        />
      </aside>
    </main>
  );
}
