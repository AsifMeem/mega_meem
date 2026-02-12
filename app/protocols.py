from typing import Protocol


class MessageStore(Protocol):
    async def save_message(self, role: str, content: str) -> tuple[str, str]: ...

    async def get_history(
        self, limit: int, before: str | None
    ) -> list[dict]: ...

    async def archive_messages(self) -> tuple[int, str]: ...

    async def create_session(
        self, provider: str, model: str, context_messages: int, note: str | None
    ) -> dict: ...

    async def get_sessions(self) -> list[dict]: ...

    async def get_active_session_id(self) -> str | None: ...

    async def search_messages(
        self,
        limit: int,
        offset: int,
        role: str | None = None,
        query: str | None = None,
    ) -> tuple[list[dict], int]: ...

    async def get_message_stats(self) -> dict: ...

    async def init(self) -> None: ...

    async def close(self) -> None: ...


class LLMClient(Protocol):
    async def get_response(
        self, message: str, history: list[dict] | None = None
    ) -> str: ...


class TraceStore(Protocol):
    def save_trace(
        self,
        provider: str,
        model: str,
        messages_in: list[dict],
        response_out: str,
        latency_ms: float,
        prompt_tokens: int | None = None,
        completion_tokens: int | None = None,
        system_prompt: str | None = None,
        context_messages: list[dict] | None = None,
        trigger_message: dict | None = None,
        session_id: str | None = None,
    ) -> str: ...

    def get_traces(
        self,
        limit: int = 50,
        offset: int = 0,
        session_id: str | None = None,
    ) -> list[dict]: ...

    def rate_trace(
        self, trace_id: str, score: int, note: str | None = None
    ) -> dict | None: ...

    def get_performance_stats(self) -> dict: ...

    def init(self) -> None: ...

    def close(self) -> None: ...
