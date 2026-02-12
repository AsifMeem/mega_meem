import pytest


@pytest.mark.asyncio
async def test_create_session_returns_session_id_and_config(client):
    response = await client.post(
        "/admin/sessions", json={"note": "Testing ollama"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["config_snapshot"]["provider"] is not None
    assert data["config_snapshot"]["model"] is not None
    assert data["config_snapshot"]["context_messages"] > 0


@pytest.mark.asyncio
async def test_create_session_moves_messages_to_history(client, fake_store):
    # Create first session so there's an active one to close
    await client.post("/admin/sessions", json={"note": "Session 1"})

    # Add some messages to the active conversation
    await client.post("/chat", json={"message": "Hello"})
    await client.post("/chat", json={"message": "How are you?"})
    assert len(fake_store.messages) == 4  # 2 user + 2 assistant

    # Create second session — closes the first and moves messages
    await client.post("/admin/sessions", json={"note": "Session 2"})
    assert len(fake_store.messages) == 0
    assert len(fake_store.session_history) == 4


@pytest.mark.asyncio
async def test_create_session_ends_previous_session(client, fake_store):
    # Create first session
    resp1 = await client.post("/admin/sessions", json={"note": "First"})
    session1_id = resp1.json()["session_id"]

    # Add messages
    await client.post("/chat", json={"message": "Hello"})

    # Create second session — should end the first
    resp2 = await client.post("/admin/sessions", json={"note": "Second"})
    data = resp2.json()

    assert data["ended_session"] is not None
    assert data["ended_session"]["id"] == session1_id
    assert data["ended_session"]["message_count"] == 2  # user + assistant


@pytest.mark.asyncio
async def test_list_sessions_returns_all_sessions(client):
    await client.post("/admin/sessions", json={"note": "First"})
    await client.post("/admin/sessions", json={"note": "Second"})

    response = await client.get("/admin/sessions")
    assert response.status_code == 200
    data = response.json()
    assert len(data["sessions"]) == 2

    # Most recent first
    assert data["sessions"][0]["note"] == "Second"
    assert data["sessions"][0]["is_active"] is True
    assert data["sessions"][1]["note"] == "First"
    assert data["sessions"][1]["is_active"] is False


@pytest.mark.asyncio
async def test_new_session_resets_llm_context(client, fake_store, fake_llm):
    # Create a session so there's an active one to close later
    await client.post("/admin/sessions", json={"note": "Initial"})

    # Chat to build history
    await client.post("/chat", json={"message": "Remember this"})
    assert fake_llm.last_history is None  # No history on first message

    await client.post("/chat", json={"message": "And this"})
    assert fake_llm.last_history is not None  # Has history now

    # Start new session — closes previous, moves messages
    await client.post("/admin/sessions", json={"note": "Fresh start"})

    # Next chat should have no history (clean slate)
    await client.post("/chat", json={"message": "Fresh message"})
    assert fake_llm.last_history is None
