import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import duckdb


class DuckDBTraceStore:
    def __init__(self, db_path: str = "./data/traces.duckdb"):
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._db_path = db_path
        self._conn: duckdb.DuckDBPyConnection | None = None

    def init(self) -> None:
        self._conn = duckdb.connect(self._db_path)
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS traces (
                id VARCHAR PRIMARY KEY,
                timestamp TIMESTAMP,
                provider VARCHAR,
                model VARCHAR,
                system_prompt VARCHAR,
                context_messages JSON,
                trigger_message JSON,
                raw_messages_in JSON,
                response_out VARCHAR,
                latency_ms DOUBLE,
                prompt_tokens INTEGER,
                completion_tokens INTEGER,
                rating_score INTEGER,
                rating_note VARCHAR,
                session_id VARCHAR
            )
        """)
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS trace_rollups (
                period_start TIMESTAMP,
                provider VARCHAR,
                model VARCHAR,
                call_count INTEGER,
                avg_latency_ms DOUBLE,
                total_prompt_tokens BIGINT,
                total_completion_tokens BIGINT,
                avg_tokens_per_sec DOUBLE,
                avg_rating DOUBLE,
                PRIMARY KEY (period_start, provider, model)
            )
        """)
        # Migrate: if old schema has messages_in but not raw_messages_in, rename it
        cols = {
            row[0]
            for row in self._conn.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'traces'"
            ).fetchall()
        }
        if "messages_in" in cols and "raw_messages_in" not in cols:
            self._conn.execute("ALTER TABLE traces RENAME COLUMN messages_in TO raw_messages_in")
            cols.add("raw_messages_in")
        # Add new columns if missing (for existing DBs)
        for col, typ in [
            ("system_prompt", "VARCHAR"),
            ("context_messages", "JSON"),
            ("trigger_message", "JSON"),
            ("raw_messages_in", "JSON"),
            ("rating_score", "INTEGER"),
            ("rating_note", "VARCHAR"),
            ("session_id", "VARCHAR"),
        ]:
            if col not in cols:
                self._conn.execute(f"ALTER TABLE traces ADD COLUMN {col} {typ}")

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    def _update_rollup(
        self,
        timestamp: datetime,
        provider: str,
        model: str,
        latency_ms: float,
        prompt_tokens: int | None,
        completion_tokens: int | None,
    ) -> None:
        """Upsert hourly rollup row."""
        assert self._conn is not None
        # Truncate to hour
        period_start = timestamp.replace(minute=0, second=0, microsecond=0)
        self._conn.execute(
            """
            INSERT INTO trace_rollups (
                period_start, provider, model, call_count,
                avg_latency_ms, total_prompt_tokens, total_completion_tokens,
                avg_tokens_per_sec, avg_rating
            ) VALUES (?, ?, ?, 1, ?, ?, ?, NULL, NULL)
            ON CONFLICT (period_start, provider, model) DO UPDATE SET
                call_count = trace_rollups.call_count + 1,
                avg_latency_ms = (trace_rollups.avg_latency_ms * trace_rollups.call_count + excluded.avg_latency_ms) / (trace_rollups.call_count + 1),
                total_prompt_tokens = trace_rollups.total_prompt_tokens + excluded.total_prompt_tokens,
                total_completion_tokens = trace_rollups.total_completion_tokens + excluded.total_completion_tokens
            """,
            [
                period_start,
                provider,
                model,
                latency_ms,
                prompt_tokens or 0,
                completion_tokens or 0,
            ],
        )

    def save_trace(
        self,
        provider: str,
        model: str,
        messages_in: list[dict],
        response_out: str,
        latency_ms: float,
        prompt_tokens: int | None = None,
        completion_tokens: int | None = None,
        system_prompt: str | None = None,
        context_messages: list[dict] | None = None,
        trigger_message: dict | None = None,
        session_id: str | None = None,
    ) -> str:
        if not self._conn:
            raise RuntimeError("TraceStore not initialized")

        trace_id = uuid4().hex
        timestamp = datetime.now(timezone.utc)

        self._conn.execute(
            """
            INSERT INTO traces (
                id, timestamp, provider, model, system_prompt,
                context_messages, trigger_message, raw_messages_in,
                response_out, latency_ms, prompt_tokens, completion_tokens,
                session_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                trace_id,
                timestamp,
                provider,
                model,
                system_prompt,
                json.dumps(context_messages) if context_messages else None,
                json.dumps(trigger_message) if trigger_message else None,
                json.dumps(messages_in),
                response_out,
                latency_ms,
                prompt_tokens,
                completion_tokens,
                session_id,
            ],
        )

        self._update_rollup(
            timestamp, provider, model, latency_ms, prompt_tokens, completion_tokens
        )

        return trace_id

    def get_traces(
        self, limit: int = 50, offset: int = 0, session_id: str | None = None
    ) -> list[dict]:
        if not self._conn:
            raise RuntimeError("TraceStore not initialized")

        if session_id:
            result = self._conn.execute(
                """
                SELECT
                    id, timestamp, provider, model, system_prompt,
                    context_messages, trigger_message, raw_messages_in,
                    response_out, latency_ms, prompt_tokens, completion_tokens,
                    rating_score, rating_note, session_id
                FROM traces
                WHERE session_id = ?
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
                """,
                [session_id, limit, offset],
            ).fetchall()
        else:
            result = self._conn.execute(
                """
                SELECT
                    id, timestamp, provider, model, system_prompt,
                    context_messages, trigger_message, raw_messages_in,
                    response_out, latency_ms, prompt_tokens, completion_tokens,
                    rating_score, rating_note, session_id
                FROM traces
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
                """,
                [limit, offset],
            ).fetchall()

        return [
            {
                "id": row[0],
                "timestamp": row[1].isoformat() if row[1] else None,
                "provider": row[2],
                "model": row[3],
                "system_prompt": row[4],
                "context_messages": json.loads(row[5]) if row[5] else None,
                "trigger_message": json.loads(row[6]) if row[6] else None,
                "raw_messages_in": json.loads(row[7]) if row[7] else [],
                "response_out": row[8],
                "latency_ms": row[9],
                "prompt_tokens": row[10],
                "completion_tokens": row[11],
                "rating_score": row[12],
                "rating_note": row[13],
                "session_id": row[14],
            }
            for row in result
        ]

    def rate_trace(
        self, trace_id: str, score: int, note: str | None = None
    ) -> dict | None:
        if not self._conn:
            raise RuntimeError("TraceStore not initialized")

        self._conn.execute(
            "UPDATE traces SET rating_score = ?, rating_note = ? WHERE id = ?",
            [score, note, trace_id],
        )
        # Verify the trace exists
        row = self._conn.execute(
            "SELECT id FROM traces WHERE id = ?", [trace_id]
        ).fetchone()
        if not row:
            return None
        return {"trace_id": trace_id, "score": score, "note": note}

    def get_performance_stats(self) -> dict:
        if not self._conn:
            raise RuntimeError("TraceStore not initialized")

        # Overall stats
        row = self._conn.execute("""
            SELECT
                count(*) as total_calls,
                avg(latency_ms) as avg_latency,
                sum(prompt_tokens) as total_prompt,
                sum(completion_tokens) as total_completion,
                avg(rating_score) as avg_rating
            FROM traces
        """).fetchone()

        total_calls = row[0] if row else 0
        avg_latency = row[1] if row else 0.0
        total_prompt = int(row[2]) if row and row[2] else 0
        total_completion = int(row[3]) if row and row[3] else 0
        avg_rating = round(row[4], 2) if row and row[4] else None

        # Compute avg tokens/sec where we have token + latency data
        tps_row = self._conn.execute("""
            SELECT avg(
                CASE WHEN latency_ms > 0 AND completion_tokens IS NOT NULL
                THEN completion_tokens / (latency_ms / 1000.0)
                END
            )
            FROM traces
        """).fetchone()
        avg_tps = round(tps_row[0], 2) if tps_row and tps_row[0] else None

        # Per-provider breakdown
        provider_rows = self._conn.execute("""
            SELECT
                provider,
                count(*) as calls,
                avg(latency_ms) as avg_latency,
                avg(rating_score) as avg_rating
            FROM traces
            GROUP BY provider
        """).fetchall()

        by_provider = {}
        for pr in provider_rows:
            by_provider[pr[0]] = {
                "calls": pr[1],
                "avg_latency_ms": round(pr[2], 2) if pr[2] else 0.0,
                "avg_rating": round(pr[3], 2) if pr[3] else None,
            }

        return {
            "total_calls": total_calls,
            "avg_latency_ms": round(avg_latency, 2) if avg_latency else 0.0,
            "avg_tokens_per_sec": avg_tps,
            "total_prompt_tokens": total_prompt,
            "total_completion_tokens": total_completion,
            "avg_rating": avg_rating,
            "by_provider": by_provider,
        }
