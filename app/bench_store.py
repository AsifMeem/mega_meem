import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import duckdb


class DuckDBBenchStore:
    def __init__(self, db_path: str = "./data/traces.duckdb"):
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._db_path = db_path
        self._conn: duckdb.DuckDBPyConnection | None = None

    def init(self) -> None:
        self._conn = duckdb.connect(self._db_path)
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS bench_runs (
                id VARCHAR PRIMARY KEY,
                scenario_id VARCHAR,
                title VARCHAR,
                provider VARCHAR,
                model VARCHAR,
                context_messages INTEGER,
                started_at TIMESTAMP,
                ended_at TIMESTAMP,
                notes VARCHAR,
                summary JSON
            )
            """
        )
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS bench_turns (
                run_id VARCHAR,
                idx INTEGER,
                role VARCHAR,
                content VARCHAR,
                response VARCHAR,
                latency_ms DOUBLE,
                trace_id VARCHAR,
                PRIMARY KEY (run_id, idx)
            )
            """
        )
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS bench_probes (
                run_id VARCHAR,
                idx INTEGER,
                probe_id VARCHAR,
                probe_type VARCHAR,
                question VARCHAR,
                expected JSON,
                response VARCHAR,
                score DOUBLE,
                metrics JSON,
                PRIMARY KEY (run_id, idx)
            )
            """
        )
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS bench_scores (
                run_id VARCHAR,
                metric VARCHAR,
                value DOUBLE,
                PRIMARY KEY (run_id, metric)
            )
            """
        )

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    def create_run(
        self,
        scenario_id: str,
        title: str,
        provider: str,
        model: str,
        context_messages: int | None,
        notes: str | None = None,
    ) -> str:
        if not self._conn:
            raise RuntimeError("BenchStore not initialized")
        run_id = uuid4().hex
        now = datetime.now(timezone.utc)
        self._conn.execute(
            """
            INSERT INTO bench_runs (
                id, scenario_id, title, provider, model, context_messages,
                started_at, ended_at, notes, summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)
            """,
            [
                run_id,
                scenario_id,
                title,
                provider,
                model,
                context_messages,
                now,
                notes,
            ],
        )
        return run_id

    def add_turn(
        self,
        run_id: str,
        idx: int,
        role: str,
        content: str,
        response: str | None = None,
        latency_ms: float | None = None,
        trace_id: str | None = None,
    ) -> None:
        if not self._conn:
            raise RuntimeError("BenchStore not initialized")
        self._conn.execute(
            """
            INSERT INTO bench_turns (run_id, idx, role, content, response, latency_ms, trace_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [run_id, idx, role, content, response, latency_ms, trace_id],
        )

    def add_probe(
        self,
        run_id: str,
        idx: int,
        probe_id: str,
        probe_type: str,
        question: str,
        expected: dict,
        response: str,
        score: float,
        metrics: dict,
    ) -> None:
        if not self._conn:
            raise RuntimeError("BenchStore not initialized")
        self._conn.execute(
            """
            INSERT INTO bench_probes (
                run_id, idx, probe_id, probe_type, question, expected, response, score, metrics
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                run_id,
                idx,
                probe_id,
                probe_type,
                question,
                json.dumps(expected),
                response,
                score,
                json.dumps(metrics),
            ],
        )

    def set_scores(self, run_id: str, scores: dict[str, float]) -> None:
        if not self._conn:
            raise RuntimeError("BenchStore not initialized")
        for metric, value in scores.items():
            self._conn.execute(
                """
                INSERT INTO bench_scores (run_id, metric, value)
                VALUES (?, ?, ?)
                ON CONFLICT (run_id, metric) DO UPDATE SET value = excluded.value
                """,
                [run_id, metric, value],
            )

    def finalize_run(self, run_id: str, summary: dict) -> None:
        if not self._conn:
            raise RuntimeError("BenchStore not initialized")
        now = datetime.now(timezone.utc)
        self._conn.execute(
            """
            UPDATE bench_runs SET ended_at = ?, summary = ? WHERE id = ?
            """,
            [now, json.dumps(summary), run_id],
        )

    def list_runs(self, limit: int = 50, offset: int = 0) -> list[dict]:
        if not self._conn:
            raise RuntimeError("BenchStore not initialized")
        rows = self._conn.execute(
            """
            SELECT id, scenario_id, title, provider, model, context_messages,
                   started_at, ended_at, notes, summary
            FROM bench_runs
            ORDER BY started_at DESC
            LIMIT ? OFFSET ?
            """,
            [limit, offset],
        ).fetchall()
        return [
            {
                "id": r[0],
                "scenario_id": r[1],
                "title": r[2],
                "provider": r[3],
                "model": r[4],
                "context_messages": r[5],
                "started_at": r[6].isoformat() if r[6] else None,
                "ended_at": r[7].isoformat() if r[7] else None,
                "notes": r[8],
                "summary": json.loads(r[9]) if r[9] else None,
            }
            for r in rows
        ]

    def get_run(self, run_id: str) -> dict | None:
        if not self._conn:
            raise RuntimeError("BenchStore not initialized")
        run = self._conn.execute(
            """
            SELECT id, scenario_id, title, provider, model, context_messages,
                   started_at, ended_at, notes, summary
            FROM bench_runs
            WHERE id = ?
            """,
            [run_id],
        ).fetchone()
        if not run:
            return None
        turns = self._conn.execute(
            """
            SELECT idx, role, content, response, latency_ms, trace_id
            FROM bench_turns
            WHERE run_id = ?
            ORDER BY idx ASC
            """,
            [run_id],
        ).fetchall()
        probes = self._conn.execute(
            """
            SELECT idx, probe_id, probe_type, question, expected, response, score, metrics
            FROM bench_probes
            WHERE run_id = ?
            ORDER BY idx ASC
            """,
            [run_id],
        ).fetchall()
        scores = self._conn.execute(
            """
            SELECT metric, value FROM bench_scores WHERE run_id = ?
            """,
            [run_id],
        ).fetchall()
        return {
            "id": run[0],
            "scenario_id": run[1],
            "title": run[2],
            "provider": run[3],
            "model": run[4],
            "context_messages": run[5],
            "started_at": run[6].isoformat() if run[6] else None,
            "ended_at": run[7].isoformat() if run[7] else None,
            "notes": run[8],
            "summary": json.loads(run[9]) if run[9] else None,
            "turns": [
                {
                    "idx": t[0],
                    "role": t[1],
                    "content": t[2],
                    "response": t[3],
                    "latency_ms": t[4],
                    "trace_id": t[5],
                }
                for t in turns
            ],
            "probes": [
                {
                    "idx": p[0],
                    "probe_id": p[1],
                    "probe_type": p[2],
                    "question": p[3],
                    "expected": json.loads(p[4]) if p[4] else None,
                    "response": p[5],
                    "score": p[6],
                    "metrics": json.loads(p[7]) if p[7] else None,
                }
                for p in probes
            ],
            "scores": {s[0]: s[1] for s in scores},
        }

    def get_summary(self) -> dict:
        if not self._conn:
            raise RuntimeError("BenchStore not initialized")
        rows = self._conn.execute(
            """
            SELECT
                run_id,
                metric,
                value,
                br.provider,
                br.model,
                br.scenario_id,
                br.started_at
            FROM bench_scores bs
            JOIN bench_runs br ON br.id = bs.run_id
            """
        ).fetchall()
        return [
            {
                "run_id": r[0],
                "metric": r[1],
                "value": r[2],
                "provider": r[3],
                "model": r[4],
                "scenario_id": r[5],
                "started_at": r[6].isoformat() if r[6] else None,
            }
            for r in rows
        ]
