"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminMessages, getMessageStats, getPerformanceStats } from "@/lib/api";
import type { AdminMessage, AdminMessagesResponse, MessageStats, PerformanceStats } from "@/lib/types";

export default function HistoryPage() {
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [perfStats, setPerfStats] = useState<PerformanceStats | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch stats on mount
  useEffect(() => {
    Promise.all([getMessageStats(), getPerformanceStats()]).then(
      ([ms, ps]) => {
        setStats(ms);
        setPerfStats(ps);
      }
    );
  }, []);

  // Fetch messages when filters change
  const fetchAdminMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data: AdminMessagesResponse = await getAdminMessages({
        limit: 50,
        offset,
        role: roleFilter,
        q: debouncedQuery || undefined,
      });
      setMessages(data.messages);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [offset, roleFilter, debouncedQuery]);

  useEffect(() => {
    fetchAdminMessages();
  }, [fetchAdminMessages]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [roleFilter, debouncedQuery]);

  // Group messages by day
  const grouped = groupByDay(messages);

  return (
    <div className="min-h-full px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-8">Message History</h1>

        {/* Dashboard stats */}
        {stats && perfStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <StatCard label="Total Messages" value={stats.total_messages} />
            <StatCard
              label="User / Assistant"
              value={`${stats.user_messages} / ${stats.assistant_messages}`}
            />
            <StatCard label="Today" value={stats.messages_today} />
            <StatCard label="LLM Calls" value={perfStats.total_calls} />
            <StatCard
              label="Avg Latency"
              value={perfStats.avg_latency_ms > 0 ? `${perfStats.avg_latency_ms.toFixed(0)}ms` : "-"}
            />
            <StatCard
              label="Avg Rating"
              value={perfStats.avg_rating !== null ? perfStats.avg_rating.toFixed(1) : "-"}
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-9 pr-4 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "user", "assistant"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r === "all" ? undefined : r)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  (r === "all" && !roleFilter) || roleFilter === r
                    ? "text-blue-600 bg-blue-50 border border-blue-200"
                    : "text-gray-500 bg-white border border-gray-200 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 ml-auto">
            {total} messages
          </span>
        </div>

        {/* Timeline */}
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-6 w-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="mt-3 text-sm text-gray-400">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-gray-900">No messages found</p>
            <p className="mt-1 text-sm text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ day, msgs }) => (
              <div key={day}>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 sticky top-0 bg-white py-1">
                  {day} — {msgs.length} messages
                </h3>
                <div className="space-y-0.5">
                  {msgs.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3 text-sm">
                        <span className="text-xs text-gray-400 font-mono shrink-0 w-14">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span
                          className={`shrink-0 w-16 text-xs font-medium rounded-full px-2 py-0.5 text-center ${
                            msg.role === "user"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {msg.role}
                        </span>
                        {msg.session_id && (
                          <span className="shrink-0 text-[10px] text-gray-400 font-mono bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                            {msg.session_id.slice(0, 8)}
                          </span>
                        )}
                        {expandedId === msg.id ? (
                          <span className="text-gray-800 whitespace-pre-wrap leading-relaxed">{msg.content}</span>
                        ) : (
                          <span className="text-gray-600 truncate">
                            {msg.content.length > 120 ? msg.content.slice(0, 120) + "..." : msg.content}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 50 && (
          <div className="flex justify-center gap-3 mt-8">
            <button
              onClick={() => setOffset(Math.max(0, offset - 50))}
              disabled={offset === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:text-gray-300 disabled:hover:bg-white disabled:hover:border-gray-200"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400 py-2">
              {offset + 1}–{Math.min(offset + 50, total)} of {total}
            </span>
            <button
              onClick={() => setOffset(offset + 50)}
              disabled={offset + 50 >= total}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:text-gray-300 disabled:hover:bg-white disabled:hover:border-gray-200"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function groupByDay(messages: AdminMessage[]): { day: string; msgs: AdminMessage[] }[] {
  const groups = new Map<string, AdminMessage[]>();
  for (const msg of messages) {
    const day = new Date(msg.timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(msg);
  }
  return Array.from(groups.entries()).map(([day, msgs]) => ({ day, msgs }));
}
