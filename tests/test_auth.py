import os
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies import set_llm_client, set_message_store, set_trace_store, set_memory_store
from tests.conftest import FakeLLMClient, FakeMemoryStore, FakeMessageStore, FakeTraceStore


TEST_API_KEY = "test-secret-key-123"


@pytest.fixture
async def authed_client():
    """Client with correct API key."""
    set_message_store(FakeMessageStore())
    set_llm_client(FakeLLMClient())
    set_trace_store(FakeTraceStore())
    set_memory_store(FakeMemoryStore())
    with (
        patch.dict(os.environ, {"API_KEY": TEST_API_KEY}),
        patch("app.main.embed_text", new_callable=AsyncMock, return_value=[0.0] * 64),
    ):
        # Re-import app to pick up new settings
        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c


@pytest.fixture
async def unauthed_client():
    """Client without any API key header, but server requires one."""
    set_message_store(FakeMessageStore())
    set_llm_client(FakeLLMClient())
    set_trace_store(FakeTraceStore())
    set_memory_store(FakeMemoryStore())
    with (
        patch.dict(os.environ, {"API_KEY": TEST_API_KEY}),
        patch("app.main.embed_text", new_callable=AsyncMock, return_value=[0.0] * 64),
    ):
        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c


@pytest.fixture
async def no_key_configured_client():
    """Client where server has no API_KEY configured (open access)."""
    set_message_store(FakeMessageStore())
    set_llm_client(FakeLLMClient())
    set_trace_store(FakeTraceStore())
    set_memory_store(FakeMemoryStore())
    with (
        patch.dict(os.environ, {"API_KEY": ""}, clear=False),
        patch("app.main.embed_text", new_callable=AsyncMock, return_value=[0.0] * 64),
    ):
        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c


@pytest.mark.asyncio
async def test_missing_api_key_returns_401(unauthed_client):
    response = await unauthed_client.get("/chat/history")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing or invalid API key"


@pytest.mark.asyncio
async def test_wrong_api_key_returns_401(unauthed_client):
    response = await unauthed_client.get(
        "/chat/history",
        headers={"Authorization": "Bearer wrong-key"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing or invalid API key"


@pytest.mark.asyncio
async def test_correct_api_key_returns_200(authed_client):
    response = await authed_client.get(
        "/chat/history",
        headers={"Authorization": f"Bearer {TEST_API_KEY}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_no_key_configured_allows_access(no_key_configured_client):
    response = await no_key_configured_client.get("/chat/history")
    assert response.status_code == 200
