import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import duckdb


class DuckDBMemoryStore:
    def __init__(self, db_path: str = "./data/traces.duckdb"):
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._db_path = db_path
        self._conn: duckdb.DuckDBPyConnection | None = None

    def init(self) -> None:
        self._conn = duckdb.connect(self._db_path)
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS memory_chunks (
                id VARCHAR PRIMARY KEY,
                role VARCHAR,
                content VARCHAR,
                vector JSON,
                created_at TIMESTAMP,
                salience DOUBLE,
                times_recalled INTEGER,
                last_recalled TIMESTAMP,
                decay_days DOUBLE
            )
            """
        )
        cols = {
            row[0]
            for row in self._conn.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'memory_chunks'"
            ).fetchall()
        }
        for col, typ in [
            ("salience", "DOUBLE"),
            ("times_recalled", "INTEGER"),
            ("last_recalled", "TIMESTAMP"),
            ("decay_days", "DOUBLE"),
        ]:
            if col not in cols:
                self._conn.execute(f"ALTER TABLE memory_chunks ADD COLUMN {col} {typ}")

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    def mark_recalled(self, ids: list[str], recalled_at: datetime | None = None) -> None:
        if not self._conn:
            raise RuntimeError("MemoryStore not initialized")
        if not ids:
            return
        now = recalled_at or datetime.now(timezone.utc)
        for mem_id in ids:
            self._conn.execute(
                """
                UPDATE memory_chunks
                SET times_recalled = coalesce(times_recalled, 0) + 1,
                    last_recalled = ?
                WHERE id = ?
                """,
                [now, mem_id],
            )

    def add_memory(
        self,
        role: str,
        content: str,
        vector: list[float],
        created_at: datetime | None = None,
        salience: float = 1.0,
        decay_days: float = 60.0,
    ) -> str:
        if not self._conn:
            raise RuntimeError("MemoryStore not initialized")
        mem_id = uuid4().hex
        now = created_at or datetime.now(timezone.utc)
        self._conn.execute(
            """
            INSERT INTO memory_chunks (
                id, role, content, vector, created_at,
                salience, times_recalled, last_recalled, decay_days
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                mem_id,
                role,
                content,
                json.dumps(vector),
                now,
                salience,
                0,
                None,
                decay_days,
            ],
        )
        return mem_id

    def list_memories(self) -> list[dict]:
        if not self._conn:
            raise RuntimeError("MemoryStore not initialized")
        rows = self._conn.execute(
            """
            SELECT id, role, content, vector, created_at,
                   salience, times_recalled, last_recalled, decay_days
            FROM memory_chunks
            ORDER BY created_at DESC
            """
        ).fetchall()
        return [
            {
                "id": r[0],
                "role": r[1],
                "content": r[2],
                "vector": json.loads(r[3]) if r[3] else [],
                "created_at": r[4].isoformat() if r[4] else None,
                "salience": r[5] if r[5] is not None else 1.0,
                "times_recalled": r[6] if r[6] is not None else 0,
                "last_recalled": r[7].isoformat() if r[7] else None,
                "decay_days": r[8] if r[8] is not None else 60.0,
            }
            for r in rows
        ]
