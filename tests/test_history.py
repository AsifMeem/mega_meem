import pytest


@pytest.mark.asyncio
async def test_history_returns_messages_newest_first(client, fake_store):
    # Add messages directly to fake store
    await fake_store.save_message("user", "First message")
    await fake_store.save_message("assistant", "First response")
    await fake_store.save_message("user", "Second message")

    response = await client.get("/chat/history")

    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 3
    assert data["messages"][0]["content"] == "Second message"
    assert data["messages"][2]["content"] == "First message"


@pytest.mark.asyncio
async def test_history_respects_limit(client, fake_store):
    for i in range(5):
        await fake_store.save_message("user", f"Message {i}")

    response = await client.get("/chat/history?limit=2")

    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 2
    assert data["has_more"] is True
    assert data["next_cursor"] is not None


@pytest.mark.asyncio
async def test_history_cursor_pagination(client, fake_store):
    for i in range(5):
        await fake_store.save_message("user", f"Message {i}")

    # Get first page
    response1 = await client.get("/chat/history?limit=2")
    data1 = response1.json()
    cursor = data1["next_cursor"]

    # Get second page
    response2 = await client.get(f"/chat/history?limit=2&before={cursor}")
    data2 = response2.json()

    assert len(data2["messages"]) == 2
    # Second page should have older messages
    assert data2["messages"][0]["content"] != data1["messages"][0]["content"]


@pytest.mark.asyncio
async def test_history_has_more_false_when_no_more(client, fake_store):
    await fake_store.save_message("user", "Only message")

    response = await client.get("/chat/history?limit=10")

    assert response.status_code == 200
    data = response.json()
    assert data["has_more"] is False
    assert data["next_cursor"] is None


@pytest.mark.asyncio
async def test_history_empty_returns_empty_list(client):
    response = await client.get("/chat/history")

    assert response.status_code == 200
    data = response.json()
    assert data["messages"] == []
    assert data["has_more"] is False
