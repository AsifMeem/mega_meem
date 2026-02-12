"use client";

import { useEffect, useState } from "react";
import { getPerformanceStats, getSessions, getTraces } from "@/lib/api";
import type { PerformanceStats, Session, Trace } from "@/lib/types";

type Mode = "provider" | "session";

export default function ComparePage() {
  const [mode, setMode] = useState<Mode>("provider");

  return (
    <div className="px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-6">Compare</h1>

        <div className="flex gap-1 mb-6">
          {(["provider", "session"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                mode === m
                  ? "text-blue-600 bg-blue-50 border border-blue-200"
                  : "text-gray-500 bg-white border border-gray-200 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {m === "provider" ? "Provider vs Provider" : "Session vs Session"}
            </button>
          ))}
        </div>

        {mode === "provider" ? <ProviderCompare /> : <SessionCompare />}
      </div>
    </div>
  );
}

function ProviderCompare() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");

  useEffect(() => {
    getPerformanceStats().then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="mt-3 text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  const providers = Object.keys(stats.by_provider);
  if (providers.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm font-medium text-gray-900">Not enough data</p>
        <p className="mt-1 text-sm text-gray-400">Need at least 2 providers with data to compare</p>
      </div>
    );
  }

  const leftStats = left ? stats.by_provider[left] : null;
  const rightStats = right ? stats.by_provider[right] : null;

  return (
    <div className="space-y-6">
      <div className="flex gap-6">
        <div className="flex-1">
          <label className="text-xs text-gray-400 mb-1 block">Provider A</label>
          <select
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Select...</option>
            {providers.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-2 text-sm text-gray-400 font-medium">vs</div>
        <div className="flex-1">
          <label className="text-xs text-gray-400 mb-1 block">Provider B</label>
          <select
            value={right}
            onChange={(e) => setRight(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Select...</option>
            {providers.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {leftStats && rightStats && (
        <div className="grid grid-cols-2 gap-6">
          <CompareCard name={left} stats={leftStats} />
          <CompareCard name={right} stats={rightStats} />
        </div>
      )}
    </div>
  );
}

function CompareCard({
  name,
  stats,
}: {
  name: string;
  stats: { calls: number; avg_latency_ms: number; avg_rating: number | null };
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
      <div className="space-y-2 text-sm">
        <Row label="Calls" value={stats.calls} />
        <Row label="Avg Latency" value={`${stats.avg_latency_ms.toFixed(0)}ms`} />
        <Row
          label="Avg Rating"
          value={stats.avg_rating !== null ? `${stats.avg_rating.toFixed(1)}/5` : "-"}
        />
      </div>
    </div>
  );
}

function SessionCompare() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [leftTraces, setLeftTraces] = useState<Trace[]>([]);
  const [rightTraces, setRightTraces] = useState<Trace[]>([]);

  useEffect(() => {
    getSessions().then((data) => setSessions(data.sessions));
  }, []);

  useEffect(() => {
    if (leftId) {
      getTraces(500, 0, leftId).then((data) => setLeftTraces(data.traces));
    }
  }, [leftId]);

  useEffect(() => {
    if (rightId) {
      getTraces(500, 0, rightId).then((data) => setRightTraces(data.traces));
    }
  }, [rightId]);

  if (sessions.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm font-medium text-gray-900">Not enough sessions</p>
        <p className="mt-1 text-sm text-gray-400">Create sessions from the nav bar to compare</p>
      </div>
    );
  }

  const leftSession = sessions.find((s) => s.id === leftId);
  const rightSession = sessions.find((s) => s.id === rightId);

  return (
    <div className="space-y-6">
      <div className="flex gap-6">
        <div className="flex-1">
          <label className="text-xs text-gray-400 mb-1 block">Session A</label>
          <select
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Select...</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.note || `${s.config_snapshot.provider} / ${s.config_snapshot.model}`}
                {s.is_active ? " (active)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-2 text-sm text-gray-400 font-medium">vs</div>
        <div className="flex-1">
          <label className="text-xs text-gray-400 mb-1 block">Session B</label>
          <select
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Select...</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.note || `${s.config_snapshot.provider} / ${s.config_snapshot.model}`}
                {s.is_active ? " (active)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {leftSession && rightSession && (
        <div className="grid grid-cols-2 gap-6">
          <SessionCard session={leftSession} traces={leftTraces} />
          <SessionCard session={rightSession} traces={rightTraces} />
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, traces }: { session: Session; traces: Trace[] }) {
  const avgLatency =
    traces.length > 0
      ? traces.reduce((sum, t) => sum + t.latency_ms, 0) / traces.length
      : 0;
  const rated = traces.filter((t) => t.rating_score !== null);
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, t) => sum + (t.rating_score ?? 0), 0) / rated.length
      : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">
        {session.note || "Untitled Session"}
      </h3>
      <div className="text-xs text-gray-400">
        {session.config_snapshot.provider} / {session.config_snapshot.model} ·{" "}
        {session.config_snapshot.context_messages} context msgs
      </div>
      <div className="space-y-2 text-sm">
        <Row label="Messages" value={session.message_count} />
        <Row label="Traces" value={traces.length} />
        <Row
          label="Avg Latency"
          value={avgLatency > 0 ? `${avgLatency.toFixed(0)}ms` : "-"}
        />
        <Row
          label="Avg Rating"
          value={avgRating !== null ? `${avgRating.toFixed(1)}/5` : "-"}
        />
        <Row
          label="Status"
          value={session.is_active ? "Active" : "Ended"}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-900 font-mono font-medium">{value}</span>
    </div>
  );
}
