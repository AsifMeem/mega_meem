"use client";

import { useEffect, useState } from "react";
import { getBenchRuns, getBenchSummary } from "@/lib/api";
import type { BenchRun, BenchSummaryRow } from "@/lib/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function BenchPage() {
  const [runs, setRuns] = useState<BenchRun[]>([]);
  const [summary, setSummary] = useState<BenchSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getBenchRuns(200), getBenchSummary()])
      .then(([rs, sm]) => {
        setRuns(rs.runs);
        setSummary(sm.rows);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load benchmark data");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="mt-3 text-sm text-gray-400">Loading benchmarks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm font-medium text-gray-900">Failed to load benchmarks</p>
        <p className="mt-1 text-sm text-gray-400">{error}</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm font-medium text-gray-900">No benchmark runs yet</p>
        <p className="mt-1 text-sm text-gray-400">Run a benchmark to populate this dashboard</p>
      </div>
    );
  }

  const overallSeries = buildMetricSeries(summary, "score_overall");
  const typeBreakdown = buildTypeBreakdown(summary);

  return (
    <div className="px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Benchmarks</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Runs" value={runs.length} />
          <SummaryCard label="Latest Scenario" value={runs[0]?.scenario_id ?? "-"} />
          <SummaryCard label="Latest Provider" value={runs[0]?.provider ?? "-"} />
          <SummaryCard label="Latest Overall Score" value={getLatestScore(runs[0]) ?? "-"} />
        </div>

        <ChartSection title="Overall Score Over Time">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={overallSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 1]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#6B7280" }}
              />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#2563EB" dot={false} name="Overall" />
            </LineChart>
          </ResponsiveContainer>
        </ChartSection>

        <ChartSection title="Score Breakdown by Type (Latest Run)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={typeBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="metric" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 1]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#6B7280" }}
              />
              <Bar dataKey="value" fill="#059669" name="Score" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Recent Runs</h3>
          <div className="space-y-2">
            {runs.slice(0, 8).map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 last:border-b-0"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    <a className="hover:underline" href={`/eval/bench/${run.id}`}>
                      {run.title}
                    </a>
                  </div>
                  <div className="text-xs text-gray-400">{run.provider} · {run.model} · {run.scenario_id}</div>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {run.started_at ? new Date(run.started_at).toLocaleString() : "-"}
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {getLatestScore(run) ?? "-"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-lg font-semibold font-mono text-gray-900">{value}</div>
    </div>
  );
}

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function buildMetricSeries(rows: BenchSummaryRow[], metric: string) {
  const filtered = rows.filter((r) => r.metric === metric);
  const sorted = [...filtered].sort(
    (a, b) => new Date(a.started_at ?? 0).getTime() - new Date(b.started_at ?? 0).getTime()
  );
  return sorted.map((r) => ({
    time: r.started_at ? new Date(r.started_at).toLocaleString() : "-",
    score: r.value,
  }));
}

function buildTypeBreakdown(rows: BenchSummaryRow[]) {
  const latest = rows
    .slice()
    .sort((a, b) => new Date(b.started_at ?? 0).getTime() - new Date(a.started_at ?? 0).getTime());
  const latestRunId = latest[0]?.run_id;
  const filtered = latest.filter((r) => r.run_id === latestRunId && r.metric.startsWith("score_"));
  return filtered
    .filter((r) => r.metric !== "score_overall")
    .map((r) => ({
      metric: r.metric.replace("score_", ""),
      value: r.value,
    }));
}

function getLatestScore(run: BenchRun | undefined) {
  if (!run?.summary || typeof run.summary !== "object") return null;
  const scores = (run.summary as { scores?: Record<string, number> }).scores;
  if (!scores) return null;
  const score = scores["score_overall"];
  return score !== undefined ? score.toFixed(2) : null;
}
