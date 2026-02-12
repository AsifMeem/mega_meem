"use client";

import type { Trace } from "@/lib/types";
import { Rating } from "./rating";

interface TraceCardProps {
  trace: Trace;
  expanded: boolean;
  onToggle: () => void;
}

export function TraceCard({ trace, expanded, onToggle }: TraceCardProps) {
  const timestamp = new Date(trace.timestamp).toLocaleString();
  const triggerContent = trace.trigger_message?.content ?? "";
  const truncatedInput =
    triggerContent.length > 100 ? triggerContent.slice(0, 100) + "..." : triggerContent;
  const truncatedOutput =
    trace.response_out.length > 100
      ? trace.response_out.slice(0, 100) + "..."
      : trace.response_out;

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-all ${
        expanded ? "border-blue-500 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      {/* Collapsed header */}
      <button
        onClick={onToggle}
        className="w-full p-5 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-mono text-gray-600 bg-gray-100">
                {trace.provider}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono text-gray-600 bg-gray-100">
                {trace.model}
              </span>
              <span className="text-xs text-gray-400">{timestamp}</span>
              {trace.rating_score !== null && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium text-blue-600 bg-blue-50">
                  {trace.rating_score}/5
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 truncate">
              <span className="text-gray-400">In:</span> {truncatedInput}
            </div>
            <div className="text-sm text-gray-600 truncate">
              <span className="text-gray-400">Out:</span> {truncatedOutput}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-mono text-gray-900">
              {trace.latency_ms.toFixed(0)}ms
            </div>
            {trace.completion_tokens !== null && (
              <div className="text-xs text-gray-400">
                {trace.completion_tokens} tokens
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Expanded: layered context view */}
      {expanded && (
        <div className="p-5 bg-gray-50 border-t border-gray-200 space-y-3">
          {/* System prompt layer */}
          {trace.system_prompt && (
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <div className="text-xs font-semibold text-purple-600 uppercase mb-1">
                System Prompt
              </div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {trace.system_prompt}
              </div>
            </div>
          )}

          {/* Context messages layer */}
          {trace.context_messages && trace.context_messages.length > 0 && (
            <div className="p-4 rounded-lg bg-gray-100 border border-gray-200">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Context Messages ({trace.context_messages.length})
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {trace.context_messages.map((msg, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span
                      className={`shrink-0 text-xs font-medium w-14 text-right ${
                        msg.role === "user" ? "text-blue-600" : "text-gray-500"
                      }`}
                    >
                      {msg.role}
                    </span>
                    <span className="text-gray-700 whitespace-pre-wrap">{msg.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trigger message layer */}
          {trace.trigger_message && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="text-xs font-semibold text-blue-600 uppercase mb-1">
                Trigger
              </div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {trace.trigger_message.content}
              </div>
            </div>
          )}

          {/* Fallback: raw messages if no normalized fields */}
          {!trace.trigger_message && trace.raw_messages_in.length > 0 && (
            <div className="p-4 rounded-lg bg-gray-100 border border-gray-200">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Messages In ({trace.raw_messages_in.length})
              </div>
              <div className="space-y-2">
                {trace.raw_messages_in.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    <span className="text-xs text-gray-400 uppercase">{msg.role}</span>
                    <div className="mt-1 text-gray-800">{msg.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response layer */}
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="text-xs font-semibold text-emerald-600 uppercase mb-1">
              Response
            </div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {trace.response_out}
            </div>
          </div>

          {/* Stats + Rating */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-6 text-sm text-gray-400">
              <div>
                <span className="text-gray-500">Latency:</span>{" "}
                <span className="font-mono text-gray-800">{trace.latency_ms.toFixed(2)}ms</span>
              </div>
              {trace.prompt_tokens !== null && (
                <div>
                  <span className="text-gray-500">Prompt:</span>{" "}
                  <span className="font-mono text-gray-800">{trace.prompt_tokens}</span>
                </div>
              )}
              {trace.completion_tokens !== null && (
                <div>
                  <span className="text-gray-500">Completion:</span>{" "}
                  <span className="font-mono text-gray-800">{trace.completion_tokens}</span>
                </div>
              )}
            </div>
            <Rating
              traceId={trace.id}
              initialScore={trace.rating_score}
              initialNote={trace.rating_note}
            />
          </div>
        </div>
      )}
    </div>
  );
}
