"use client";

import { useEffect, useState } from "react";
import { getTraces } from "@/lib/api";
import type { Trace } from "@/lib/types";

export default function EvalPage() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTraces() {
      try {
        const data = await getTraces(100);
        setTraces(data.traces);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load traces");
      } finally {
        setLoading(false);
      }
    }
    fetchTraces();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
        <div className="max-w-6xl mx-auto">Loading traces...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
        <div className="max-w-6xl mx-auto text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">LLM Traces</h1>
        <p className="text-gray-400 mb-8">
          {traces.length} traces recorded. Click a row to expand.
        </p>

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
          <div className="text-gray-500 text-center py-12">
            No traces yet. Send some messages to the chat!
          </div>
        )}
      </div>
    </div>
  );
}

function TraceCard({
  trace,
  expanded,
  onToggle,
}: {
  trace: Trace;
  expanded: boolean;
  onToggle: () => void;
}) {
  const timestamp = new Date(trace.timestamp).toLocaleString();
  const lastUserMsg =
    trace.messages_in.filter((m) => m.role === "user").pop()?.content || "";
  const truncatedInput =
    lastUserMsg.length > 100 ? lastUserMsg.slice(0, 100) + "..." : lastUserMsg;
  const truncatedOutput =
    trace.response_out.length > 100
      ? trace.response_out.slice(0, 100) + "..."
      : trace.response_out;

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        expanded ? "border-blue-500" : "border-gray-800"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 text-left bg-gray-900 hover:bg-gray-800 transition-colors"
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-700">
                {trace.provider}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-700">
                {trace.model}
              </span>
              <span className="text-gray-500 text-sm">{timestamp}</span>
            </div>
            <div className="text-sm text-gray-300 truncate">
              <span className="text-gray-500">In:</span> {truncatedInput}
            </div>
            <div className="text-sm text-gray-300 truncate">
              <span className="text-gray-500">Out:</span> {truncatedOutput}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-mono text-yellow-400">
              {trace.latency_ms.toFixed(0)}ms
            </div>
            {trace.completion_tokens && (
              <div className="text-xs text-gray-500">
                {trace.completion_tokens} tokens
              </div>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="p-4 bg-gray-950 border-t border-gray-800 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">
              Messages In ({trace.messages_in.length})
            </h3>
            <div className="space-y-2">
              {trace.messages_in.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded text-sm font-mono whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-950 border border-blue-800"
                      : msg.role === "assistant"
                      ? "bg-gray-900 border border-gray-700"
                      : "bg-purple-950 border border-purple-800"
                  }`}
                >
                  <span className="text-xs text-gray-500 uppercase">
                    {msg.role}
                  </span>
                  <div className="mt-1">{msg.content}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">
              Response Out
            </h3>
            <div className="p-3 rounded bg-green-950 border border-green-800 text-sm font-mono whitespace-pre-wrap">
              {trace.response_out}
            </div>
          </div>

          <div className="flex gap-6 text-sm text-gray-500">
            <div>
              <span className="text-gray-600">Latency:</span>{" "}
              {trace.latency_ms.toFixed(2)}ms
            </div>
            {trace.prompt_tokens && (
              <div>
                <span className="text-gray-600">Prompt tokens:</span>{" "}
                {trace.prompt_tokens}
              </div>
            )}
            {trace.completion_tokens && (
              <div>
                <span className="text-gray-600">Completion tokens:</span>{" "}
                {trace.completion_tokens}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
