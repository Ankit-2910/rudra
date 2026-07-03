"use client";

// Speaking indicator: five bars with staggered animation, tinted with the
// room accent. Static low bars when idle.
export default function Waveform({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex h-5 items-center gap-[3px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={active ? "wave-bar" : ""}
          style={{
            display: "inline-block",
            width: 3,
            height: 18,
            borderRadius: 2,
            background: color,
            opacity: active ? 0.95 : 0.25,
            transform: active ? undefined : "scaleY(0.25)",
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}
