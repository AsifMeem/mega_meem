"use client";

import { useEffect, useState } from "react";
import { getSessions, getTraces } from "@/lib/api";
import type { Session, Trace } from "@/lib/types";
import { TraceCard } from "@/components/trace-card";

export default function TracesPage() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionFilter, setSessionFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getSessions()
      .then((data) => setSessions(data.sessions))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getTraces(100, 0, sessionFilter)
      .then((data) => setTraces(data.traces))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load traces"))
      .finally(() => setLoading(false));
  }, [sessionFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="mt-3 text-sm text-gray-400">Loading traces...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Context Inspector</h1>
            <p className="text-sm text-gray-400 mt-1">
              {traces.length} traces. Click to expand context layers.
            </p>
          </div>

          {sessions.length > 0 && (
            <select
              value={sessionFilter ?? ""}
              onChange={(e) => setSessionFilter(e.target.value || undefined)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.note || s.config_snapshot.provider + " / " + s.config_snapshot.model}
                  {s.is_active ? " (active)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-4">
          {traces.map((trace) => (
            <TraceCard
              key={trace.id}
              trace={trace}
              expanded={expandedId === trace.id}
              onToggle={() =>
                setExpandedId(expandedId === trace.id ? null : trace.id)
              }
            />
          ))}
        </div>

        {traces.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-gray-900">No traces yet</p>
            <p className="mt-1 text-sm text-gray-400">Send some messages to the chat to generate traces</p>
          </div>
        )}
      </div>
    </div>
  );
}
