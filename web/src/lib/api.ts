import type {
  AdminMessagesResponse,
  ChatResponse,
  HistoryResponse,
  MessageStats,
  PerformanceStats,
  RateResponse,
  SessionResponse,
  SessionsResponse,
  TracesResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function sendMessage(message: string): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    throw new Error(`Failed to send message: ${res.status}`);
  }
  return res.json();
}

export async function getHistory(
  limit = 20,
  before?: string
): Promise<HistoryResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) {
    params.set("before", before);
  }
  const res = await fetch(`${API_URL}/chat/history?${params}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch history: ${res.status}`);
  }
  return res.json();
}

export async function getTraces(
  limit = 50,
  offset = 0,
  sessionId?: string
): Promise<TracesResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (sessionId) {
    params.set("session_id", sessionId);
  }
  const res = await fetch(`${API_URL}/admin/traces?${params}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch traces: ${res.status}`);
  }
  return res.json();
}

export async function rateTrace(
  traceId: string,
  score: number,
  note?: string
): Promise<RateResponse> {
  const res = await fetch(`${API_URL}/admin/traces/${traceId}/rate`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ score, note: note ?? null }),
  });
  if (!res.ok) {
    throw new Error(`Failed to rate trace: ${res.status}`);
  }
  return res.json();
}

export async function createSession(
  note?: string
): Promise<SessionResponse> {
  const res = await fetch(`${API_URL}/admin/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note: note ?? null }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create session: ${res.status}`);
  }
  return res.json();
}

export async function getSessions(): Promise<SessionsResponse> {
  const res = await fetch(`${API_URL}/admin/sessions`);
  if (!res.ok) {
    throw new Error(`Failed to fetch sessions: ${res.status}`);
  }
  return res.json();
}

export async function getAdminMessages(opts: {
  limit?: number;
  offset?: number;
  role?: string;
  q?: string;
} = {}): Promise<AdminMessagesResponse> {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.offset) params.set("offset", String(opts.offset));
  if (opts.role) params.set("role", opts.role);
  if (opts.q) params.set("q", opts.q);
  const res = await fetch(`${API_URL}/admin/messages?${params}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch messages: ${res.status}`);
  }
  return res.json();
}

export async function getMessageStats(): Promise<MessageStats> {
  const res = await fetch(`${API_URL}/admin/stats/messages`);
  if (!res.ok) {
    throw new Error(`Failed to fetch message stats: ${res.status}`);
  }
  return res.json();
}

export async function getPerformanceStats(): Promise<PerformanceStats> {
  const res = await fetch(`${API_URL}/admin/stats/performance`);
  if (!res.ok) {
    throw new Error(`Failed to fetch performance stats: ${res.status}`);
  }
  return res.json();
}
