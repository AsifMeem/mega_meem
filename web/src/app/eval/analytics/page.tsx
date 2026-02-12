"use client";

import { useEffect, useState } from "react";
import { getPerformanceStats, getTraces } from "@/lib/api";
import type { PerformanceStats, Trace } from "@/lib/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPerformanceStats(), getTraces(500)])
      .then(([ps, ts]) => {
        setStats(ps);
        setTraces(ts.traces);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="mt-3 text-sm text-gray-400">Loading analytics...</p>
      </div>
    );
  }

  if (!stats || traces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm font-medium text-gray-900">No data yet</p>
        <p className="mt-1 text-sm text-gray-400">Send some messages to generate traces</p>
      </div>
    );
  }

  const latencyData = buildTimeSeries(traces);
  const ratingData = buildRatingDistribution(traces);
  const tokenData = buildTokenSeries(traces);
  const providers = Object.keys(stats.by_provider);
  const colors = ["#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED"];

  return (
    <div className="px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Analytics</h1>

        {/* Provider summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Total Calls" value={stats.total_calls} />
          <SummaryCard
            label="Avg Latency"
            value={`${stats.avg_latency_ms.toFixed(0)}ms`}
          />
          <SummaryCard
            label="Avg Rating"
            value={stats.avg_rating !== null ? stats.avg_rating.toFixed(1) : "-"}
          />
          <SummaryCard
            label="Total Tokens"
            value={`${stats.total_prompt_tokens + stats.total_completion_tokens}`}
          />
        </div>

        {/* Per-provider breakdown */}
        {providers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {providers.map((p) => {
              const ps = stats.by_provider[p];
              return (
                <div key={p} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="text-xs text-gray-400 mb-1">{p}</div>
                  <div className="text-sm text-gray-900">
                    <span className="font-mono">{ps.calls}</span> calls
                    {" · "}
                    <span className="font-mono">{ps.avg_latency_ms.toFixed(0)}ms</span> avg
                    {ps.avg_rating !== null && (
                      <> {" · "} <span className="font-mono">{ps.avg_rating.toFixed(1)}</span> rating</>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Latency over time */}
        <ChartSection title="Latency Over Time">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} unit="ms" />
              <Tooltip
                contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#6B7280" }}
              />
              <Legend />
              {providers.map((p, i) => (
                <Line
                  key={p}
                  type="monotone"
                  dataKey={p}
                  stroke={colors[i % colors.length]}
                  dot={false}
                  name={p}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartSection>

        {/* Token usage over time */}
        <ChartSection title="Token Usage Over Time">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={tokenData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#6B7280" }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="prompt"
                stackId="1"
                stroke="#7C3AED"
                fill="#7C3AED"
                fillOpacity={0.1}
                name="Prompt Tokens"
              />
              <Area
                type="monotone"
                dataKey="completion"
                stackId="1"
                stroke="#059669"
                fill="#059669"
                fillOpacity={0.1}
                name="Completion Tokens"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartSection>

        {/* Rating distribution */}
        {ratingData.some((d) => d.count > 0) && (
          <ChartSection title="Rating Distribution">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ratingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="rating" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "#6B7280" }}
                />
                <Bar dataKey="count" fill="#2563EB" name="Count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartSection>
        )}
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

function buildTimeSeries(traces: Trace[]) {
  const sorted = [...traces].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const buckets = new Map<string, Record<string, number[]>>();

  for (const t of sorted) {
    const d = new Date(t.timestamp);
    const key = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
    if (!buckets.has(key)) buckets.set(key, {});
    const bucket = buckets.get(key)!;
    if (!bucket[t.provider]) bucket[t.provider] = [];
    bucket[t.provider].push(t.latency_ms);
  }

  return Array.from(buckets.entries()).map(([time, providers]) => {
    const row: Record<string, string | number> = { time };
    for (const [p, latencies] of Object.entries(providers)) {
      row[p] = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    }
    return row;
  });
}

function buildTokenSeries(traces: Trace[]) {
  const sorted = [...traces].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const buckets = new Map<string, { prompt: number; completion: number }>();

  for (const t of sorted) {
    const d = new Date(t.timestamp);
    const key = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
    if (!buckets.has(key)) buckets.set(key, { prompt: 0, completion: 0 });
    const bucket = buckets.get(key)!;
    bucket.prompt += t.prompt_tokens ?? 0;
    bucket.completion += t.completion_tokens ?? 0;
  }

  return Array.from(buckets.entries()).map(([time, data]) => ({
    time,
    ...data,
  }));
}

function buildRatingDistribution(traces: Trace[]) {
  const counts = [0, 0, 0, 0, 0];
  for (const t of traces) {
    if (t.rating_score !== null && t.rating_score >= 1 && t.rating_score <= 5) {
      counts[t.rating_score - 1]++;
    }
  }
  return counts.map((count, i) => ({ rating: i + 1, count }));
}
