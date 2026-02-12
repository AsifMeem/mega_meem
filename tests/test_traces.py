import pytest


@pytest.mark.asyncio
async def test_chat_returns_trace_id(client):
    response = await client.post("/chat", json={"message": "Hello"})

    assert response.status_code == 200
    data = response.json()
    assert "trace_id" in data
    assert len(data["trace_id"]) > 0


@pytest.mark.asyncio
async def test_trace_stores_normalized_fields(client, fake_traces):
    await client.post("/chat", json={"message": "What is life?"})

    assert len(fake_traces.traces) == 1
    trace = fake_traces.traces[0]

    # Normalized fields
    assert trace["system_prompt"] is not None
    assert trace["trigger_message"] == {"role": "user", "content": "What is life?"}
    assert trace["raw_messages_in"] is not None


@pytest.mark.asyncio
async def test_trace_context_messages_populated_with_history(client, fake_traces):
    # Send two messages to build history
    await client.post("/chat", json={"message": "First"})
    await client.post("/chat", json={"message": "Second"})

    # Second trace should have context_messages from history
    trace = fake_traces.traces[1]
    assert trace["context_messages"] is not None
    assert len(trace["context_messages"]) > 0


@pytest.mark.asyncio
async def test_rate_trace_success(client, fake_traces):
    # Create a trace via chat
    resp = await client.post("/chat", json={"message": "Rate me"})
    trace_id = resp.json()["trace_id"]

    # Rate it
    rate_resp = await client.patch(
        f"/admin/traces/{trace_id}/rate",
        json={"score": 4, "note": "Good response"},
    )

    assert rate_resp.status_code == 200
    data = rate_resp.json()
    assert data["trace_id"] == trace_id
    assert data["score"] == 4
    assert data["note"] == "Good response"


@pytest.mark.asyncio
async def test_rate_trace_not_found(client):
    response = await client.patch(
        "/admin/traces/nonexistent/rate",
        json={"score": 3},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_traces_returns_extended_fields(client, fake_traces):
    await client.post("/chat", json={"message": "Hello"})

    response = await client.get("/admin/traces")
    assert response.status_code == 200
    data = response.json()

    trace = data["traces"][0]
    assert "system_prompt" in trace
    assert "context_messages" in trace
    assert "trigger_message" in trace
    assert "raw_messages_in" in trace
    assert "rating_score" in trace
    assert "rating_note" in trace
    assert "session_id" in trace


@pytest.mark.asyncio
async def test_get_traces_filter_by_session(client, fake_traces, fake_store):
    # Create session and chat
    session_resp = await client.post("/admin/sessions", json={"note": "S1"})
    session_id = session_resp.json()["session_id"]
    await client.post("/chat", json={"message": "In session"})

    # Filter traces by session
    response = await client.get(f"/admin/traces?session_id={session_id}")
    data = response.json()
    assert data["count"] == 1
    assert data["traces"][0]["session_id"] == session_id
