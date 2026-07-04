"use client";
import { useCallback, useRef, useState } from "react";
import { EMPLOYEES, ROOMS } from "../lib/rooms";

// Premium landing overlay shown before the visitor enters the 3D headquarters.
// Floating employee cards with mouse-tilt, drifting gradient orbs, shimmer
// wordmark, and a glowing gate CTA. Fades out over the loading 3D scene.

const PRODUCTS: Record<string, string | undefined> = {
  legal: "FinePrint",
  tender: "BidSight",
};

function TiltCard({
  color,
  children,
  delay,
}: {
  color: string;
  children: React.ReactNode;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateY(-6px) scale(1.04)`;
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "";
    setHover(false);
  }, []);

  return (
    <div className="float-slow" style={{ animationDelay: `${delay}s` }}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={onLeave}
        className="tilt-card glass rounded-2xl px-4 py-3"
        style={{
          borderColor: hover ? `${color}88` : undefined,
          boxShadow: hover ? `0 18px 50px -12px ${color}55` : "0 8px 30px -14px rgba(0,0,0,0.8)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function Landing({ onEnter }: { onEnter: () => void }) {
  const [leaving, setLeaving] = useState(false);

  const enter = () => {
    setLeaving(true);
    setTimeout(onEnter, 650);
  };

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden bg-base transition-opacity duration-700"
      style={{ opacity: leaving ? 0 : 1, pointerEvents: leaving ? "none" : "auto" }}
    >
      {/* Ambient background: grid + drifting orbs */}
      <div className="landing-grid absolute inset-0" />
      <div
        className="orb h-96 w-96"
        style={{ top: "-8%", left: "-6%", ["--orb-color" as string]: "#f59e0b" }}
      />
      <div
        className="orb h-[28rem] w-[28rem]"
        style={{ bottom: "-12%", right: "-8%", animationDelay: "-6s", ["--orb-color" as string]: "#38bdf8" }}
      />
      <div
        className="orb h-72 w-72"
        style={{ top: "38%", left: "58%", animationDelay: "-12s", ["--orb-color" as string]: "#a78bfa" }}
      />

      <div className="relative flex max-h-full w-full max-w-5xl flex-col items-center gap-7 overflow-y-auto px-6 py-10 text-center">
        <div className="rise-in" style={{ animationDelay: "0.05s" }}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.4em] text-muted">
            Shivanchal Consultants · Bhopal, India
          </p>
          <h1 className="text-shimmer text-6xl font-black tracking-[0.18em] md:text-8xl">
            RUDRA
          </h1>
          <p className="mt-4 text-base text-[#c7d2e4] md:text-lg">
            India&apos;s digital twin company — <span className="text-accent">every employee is an AI</span>.
          </p>
          <p className="mt-1 text-sm text-muted">
            Walk the headquarters. Talk to the team. Every room is a shipped product.
          </p>
        </div>

        {/* Floating employee cards */}
        <div
          className="rise-in flex flex-wrap items-stretch justify-center gap-3 md:gap-4"
          style={{ animationDelay: "0.25s" }}
        >
          {ROOMS.map((room, i) => {
            const emp = EMPLOYEES[room.employee];
            const product = PRODUCTS[emp.role];
            return (
              <TiltCard key={room.id} color={room.color} delay={i * 0.7}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-base"
                    style={{ background: `radial-gradient(circle at 30% 30%, ${room.color}, ${room.color}66)` }}
                  >
                    {emp.monogram}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">{emp.name}</div>
                    <div className="text-[11px] text-muted">
                      {emp.title}
                      {product && (
                        <span style={{ color: room.color }}> · {product}</span>
                      )}
                    </div>
                  </div>
                </div>
              </TiltCard>
            );
          })}
        </div>

        {/* Stats strip */}
        <div
          className="rise-in flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-muted"
          style={{ animationDelay: "0.45s" }}
        >
          <span>
            <span className="font-bold text-white">16+ years</span> in government operations
          </span>
          <span className="hidden h-3 w-px bg-edge md:block" />
          <span>
            <span className="font-bold text-white">4 shipped products</span> embedded as employees
          </span>
          <span className="hidden h-3 w-px bg-edge md:block" />
          <span>
            <span className="font-bold text-white">Voice-driven</span> in English &amp; Hindi
          </span>
        </div>

        <div className="rise-in flex flex-col items-center gap-3" style={{ animationDelay: "0.6s" }}>
          <button
            onClick={enter}
            className="cta-glow nav-pill rounded-full bg-accent px-9 py-3.5 text-sm font-bold tracking-wide text-base hover:brightness-110"
          >
            Enter the Headquarters →
          </button>
          <p className="text-[11px] text-muted">
            🎙️ Voice enabled — try &quot;Show Finance&quot; or &quot;फाइनेंस दिखाओ&quot; once inside
          </p>
        </div>
      </div>
    </div>
  );
}
