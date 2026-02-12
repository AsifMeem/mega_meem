import type { ChatResponse, HistoryResponse, TracesResponse } from "./types";

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
  offset = 0
): Promise<TracesResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(`${API_URL}/admin/traces?${params}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch traces: ${res.status}`);
  }
  return res.json();
}
