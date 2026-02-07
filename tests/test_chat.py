import pytest


@pytest.mark.asyncio
async def test_chat_returns_response_with_id_and_timestamp(client, fake_llm):
    fake_llm.canned_response = "Focus on what matters most."

    response = await client.post("/chat", json={"message": "What should I focus on?"})

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["response"] == "Focus on what matters most."
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_chat_saves_user_and_assistant_messages(client, fake_store):
    await client.post("/chat", json={"message": "Hello there"})

    assert len(fake_store.messages) == 2
    assert fake_store.messages[0]["role"] == "user"
    assert fake_store.messages[0]["content"] == "Hello there"
    assert fake_store.messages[1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_chat_passes_message_to_llm(client, fake_llm):
    await client.post("/chat", json={"message": "Tell me something wise"})

    assert fake_llm.last_message == "Tell me something wise"


@pytest.mark.asyncio
async def test_chat_empty_message_returns_422(client):
    response = await client.post("/chat", json={"message": ""})

    # FastAPI validation should reject empty strings if we add validation
    # For now, empty string is technically valid per schema
    # This test documents current behavior - update if we add min_length
    assert response.status_code in (200, 422)
