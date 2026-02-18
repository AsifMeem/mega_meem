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
                created_at TIMESTAMP
            )
            """
        )

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    def add_memory(
        self,
        role: str,
        content: str,
        vector: list[float],
        created_at: datetime | None = None,
    ) -> str:
        if not self._conn:
            raise RuntimeError("MemoryStore not initialized")
        mem_id = uuid4().hex
        now = created_at or datetime.now(timezone.utc)
        self._conn.execute(
            """
            INSERT INTO memory_chunks (id, role, content, vector, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            [mem_id, role, content, json.dumps(vector), now],
        )
        return mem_id

    def list_memories(self) -> list[dict]:
        if not self._conn:
            raise RuntimeError("MemoryStore not initialized")
        rows = self._conn.execute(
            """
            SELECT id, role, content, vector, created_at
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
            }
            for r in rows
        ]
