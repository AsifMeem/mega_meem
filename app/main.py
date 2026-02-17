import logging
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
from fastapi.middleware.cors import CORSMiddleware

from app.claude_client import ClaudeClient
from app.config import settings
from app.db import SqliteMessageStore
from app.dependencies import (
    get_llm_client,
    get_message_store,
    get_trace_store,
    get_bench_store,
    set_llm_client,
    set_message_store,
    set_trace_store,
    set_bench_store,
)
from app.gemini_client import GeminiClient
from app.ollama_client import OllamaClient
from app.protocols import LLMClient, MessageStore, TraceStore
from app.schemas import (
    AdminMessage,
    AdminMessagesResponse,
    ArchiveResponse,
    ChatRequest,
    ChatResponse,
    ConfigSnapshot,
    HistoryMessage,
    HistoryResponse,
    MessageStats,
    PerformanceStats,
    RateRequest,
    RateResponse,
    Session,
    SessionRequest,
    SessionResponse,
    SessionsResponse,
    Trace,
    TracesResponse,
    BenchRunsResponse,
    BenchRunDetail,
    BenchSummaryResponse,
)
from app.trace_store import DuckDBTraceStore
from app.bench_store import DuckDBBenchStore


def create_llm_client() -> LLMClient | None:
    """Factory function to create the appropriate LLM client based on config."""
    if settings.llm_provider == "gemini" and settings.gemini_api_key:
        return GeminiClient(
            settings.gemini_api_key, settings.gemini_model, settings.gemini_system_prompt
        )
    elif settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        return ClaudeClient(
            settings.anthropic_api_key, settings.anthropic_model, settings.anthropic_system_prompt
        )
    elif settings.llm_provider == "ollama":
        return OllamaClient(
            settings.ollama_model, settings.ollama_base_url, settings.ollama_system_prompt
        )
    return None


def get_current_model() -> str:
    """Get the current model name based on provider."""
    if settings.llm_provider == "gemini":
        return settings.gemini_model
    elif settings.llm_provider == "anthropic":
        return settings.anthropic_model
    elif settings.llm_provider == "ollama":
        return settings.ollama_model
    return "unknown"


@asynccontextmanager
async def lifespan(app: FastAPI):
    store = SqliteMessageStore(settings.database_path)
    await store.init()
    set_message_store(store)

    trace_store = DuckDBTraceStore(settings.trace_db_path)
    trace_store.init()
    set_trace_store(trace_store)

    bench_store = DuckDBBenchStore(settings.trace_db_path)
    bench_store.init()
    set_bench_store(bench_store)

    llm = create_llm_client()
    if llm:
        set_llm_client(llm)

    yield

    await store.close()
    trace_store.close()
    bench_store.close()


app = FastAPI(
    title="Future Me",
    description="Talk to a wiser version of yourself.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    store: MessageStore = Depends(get_message_store),
    llm: LLMClient = Depends(get_llm_client),
    traces: TraceStore = Depends(get_trace_store),
) -> ChatResponse:
    # Fetch recent history for context (newest-first, so reverse for chronological order)
    history_rows = await store.get_history(settings.context_messages, before=None)
    history = list(reversed(history_rows)) if history_rows else None

    # Build normalized trace fields
    context_messages = None
    if history:
        context_messages = [{"role": msg["role"], "content": msg["content"]} for msg in history]

    trigger_message = {"role": "user", "content": request.message}

    # Build raw_messages_in (full conversation sent to LLM)
    raw_messages_in = []
    if history:
        for msg in history:
            raw_messages_in.append({"role": msg["role"], "content": msg["content"]})
    raw_messages_in.append(trigger_message)

    # Call LLM with timing
    start_time = time.perf_counter()
    response_text = await llm.get_response(request.message, history=history)
    latency_ms = (time.perf_counter() - start_time) * 1000

    # Get active session
    session_id = await store.get_active_session_id()

    # Save trace with normalized fields
    trace_id = traces.save_trace(
        provider=settings.llm_provider,
        model=get_current_model(),
        messages_in=raw_messages_in,
        response_out=response_text,
        latency_ms=latency_ms,
        system_prompt=settings.active_system_prompt,
        context_messages=context_messages,
        trigger_message=trigger_message,
        session_id=session_id,
    )

    await store.save_message("user", request.message)
    msg_id, timestamp = await store.save_message("assistant", response_text)
    return ChatResponse(id=msg_id, response=response_text, timestamp=timestamp, trace_id=trace_id)


@app.get("/chat/history", response_model=HistoryResponse)
async def get_history(
    limit: int = Query(default=20, ge=1, le=100),
    before: str | None = Query(default=None),
    store: MessageStore = Depends(get_message_store),
) -> HistoryResponse:
    rows = await store.get_history(limit + 1, before)
    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]
    next_cursor = rows[-1]["timestamp"] if has_more else None
    messages = [HistoryMessage(**row) for row in rows]
    return HistoryResponse(messages=messages, has_more=has_more, next_cursor=next_cursor)


@app.post("/admin/archive", response_model=ArchiveResponse)
async def archive_messages(
    store: MessageStore = Depends(get_message_store),
) -> ArchiveResponse:
    count, archived_at = await store.archive_messages()
    return ArchiveResponse(archived_count=count, archived_at=archived_at)


# --- Sessions ---


@app.post("/admin/sessions", response_model=SessionResponse)
async def create_session(
    request: SessionRequest,
    store: MessageStore = Depends(get_message_store),
) -> SessionResponse:
    result = await store.create_session(
        provider=settings.llm_provider,
        model=get_current_model(),
        context_messages=settings.context_messages,
        note=request.note,
    )
    return SessionResponse(**result)


@app.get("/admin/sessions", response_model=SessionsResponse)
async def list_sessions(
    store: MessageStore = Depends(get_message_store),
) -> SessionsResponse:
    sessions = await store.get_sessions()
    return SessionsResponse(sessions=[Session(**s) for s in sessions])


# --- Traces ---


@app.get("/admin/traces", response_model=TracesResponse)
def get_traces(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    session_id: str | None = Query(default=None),
    traces: TraceStore = Depends(get_trace_store),
) -> TracesResponse:
    trace_list = traces.get_traces(limit=limit, offset=offset, session_id=session_id)
    return TracesResponse(traces=[Trace(**t) for t in trace_list], count=len(trace_list))


@app.patch("/admin/traces/{trace_id}/rate", response_model=RateResponse)
def rate_trace(
    trace_id: str,
    request: RateRequest,
    traces: TraceStore = Depends(get_trace_store),
) -> RateResponse:
    result = traces.rate_trace(trace_id=trace_id, score=request.score, note=request.note)
    if result is None:
        raise HTTPException(status_code=404, detail="Trace not found")
    return RateResponse(**result)


# --- Admin Messages ---


@app.get("/admin/messages", response_model=AdminMessagesResponse)
async def admin_messages(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    role: str | None = Query(default=None),
    q: str | None = Query(default=None),
    store: MessageStore = Depends(get_message_store),
) -> AdminMessagesResponse:
    messages, total = await store.search_messages(
        limit=limit, offset=offset, role=role, query=q
    )
    return AdminMessagesResponse(
        messages=[AdminMessage(**m) for m in messages],
        total=total,
    )


# --- Stats ---


@app.get("/admin/stats/messages", response_model=MessageStats)
async def message_stats(
    store: MessageStore = Depends(get_message_store),
) -> MessageStats:
    stats = await store.get_message_stats()
    return MessageStats(**stats)


@app.get("/admin/stats/performance", response_model=PerformanceStats)
def performance_stats(
    traces: TraceStore = Depends(get_trace_store),
) -> PerformanceStats:
    stats = traces.get_performance_stats()
    return PerformanceStats(**stats)


# --- Benchmarks ---


@app.get("/admin/bench/runs", response_model=BenchRunsResponse)
def list_bench_runs(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    bench=Depends(get_bench_store),
) -> BenchRunsResponse:
    runs = bench.list_runs(limit=limit, offset=offset)
    return BenchRunsResponse(runs=runs)


@app.get("/admin/bench/run/{run_id}", response_model=BenchRunDetail)
def get_bench_run(
    run_id: str,
    bench=Depends(get_bench_store),
) -> BenchRunDetail:
    run = bench.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Bench run not found")
    return BenchRunDetail(**run)


@app.get("/admin/bench/summary", response_model=BenchSummaryResponse)
def bench_summary(
    bench=Depends(get_bench_store),
) -> BenchSummaryResponse:
    rows = bench.get_summary()
    return BenchSummaryResponse(rows=rows)
