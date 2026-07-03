"use client";
import type { EmployeeRole } from "../lib/rooms";
import FinanceDashboard from "./FinanceDashboard";

// Per-room dashboard block rendered above the chat. Finance gets the live
// Chart.js KPI board; Legal and Tenders showcase their shipped products;
// CEO shows the service portfolio; Reception shows quick routes.
export default function RoomDashboard({
  role,
  speaking,
}: {
  role: EmployeeRole;
  speaking: boolean;
}) {
  if (role === "finance") return <FinanceDashboard speaking={speaking} />;

  if (role === "legal") {
    return (
      <div className="border-b border-edge p-4">
        <div className="rounded-lg border border-edge bg-base/60 p-3">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: "#a78bfa" }}>
              FinePrint
            </span>
            <span className="rounded bg-edge px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
              Shipped product
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            AI contract analysis — flags risky clauses, one-sided terms, and missing
            protections before you sign.
          </p>
          <a
            href="https://fine-print-two.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded-md px-3 py-1.5 text-xs font-semibold text-base"
            style={{ background: "#a78bfa" }}
          >
            Analyse a contract live →
          </a>
        </div>
      </div>
    );
  }

  if (role === "tender") {
    return (
      <div className="border-b border-edge p-4">
        <div className="rounded-lg border border-edge bg-base/60 p-3">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: "#fb7185" }}>
              BidSight
            </span>
            <span className="rounded bg-edge px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
              Shipped product
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Government tender intelligence for Indian SMEs — GeM and state-portal
            tracking, eligibility matching, deadline summaries. Built on 16 years of
            real government-sector operations.
          </p>
        </div>
      </div>
    );
  }

  if (role === "ceo") {
    return (
      <div className="border-b border-edge p-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            "AI product development",
            "Govt-sector consulting",
            "Tender intelligence",
            "Contract analysis",
          ].map((s) => (
            <div key={s} className="rounded-lg bg-base/60 p-2.5 text-muted">
              {s}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Reception: where to go.
  return (
    <div className="border-b border-edge p-4">
      <p className="text-xs leading-relaxed text-muted">
        Say or click a room: <span className="text-accent2">CEO Office</span> for vision,{" "}
        <span style={{ color: "#34d399" }}>Finance</span> for live KPIs,{" "}
        <span style={{ color: "#a78bfa" }}>Legal</span> for FinePrint,{" "}
        <span style={{ color: "#fb7185" }}>Tenders</span> for BidSight.
      </p>
    </div>
  );
}
