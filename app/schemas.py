from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    id: str
    response: str
    timestamp: str


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
