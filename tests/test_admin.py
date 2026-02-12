import pytest


@pytest.mark.asyncio
async def test_admin_messages_returns_all(client):
    await client.post("/chat", json={"message": "Hello"})
    await client.post("/chat", json={"message": "World"})

    response = await client.get("/admin/messages")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 4  # 2 user + 2 assistant


@pytest.mark.asyncio
async def test_admin_messages_filter_by_role(client):
    await client.post("/chat", json={"message": "Hello"})

    response = await client.get("/admin/messages?role=user")
    data = response.json()
    assert data["total"] == 1
    assert all(m["role"] == "user" for m in data["messages"])


@pytest.mark.asyncio
async def test_admin_messages_search_by_query(client):
    await client.post("/chat", json={"message": "Python is great"})
    await client.post("/chat", json={"message": "JavaScript too"})

    response = await client.get("/admin/messages?q=Python")
    data = response.json()
    assert data["total"] >= 1
    assert any("Python" in m["content"] for m in data["messages"])


@pytest.mark.asyncio
async def test_admin_messages_includes_session_history(client, fake_store):
    # Chat, then create session (moves messages to history)
    await client.post("/chat", json={"message": "Old message"})
    await client.post("/admin/sessions", json={"note": "New session"})
    await client.post("/chat", json={"message": "New message"})

    response = await client.get("/admin/messages")
    data = response.json()
    # Should include both old (session_history) and new (active) messages
    assert data["total"] >= 4  # old user+assistant + new user+assistant


@pytest.mark.asyncio
async def test_admin_messages_pagination(client):
    for i in range(5):
        await client.post("/chat", json={"message": f"msg {i}"})

    response = await client.get("/admin/messages?limit=3&offset=0")
    data = response.json()
    assert len(data["messages"]) == 3
    assert data["total"] == 10  # 5 user + 5 assistant


@pytest.mark.asyncio
async def test_message_stats(client):
    await client.post("/chat", json={"message": "Hello"})
    await client.post("/chat", json={"message": "World"})

    response = await client.get("/admin/stats/messages")
    assert response.status_code == 200
    data = response.json()
    assert data["total_messages"] == 4
    assert data["user_messages"] == 2
    assert data["assistant_messages"] == 2
    assert data["first_message_at"] is not None
    assert data["last_message_at"] is not None


@pytest.mark.asyncio
async def test_performance_stats_empty(client):
    response = await client.get("/admin/stats/performance")
    assert response.status_code == 200
    data = response.json()
    assert data["total_calls"] == 0


@pytest.mark.asyncio
async def test_performance_stats_with_traces(client):
    await client.post("/chat", json={"message": "Hello"})

    response = await client.get("/admin/stats/performance")
    data = response.json()
    assert data["total_calls"] == 1
    assert data["avg_latency_ms"] > 0
