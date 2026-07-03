// Shared room + employee registry. Single source of truth for the 3D scene,
// the 2D isometric fallback, voice command matching, and the chat system.

export type RoomId = "lobby" | "ceo" | "finance" | "legal" | "tenders";
export type EmployeeRole = "reception" | "ceo" | "finance" | "legal" | "tender";

export interface Room {
  id: RoomId;
  name: string;
  employee: EmployeeRole;
  // Hex accent used for the room's lighting/signage in 3D and 2D.
  color: string;
  // Lowercase keywords (English + Hindi, Roman and Devanagari) that a voice
  // command must contain to navigate to this room.
  voiceKeywords: string[];
}

export interface Employee {
  role: EmployeeRole;
  name: string;
  title: string;
  room: RoomId;
  // Short line shown on the avatar card before any chat happens.
  tagline: string;
  // Two-letter monogram for the avatar.
  monogram: string;
}

export const ROOMS: Room[] = [
  {
    id: "lobby",
    name: "Reception Lobby",
    employee: "reception",
    color: "#f59e0b",
    voiceKeywords: ["lobby", "reception", "रिसेप्शन", "लॉबी", "swagat", "home"],
  },
  {
    id: "ceo",
    name: "CEO Office",
    employee: "ceo",
    color: "#38bdf8",
    voiceKeywords: ["ceo", "boss", "सीईओ", "office", "vision"],
  },
  {
    id: "finance",
    name: "Finance Department",
    employee: "finance",
    color: "#34d399",
    voiceKeywords: ["finance", "फाइनेंस", "paisa", "पैसा", "revenue", "accounts"],
  },
  {
    id: "legal",
    name: "Legal Department",
    employee: "legal",
    color: "#a78bfa",
    voiceKeywords: ["legal", "लीगल", "kanoon", "कानून", "contract", "fineprint"],
  },
  {
    id: "tenders",
    name: "Tender Intelligence",
    employee: "tender",
    color: "#fb7185",
    voiceKeywords: ["tender", "टेंडर", "bid", "bidsight", "government", "सरकारी"],
  },
];

export const EMPLOYEES: Record<EmployeeRole, Employee> = {
  reception: {
    role: "reception",
    name: "RUDRA",
    title: "Reception AI",
    room: "lobby",
    tagline: "Namaste! Main RUDRA hoon — Shivanchal ki AI receptionist. May I have your name?",
    monogram: "RU",
  },
  ceo: {
    role: "ceo",
    name: "Arya",
    title: "CEO AI",
    room: "ceo",
    tagline: "Welcome to my office. Ask me about our vision, services, or take the guided tour.",
    monogram: "AR",
  },
  finance: {
    role: "finance",
    name: "Vitta",
    title: "Finance AI",
    room: "finance",
    tagline: "Live numbers, honest numbers. Ask me about revenue, projects, or client health.",
    monogram: "VI",
  },
  legal: {
    role: "legal",
    name: "Nyaya",
    title: "Legal AI",
    room: "legal",
    tagline: "I read the fine print so you don't have to — powered by FinePrint.",
    monogram: "NY",
  },
  tender: {
    role: "tender",
    name: "Bodhi",
    title: "Tender AI",
    room: "tenders",
    tagline: "Government tender intelligence for Indian SMEs — powered by BidSight.",
    monogram: "BO",
  },
};

export function roomById(id: RoomId): Room {
  return ROOMS.find((r) => r.id === id)!;
}

// Voice keywords for global commands.
export const GO_BACK_KEYWORDS = ["go back", "back", "wapas", "वापस", "peeche", "पीछे"];
export const PROPOSAL_KEYWORDS = ["proposal", "प्रस्ताव", "prastav", "quote", "quotation"];

// Match a transcript to a navigation target. Returns null when nothing matches.
export function matchVoiceCommand(
  transcript: string
): { kind: "room"; room: RoomId } | { kind: "back" } | { kind: "proposal" } | null {
  const t = transcript.toLowerCase().trim();
  if (GO_BACK_KEYWORDS.some((k) => t.includes(k))) return { kind: "back" };
  if (PROPOSAL_KEYWORDS.some((k) => t.includes(k))) return { kind: "proposal" };
  for (const room of ROOMS) {
    if (room.voiceKeywords.some((k) => t.includes(k))) return { kind: "room", room: room.id };
  }
  return null;
}
