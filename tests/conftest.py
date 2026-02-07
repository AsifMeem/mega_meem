from datetime import datetime, timezone
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies import set_llm_client, set_message_store
from app.main import app


class FakeMessageStore:
    def __init__(self):
        self.messages: list[dict] = []
        self.archived: list[dict] = []

    async def init(self) -> None:
        pass

    async def close(self) -> None:
        pass

    async def save_message(self, role: str, content: str) -> tuple[str, str]:
        msg_id = uuid4().hex
        timestamp = datetime.now(timezone.utc).isoformat()
        self.messages.append(
            {
                "id": msg_id,
                "role": role,
                "content": content,
                "timestamp": timestamp,
            }
        )
        return msg_id, timestamp

    async def get_history(
        self, limit: int, before: str | None
    ) -> list[dict]:
        # Sort newest first
        sorted_msgs = sorted(
            self.messages, key=lambda m: m["timestamp"], reverse=True
        )
        if before:
            sorted_msgs = [
                m for m in sorted_msgs if m["timestamp"] < before
            ]
        return sorted_msgs[:limit]

    async def archive_messages(self) -> tuple[int, str]:
        count = len(self.messages)
        archived_at = datetime.now(timezone.utc).isoformat()
        for msg in self.messages:
            self.archived.append({**msg, "archived_at": archived_at})
        self.messages.clear()
        return count, archived_at


class FakeLLMClient:
    def __init__(self, canned_response: str = "I am Future Asif."):
        self.canned_response = canned_response
        self.last_message: str | None = None

    async def get_response(self, message: str) -> str:
        self.last_message = message
        return self.canned_response


@pytest.fixture
def fake_store():
    return FakeMessageStore()


@pytest.fixture
def fake_llm():
    return FakeLLMClient()


@pytest.fixture
async def client(fake_store, fake_llm):
    set_message_store(fake_store)
    set_llm_client(fake_llm)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
