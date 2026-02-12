from datetime import datetime, timezone
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies import set_llm_client, set_message_store, set_trace_store
from app.main import app


class FakeMessageStore:
    def __init__(self):
        self.messages: list[dict] = []
        self.archived: list[dict] = []
        self.sessions: list[dict] = []
        self.session_history: list[dict] = []
        self._active_session_id: str | None = None

    async def init(self) -> None:
        pass

    async def close(self) -> None:
        pass

    async def save_message(self, role: str, content: str) -> tuple[str, str]:
        msg_id = uuid4().hex
        timestamp = datetime.now(timezone.utc).isoformat()
        self.messages.append(
            {
                "id": msg_id,
                "role": role,
                "content": content,
                "timestamp": timestamp,
            }
        )
        return msg_id, timestamp

    async def get_history(
        self, limit: int, before: str | None
    ) -> list[dict]:
        # Sort newest first
        sorted_msgs = sorted(
            self.messages, key=lambda m: m["timestamp"], reverse=True
        )
        if before:
            sorted_msgs = [
                m for m in sorted_msgs if m["timestamp"] < before
            ]
        return sorted_msgs[:limit]

    async def archive_messages(self) -> tuple[int, str]:
        count = len(self.messages)
        archived_at = datetime.now(timezone.utc).isoformat()
        for msg in self.messages:
            self.archived.append({**msg, "archived_at": archived_at})
        self.messages.clear()
        return count, archived_at

    async def create_session(
        self, provider: str, model: str, context_messages: int, note: str | None
    ) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        new_id = uuid4().hex
        ended_session = None

        # Close active session if exists
        if self._active_session_id:
            prev = next(
                (s for s in self.sessions if s["id"] == self._active_session_id), None
            )
            if prev:
                prev["ended_at"] = now
                msg_count = len(self.messages)
                for msg in self.messages:
                    self.session_history.append(
                        {**msg, "session_id": prev["id"]}
                    )
                self.messages.clear()
                ended_session = {
                    "id": prev["id"],
                    "message_count": msg_count,
                    "started_at": prev["started_at"],
                    "ended_at": now,
                }
        else:
            # First session: move any pre-session messages to history
            for msg in self.messages:
                self.session_history.append({**msg, "session_id": None})
            self.messages.clear()

        session = {
            "id": new_id,
            "started_at": now,
            "ended_at": None,
            "note": note,
            "provider": provider,
            "model": model,
            "context_messages": context_messages,
        }
        self.sessions.append(session)
        self._active_session_id = new_id

        return {
            "session_id": new_id,
            "ended_session": ended_session,
            "config_snapshot": {
                "provider": provider,
                "model": model,
                "context_messages": context_messages,
            },
        }

    async def get_sessions(self) -> list[dict]:
        result = []
        for s in sorted(self.sessions, key=lambda x: x["started_at"], reverse=True):
            is_active = s["ended_at"] is None
            if is_active:
                msg_count = len(self.messages)
            else:
                msg_count = len(
                    [sh for sh in self.session_history if sh["session_id"] == s["id"]]
                )
            result.append({
                "id": s["id"],
                "started_at": s["started_at"],
                "ended_at": s["ended_at"],
                "note": s["note"],
                "config_snapshot": {
                    "provider": s["provider"],
                    "model": s["model"],
                    "context_messages": s["context_messages"],
                },
                "message_count": msg_count,
                "is_active": is_active,
            })
        return result

    async def get_active_session_id(self) -> str | None:
        return self._active_session_id

    async def search_messages(
        self,
        limit: int,
        offset: int,
        role: str | None = None,
        query: str | None = None,
    ) -> tuple[list[dict], int]:
        # Combine active + session history
        all_msgs = list(self.messages) + [
            {"id": sh["id"], "role": sh["role"], "content": sh["content"], "timestamp": sh["timestamp"]}
            for sh in self.session_history
        ]
        if role:
            all_msgs = [m for m in all_msgs if m["role"] == role]
        if query:
            all_msgs = [m for m in all_msgs if query.lower() in m["content"].lower()]
        all_msgs.sort(key=lambda m: m["timestamp"], reverse=True)
        total = len(all_msgs)
        return all_msgs[offset : offset + limit], total

    async def get_message_stats(self) -> dict:
        all_msgs = list(self.messages) + [
            {"role": sh["role"], "timestamp": sh["timestamp"]}
            for sh in self.session_history
        ]
        total = len(all_msgs)
        user_count = len([m for m in all_msgs if m["role"] == "user"])
        assistant_count = len([m for m in all_msgs if m["role"] == "assistant"])
        timestamps = [m["timestamp"] for m in all_msgs]
        return {
            "total_messages": total,
            "user_messages": user_count,
            "assistant_messages": assistant_count,
            "messages_today": len(self.messages),
            "first_message_at": min(timestamps) if timestamps else None,
            "last_message_at": max(timestamps) if timestamps else None,
        }


class FakeLLMClient:
    def __init__(self, canned_response: str = "I am Future Asif."):
        self.canned_response = canned_response
        self.last_message: str | None = None
        self.last_history: list[dict] | None = None

    async def get_response(
        self, message: str, history: list[dict] | None = None
    ) -> str:
        self.last_message = message
        self.last_history = history
        return self.canned_response


class FakeTraceStore:
    def __init__(self):
        self.traces: list[dict] = []

    def init(self) -> None:
        pass

    def close(self) -> None:
        pass

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
        trace_id = uuid4().hex
        timestamp = datetime.now(timezone.utc).isoformat()
        self.traces.append({
            "id": trace_id,
            "timestamp": timestamp,
            "provider": provider,
            "model": model,
            "system_prompt": system_prompt,
            "context_messages": context_messages,
            "trigger_message": trigger_message,
            "raw_messages_in": messages_in,
            "response_out": response_out,
            "latency_ms": latency_ms,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "rating_score": None,
            "rating_note": None,
            "session_id": session_id,
        })
        return trace_id

    def get_traces(
        self, limit: int = 50, offset: int = 0, session_id: str | None = None
    ) -> list[dict]:
        traces = self.traces
        if session_id:
            traces = [t for t in traces if t.get("session_id") == session_id]
        return traces[offset : offset + limit]

    def rate_trace(
        self, trace_id: str, score: int, note: str | None = None
    ) -> dict | None:
        for t in self.traces:
            if t["id"] == trace_id:
                t["rating_score"] = score
                t["rating_note"] = note
                return {"trace_id": trace_id, "score": score, "note": note}
        return None

    def get_performance_stats(self) -> dict:
        total = len(self.traces)
        if total == 0:
            return {
                "total_calls": 0,
                "avg_latency_ms": 0.0,
                "avg_tokens_per_sec": None,
                "total_prompt_tokens": 0,
                "total_completion_tokens": 0,
                "avg_rating": None,
                "by_provider": {},
            }
        avg_latency = sum(t["latency_ms"] for t in self.traces) / total
        ratings = [t["rating_score"] for t in self.traces if t["rating_score"] is not None]
        avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

        by_provider: dict[str, dict] = {}
        for t in self.traces:
            p = t["provider"]
            if p not in by_provider:
                by_provider[p] = {"calls": 0, "latency_sum": 0.0, "ratings": []}
            by_provider[p]["calls"] += 1
            by_provider[p]["latency_sum"] += t["latency_ms"]
            if t["rating_score"] is not None:
                by_provider[p]["ratings"].append(t["rating_score"])

        by_provider_out = {}
        for p, data in by_provider.items():
            r = data["ratings"]
            by_provider_out[p] = {
                "calls": data["calls"],
                "avg_latency_ms": data["latency_sum"] / data["calls"],
                "avg_rating": round(sum(r) / len(r), 2) if r else None,
            }

        return {
            "total_calls": total,
            "avg_latency_ms": avg_latency,
            "avg_tokens_per_sec": None,
            "total_prompt_tokens": sum(t.get("prompt_tokens") or 0 for t in self.traces),
            "total_completion_tokens": sum(t.get("completion_tokens") or 0 for t in self.traces),
            "avg_rating": avg_rating,
            "by_provider": by_provider_out,
        }


@pytest.fixture
def fake_store():
    return FakeMessageStore()


@pytest.fixture
def fake_llm():
    return FakeLLMClient()


@pytest.fixture
def fake_traces():
    return FakeTraceStore()


@pytest.fixture
async def client(fake_store, fake_llm, fake_traces):
    set_message_store(fake_store)
    set_llm_client(fake_llm)
    set_trace_store(fake_traces)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
