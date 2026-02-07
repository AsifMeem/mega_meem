from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from app.claude_client import ClaudeClient
from app.config import settings
from app.db import SqliteMessageStore
from app.dependencies import (
    get_llm_client,
    get_message_store,
    set_llm_client,
    set_message_store,
)
from app.gemini_client import GeminiClient
from app.protocols import LLMClient, MessageStore
from app.schemas import (
    ArchiveResponse,
    ChatRequest,
    ChatResponse,
    HistoryMessage,
    HistoryResponse,
)


def create_llm_client() -> LLMClient | None:
    """Factory function to create the appropriate LLM client based on config."""
    if settings.llm_provider == "gemini" and settings.gemini_api_key:
        return GeminiClient(settings.gemini_api_key, settings.gemini_model)
    elif settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        return ClaudeClient(settings.anthropic_api_key, settings.anthropic_model)
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    store = SqliteMessageStore(settings.database_path)
    await store.init()
    set_message_store(store)

    llm = create_llm_client()
    if llm:
        set_llm_client(llm)

    yield

    await store.close()


app = FastAPI(
    title="Future Asif",
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
) -> ChatResponse:
    response_text = await llm.get_response(request.message)
    await store.save_message("user", request.message)
    msg_id, timestamp = await store.save_message("assistant", response_text)
    return ChatResponse(id=msg_id, response=response_text, timestamp=timestamp)


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
