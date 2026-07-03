"use client";
import { EMPLOYEES, ROOMS, type RoomId } from "../lib/rooms";

// 2D isometric floor plan used on mobile and when WebGL is unavailable.
// Same room and employee structure as the 3D headquarters.

const CELLS: Record<RoomId, { i: number; j: number }> = {
  ceo: { i: 0, j: 0 },
  finance: { i: 2, j: 0 },
  lobby: { i: 1, j: 1 },
  legal: { i: 0, j: 2 },
  tenders: { i: 2, j: 2 },
};

const HALF_W = 118;
const HALF_H = 58;
const DEPTH = 16;

function center(i: number, j: number) {
  return { cx: 350 + (i - j) * 128, cy: 100 + (i + j) * 74 };
}

export default function IsometricFallback({
  activeRoom,
  onRoomSelect,
}: {
  activeRoom: RoomId;
  onRoomSelect: (room: RoomId) => void;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg viewBox="0 0 700 480" className="h-full w-full max-w-3xl" role="img" aria-label="RUDRA headquarters floor plan">
        {ROOMS.map((room) => {
          const { i, j } = CELLS[room.id];
          const { cx, cy } = center(i, j);
          const active = room.id === activeRoom;
          const employee = EMPLOYEES[room.employee];
          const top = `${cx},${cy - HALF_H} ${cx + HALF_W},${cy} ${cx},${cy + HALF_H} ${cx - HALF_W},${cy}`;
          const rightWall = `${cx + HALF_W},${cy} ${cx},${cy + HALF_H} ${cx},${cy + HALF_H + DEPTH} ${cx + HALF_W},${cy + DEPTH}`;
          const leftWall = `${cx - HALF_W},${cy} ${cx},${cy + HALF_H} ${cx},${cy + HALF_H + DEPTH} ${cx - HALF_W},${cy + DEPTH}`;
          return (
            <g
              key={room.id}
              onClick={() => onRoomSelect(room.id)}
              style={{ cursor: "pointer" }}
              opacity={active ? 1 : 0.82}
            >
              <polygon points={leftWall} fill="#0d1320" />
              <polygon points={rightWall} fill="#141c2e" />
              <polygon
                points={top}
                fill={active ? `${room.color}2e` : "#151f33"}
                stroke={room.color}
                strokeWidth={active ? 2.5 : 1.2}
              />
              <circle
                cx={cx}
                cy={cy - 12}
                r={13}
                fill={room.color}
                opacity={0.9}
              />
              <text
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#0a0e17"
              >
                {employee.monogram}
              </text>
              <text
                x={cx}
                y={cy + 22}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill={active ? "#ffffff" : "#b9c5d8"}
              >
                {room.name}
              </text>
              <text
                x={cx}
                y={cy + 38}
                textAnchor="middle"
                fontSize="10"
                fill="#8b9bb4"
              >
                {employee.name} · {employee.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
