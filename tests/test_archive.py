import pytest


@pytest.mark.asyncio
async def test_archive_returns_count(client, fake_store):
    await fake_store.save_message("user", "Message 1")
    await fake_store.save_message("assistant", "Response 1")
    await fake_store.save_message("user", "Message 2")

    response = await client.post("/admin/archive")

    assert response.status_code == 200
    data = response.json()
    assert data["archived_count"] == 3
    assert "archived_at" in data


@pytest.mark.asyncio
async def test_archive_clears_messages(client, fake_store):
    await fake_store.save_message("user", "Message 1")
    await fake_store.save_message("assistant", "Response 1")

    await client.post("/admin/archive")

    # Messages should be empty after archive
    assert len(fake_store.messages) == 0
    # But archived should have them
    assert len(fake_store.archived) == 2


@pytest.mark.asyncio
async def test_archive_with_no_messages(client, fake_store):
    response = await client.post("/admin/archive")

    assert response.status_code == 200
    data = response.json()
    assert data["archived_count"] == 0
