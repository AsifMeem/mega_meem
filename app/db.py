import os
from datetime import datetime, timezone
from uuid import uuid4

import aiosqlite


class SqliteMessageStore:
    def __init__(self, db_path: str):
        self._db_path = db_path
        self._conn: aiosqlite.Connection | None = None

    async def init(self) -> None:
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
        self._conn = await aiosqlite.connect(self._db_path)
        await self._conn.execute("PRAGMA journal_mode=WAL")
        await self._conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        await self._conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_timestamp
            ON messages(timestamp DESC)
        """)
        await self._conn.execute("""
            CREATE TABLE IF NOT EXISTS archived_messages (
                id TEXT PRIMARY KEY,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                archived_at TEXT NOT NULL
            )
        """)
        await self._conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_archived_timestamp
            ON archived_messages(timestamp DESC)
        """)
        await self._conn.commit()

    async def close(self) -> None:
        if self._conn:
            await self._conn.close()
            self._conn = None

    async def save_message(self, role: str, content: str) -> tuple[str, str]:
        assert self._conn is not None
        msg_id = uuid4().hex
        timestamp = datetime.now(timezone.utc).isoformat()
        await self._conn.execute(
            "INSERT INTO messages (id, role, content, timestamp) VALUES (?, ?, ?, ?)",
            (msg_id, role, content, timestamp),
        )
        await self._conn.commit()
        return msg_id, timestamp

    async def get_history(
        self, limit: int, before: str | None
    ) -> list[dict]:
        assert self._conn is not None
        if before:
            cursor = await self._conn.execute(
                "SELECT id, role, content, timestamp FROM messages "
                "WHERE timestamp < ? ORDER BY timestamp DESC LIMIT ?",
                (before, limit),
            )
        else:
            cursor = await self._conn.execute(
                "SELECT id, role, content, timestamp FROM messages "
                "ORDER BY timestamp DESC LIMIT ?",
                (limit,),
            )
        rows = await cursor.fetchall()
        return [
            {"id": r[0], "role": r[1], "content": r[2], "timestamp": r[3]}
            for r in rows
        ]

    async def archive_messages(self) -> tuple[int, str]:
        assert self._conn is not None
        archived_at = datetime.now(timezone.utc).isoformat()
        await self._conn.execute("BEGIN")
        try:
            await self._conn.execute(
                "INSERT INTO archived_messages (id, role, content, timestamp, archived_at) "
                "SELECT id, role, content, timestamp, ? FROM messages",
                (archived_at,),
            )
            cursor = await self._conn.execute("SELECT count(*) FROM messages")
            row = await cursor.fetchone()
            count = row[0] if row else 0
            await self._conn.execute("DELETE FROM messages")
            await self._conn.commit()
        except Exception:
            await self._conn.rollback()
            raise
        return count, archived_at
