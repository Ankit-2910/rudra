"use client";
import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";

interface Kpis {
  revenue_trend: { labels: string[]; values: number[] };
  active_projects: number;
  client_health: number;
}

const SAMPLE: Kpis = {
  revenue_trend: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    values: [420000, 465000, 510000, 545000, 605000, 680000],
  },
  active_projects: 14,
  client_health: 92,
};

// Animated KPI dashboard for the Finance room. Pulls live data from the
// backend when configured, falls back to sample figures otherwise. While the
// Finance AI is speaking, the trend line subtly re-animates so the room feels
// alive alongside the voice.
export default function FinanceDashboard({ speaking }: { speaking: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [kpis, setKpis] = useState<Kpis>(SAMPLE);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backend) return;
    fetch(`${backend.replace(/\/$/, "")}/kpis`, { signal: AbortSignal.timeout(5000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.revenue_trend?.values) {
          setKpis(data);
          setLive(data.source === "supabase");
        }
      })
      .catch(() => {
        // Backend asleep or unreachable — sample data already in place.
      });
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: kpis.revenue_trend.labels,
        datasets: [
          {
            data: kpis.revenue_trend.values,
            borderColor: "#34d399",
            backgroundColor: "rgba(52, 211, 153, 0.12)",
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: "#34d399",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#8b9bb4", font: { size: 10 } }, grid: { display: false } },
          y: {
            ticks: {
              color: "#8b9bb4",
              font: { size: 10 },
              callback: (v) => `₹${Number(v) / 1000}k`,
            },
            grid: { color: "#1f2a3d" },
          },
        },
      },
    });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [kpis]);

  // Gentle data shimmer while the AI speaks.
  useEffect(() => {
    if (!speaking) return;
    const id = setInterval(() => {
      const chart = chartRef.current;
      if (!chart) return;
      chart.data.datasets[0].data = kpis.revenue_trend.values.map(
        (v) => v * (1 + (Math.random() - 0.5) * 0.04)
      );
      chart.update();
    }, 1200);
    return () => {
      clearInterval(id);
      const chart = chartRef.current;
      if (chart) {
        chart.data.datasets[0].data = [...kpis.revenue_trend.values];
        chart.update();
      }
    };
  }, [speaking, kpis]);

  return (
    <div className="border-b border-edge p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Revenue trend {live ? "(live)" : "(sample)"}
        </span>
      </div>
      <div className="h-28">
        <canvas ref={canvasRef} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-base/60 p-3">
          <div className="text-xl font-bold text-accent2">{kpis.active_projects}</div>
          <div className="text-xs text-muted">Active projects</div>
        </div>
        <div className="rounded-lg bg-base/60 p-3">
          <div className="text-xl font-bold" style={{ color: "#34d399" }}>
            {kpis.client_health}%
          </div>
          <div className="text-xs text-muted">Client health</div>
        </div>
      </div>
    </div>
  );
}
