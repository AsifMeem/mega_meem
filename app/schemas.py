from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    id: str
    response: str
    timestamp: str
    trace_id: str


class HistoryMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str


class HistoryResponse(BaseModel):
    messages: list[HistoryMessage]
    has_more: bool
    next_cursor: str | None


class ArchiveResponse(BaseModel):
    archived_count: int
    archived_at: str


# --- Traces ---


class TraceMessage(BaseModel):
    role: str
    content: str


class Trace(BaseModel):
    id: str
    timestamp: str
    provider: str
    model: str
    system_prompt: str | None
    context_messages: list[TraceMessage] | None
    trigger_message: TraceMessage | None
    raw_messages_in: list[TraceMessage]
    response_out: str
    latency_ms: float
    prompt_tokens: int | None
    completion_tokens: int | None
    rating_score: int | None
    rating_note: str | None
    session_id: str | None


class TracesResponse(BaseModel):
    traces: list[Trace]
    count: int


class RateRequest(BaseModel):
    score: int
    note: str | None = None


class RateResponse(BaseModel):
    trace_id: str
    score: int
    note: str | None


# --- Sessions ---


class SessionRequest(BaseModel):
    note: str | None = None


class ConfigSnapshot(BaseModel):
    provider: str
    model: str
    context_messages: int


class EndedSession(BaseModel):
    id: str
    message_count: int
    started_at: str
    ended_at: str


class SessionResponse(BaseModel):
    session_id: str
    ended_session: EndedSession | None
    config_snapshot: ConfigSnapshot


class Session(BaseModel):
    id: str
    started_at: str
    ended_at: str | None
    note: str | None
    config_snapshot: ConfigSnapshot
    message_count: int
    is_active: bool


class SessionsResponse(BaseModel):
    sessions: list[Session]


# --- Admin Stats ---


class MessageStats(BaseModel):
    total_messages: int
    user_messages: int
    assistant_messages: int
    messages_today: int
    first_message_at: str | None
    last_message_at: str | None


class ProviderStats(BaseModel):
    calls: int
    avg_latency_ms: float
    avg_rating: float | None


class PerformanceStats(BaseModel):
    total_calls: int
    avg_latency_ms: float
    avg_tokens_per_sec: float | None
    total_prompt_tokens: int
    total_completion_tokens: int
    avg_rating: float | None
    by_provider: dict[str, ProviderStats]


# --- Admin Messages ---


class AdminMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str
    session_id: str | None


class AdminMessagesResponse(BaseModel):
    messages: list[AdminMessage]
    total: int
