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
        await self._conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                note TEXT,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                context_messages INTEGER NOT NULL
            )
        """)
        await self._conn.execute("""
            CREATE TABLE IF NOT EXISTS session_history (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        """)
        await self._conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_session_history_session
            ON session_history(session_id, timestamp DESC)
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

    async def create_session(
        self,
        provider: str,
        model: str,
        context_messages: int,
        note: str | None,
    ) -> dict:
        assert self._conn is not None
        now = datetime.now(timezone.utc).isoformat()
        new_session_id = uuid4().hex

        await self._conn.execute("BEGIN")
        try:
            # Find and close the active session
            cur = await self._conn.execute(
                "SELECT id, started_at FROM sessions WHERE ended_at IS NULL"
            )
            active_row = await cur.fetchone()
            ended_session = None

            if active_row:
                prev_id = active_row[0]
                prev_started = active_row[1]
                # Count messages being moved
                cur = await self._conn.execute("SELECT count(*) FROM messages")
                row = await cur.fetchone()
                msg_count = row[0] if row else 0

                # Close the previous session
                await self._conn.execute(
                    "UPDATE sessions SET ended_at = ? WHERE id = ?",
                    (now, prev_id),
                )

                # Move messages to session_history
                await self._conn.execute(
                    "INSERT INTO session_history (id, session_id, role, content, timestamp) "
                    "SELECT id, ?, role, content, timestamp FROM messages",
                    (prev_id,),
                )
                await self._conn.execute("DELETE FROM messages")

                ended_session = {
                    "id": prev_id,
                    "message_count": msg_count,
                    "started_at": prev_started,
                    "ended_at": now,
                }

            # Create new session
            await self._conn.execute(
                "INSERT INTO sessions (id, started_at, note, provider, model, context_messages) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (new_session_id, now, note, provider, model, context_messages),
            )
            await self._conn.commit()
        except Exception:
            await self._conn.rollback()
            raise

        return {
            "session_id": new_session_id,
            "ended_session": ended_session,
            "config_snapshot": {
                "provider": provider,
                "model": model,
                "context_messages": context_messages,
            },
        }

    async def get_sessions(self) -> list[dict]:
        assert self._conn is not None
        cur = await self._conn.execute(
            "SELECT id, started_at, ended_at, note, provider, model, context_messages "
            "FROM sessions ORDER BY started_at DESC"
        )
        rows = await cur.fetchall()
        sessions = []
        for r in rows:
            session_id = r[0]
            is_active = r[2] is None
            # Count messages: active session uses messages table, ended uses session_history
            if is_active:
                cnt_cur = await self._conn.execute("SELECT count(*) FROM messages")
            else:
                cnt_cur = await self._conn.execute(
                    "SELECT count(*) FROM session_history WHERE session_id = ?",
                    (session_id,),
                )
            cnt_row = await cnt_cur.fetchone()
            msg_count = cnt_row[0] if cnt_row else 0

            sessions.append({
                "id": session_id,
                "started_at": r[1],
                "ended_at": r[2],
                "note": r[3],
                "config_snapshot": {
                    "provider": r[4],
                    "model": r[5],
                    "context_messages": r[6],
                },
                "message_count": msg_count,
                "is_active": is_active,
            })
        return sessions

    async def get_active_session_id(self) -> str | None:
        assert self._conn is not None
        cur = await self._conn.execute(
            "SELECT id FROM sessions WHERE ended_at IS NULL"
        )
        row = await cur.fetchone()
        return row[0] if row else None

    async def search_messages(
        self,
        limit: int,
        offset: int,
        role: str | None = None,
        query: str | None = None,
    ) -> tuple[list[dict], int]:
        """Search across both active messages and session_history."""
        assert self._conn is not None

        # Build WHERE clauses
        conditions = []
        params: list[str | int] = []
        if role:
            conditions.append("role = ?")
            params.append(role)
        if query:
            conditions.append("content LIKE ?")
            params.append(f"%{query}%")

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Union active messages and session_history
        union_query = f"""
            SELECT id, role, content, timestamp FROM messages {where}
            UNION ALL
            SELECT id, role, content, timestamp FROM session_history {where}
        """
        # For the union, params are used twice (once per SELECT)
        union_params = params + params

        # Count total
        count_sql = f"SELECT count(*) FROM ({union_query})"
        cur = await self._conn.execute(count_sql, union_params)
        row = await cur.fetchone()
        total = row[0] if row else 0

        # Fetch page
        page_sql = f"""
            SELECT id, role, content, timestamp FROM ({union_query})
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        """
        cur = await self._conn.execute(page_sql, union_params + [limit, offset])
        rows = await cur.fetchall()

        messages = [
            {"id": r[0], "role": r[1], "content": r[2], "timestamp": r[3]}
            for r in rows
        ]
        return messages, total

    async def get_message_stats(self) -> dict:
        """Get message counts across active + session_history."""
        assert self._conn is not None
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Total from both tables
        cur = await self._conn.execute("""
            SELECT
                count(*) as total,
                count(CASE WHEN role = 'user' THEN 1 END) as user_count,
                count(CASE WHEN role = 'assistant' THEN 1 END) as assistant_count,
                min(timestamp) as first_ts,
                max(timestamp) as last_ts
            FROM (
                SELECT role, timestamp FROM messages
                UNION ALL
                SELECT role, timestamp FROM session_history
            )
        """)
        row = await cur.fetchone()
        total, user_count, assistant_count, first_ts, last_ts = row if row else (0, 0, 0, None, None)

        # Today's messages (active table only — session_history is historical)
        cur = await self._conn.execute(
            "SELECT count(*) FROM messages WHERE timestamp >= ?",
            (today,),
        )
        today_row = await cur.fetchone()
        today_count = today_row[0] if today_row else 0

        return {
            "total_messages": total,
            "user_messages": user_count,
            "assistant_messages": assistant_count,
            "messages_today": today_count,
            "first_message_at": first_ts,
            "last_message_at": last_ts,
        }
