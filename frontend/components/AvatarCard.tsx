"use client";
import type { Employee } from "../lib/rooms";
import Waveform from "./Waveform";

// Animated employee card: monogram avatar that pulses while speaking,
// name/title, and the speaking waveform.
export default function AvatarCard({
  employee,
  color,
  speaking,
}: {
  employee: Employee;
  color: string;
  speaking: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-edge p-4">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-base transition-transform duration-300"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}, ${color}66)`,
          transform: speaking ? "scale(1.08)" : "scale(1)",
          boxShadow: speaking ? `0 0 24px ${color}88` : `0 0 10px ${color}33`,
        }}
      >
        {employee.monogram}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{employee.name}</span>
          <span className="text-xs text-muted">{employee.title}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: speaking ? color : "#3c4a63" }}
          />
          {speaking ? "Speaking…" : "Online"}
        </div>
      </div>
      <Waveform active={speaking} color={color} />
    </div>
  );
}
