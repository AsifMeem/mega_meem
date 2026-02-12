export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  id: string;
  response: string;
  timestamp: string;
}

export interface HistoryResponse {
  messages: Message[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface ArchiveResponse {
  archived_count: number;
  archived_at: string;
}

export interface TraceMessage {
  role: string;
  content: string;
}

export interface Trace {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  messages_in: TraceMessage[];
  response_out: string;
  latency_ms: number;
  prompt_tokens: number | null;
  completion_tokens: number | null;
}

export interface TracesResponse {
  traces: Trace[];
  count: number;
}
