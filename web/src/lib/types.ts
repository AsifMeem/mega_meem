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
  trace_id: string;
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
  system_prompt: string | null;
  context_messages: TraceMessage[] | null;
  trigger_message: TraceMessage | null;
  raw_messages_in: TraceMessage[];
  response_out: string;
  latency_ms: number;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  rating_score: number | null;
  rating_note: string | null;
  session_id: string | null;
}

export interface TracesResponse {
  traces: Trace[];
  count: number;
}

export interface RateRequest {
  score: number;
  note?: string | null;
}

export interface RateResponse {
  trace_id: string;
  score: number;
  note: string | null;
}

export interface ConfigSnapshot {
  provider: string;
  model: string;
  context_messages: number;
}

export interface EndedSession {
  id: string;
  message_count: number;
  started_at: string;
  ended_at: string;
}

export interface SessionResponse {
  session_id: string;
  ended_session: EndedSession | null;
  config_snapshot: ConfigSnapshot;
}

export interface Session {
  id: string;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  config_snapshot: ConfigSnapshot;
  message_count: number;
  is_active: boolean;
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface MessageStats {
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  messages_today: number;
  first_message_at: string | null;
  last_message_at: string | null;
}

export interface ProviderStats {
  calls: number;
  avg_latency_ms: number;
  avg_rating: number | null;
}

export interface PerformanceStats {
  total_calls: number;
  avg_latency_ms: number;
  avg_tokens_per_sec: number | null;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  avg_rating: number | null;
  by_provider: Record<string, ProviderStats>;
}

export interface AdminMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  session_id: string | null;
}

export interface AdminMessagesResponse {
  messages: AdminMessage[];
  total: number;
}

export interface BenchRun {
  id: string;
  scenario_id: string;
  title: string;
  provider: string;
  model: string;
  context_messages: number | null;
  started_at: string | null;
  ended_at: string | null;
  notes: string | null;
  summary: Record<string, unknown> | null;
}

export interface BenchRunsResponse {
  runs: BenchRun[];
}

export interface BenchTurn {
  idx: number;
  role: string;
  content: string;
  response: string | null;
  latency_ms: number | null;
  trace_id: string | null;
}

export interface BenchProbe {
  idx: number;
  probe_id: string;
  probe_type: string;
  question: string;
  expected: Record<string, unknown> | null;
  response: string;
  score: number;
  metrics: Record<string, unknown> | null;
}

export interface BenchRunDetail extends BenchRun {
  turns: BenchTurn[];
  probes: BenchProbe[];
  scores: Record<string, number>;
}

export interface BenchSummaryRow {
  run_id: string;
  metric: string;
  value: number;
  provider: string;
  model: string;
  scenario_id: string;
  started_at: string | null;
}

export interface BenchSummaryResponse {
  rows: BenchSummaryRow[];
}
