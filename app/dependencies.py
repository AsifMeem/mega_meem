from app.protocols import LLMClient, MessageStore, TraceStore
from app.bench_store import DuckDBBenchStore

_message_store: MessageStore | None = None
_llm_client: LLMClient | None = None
_trace_store: TraceStore | None = None
_bench_store: DuckDBBenchStore | None = None


def set_message_store(store: MessageStore) -> None:
    global _message_store
    _message_store = store


def set_llm_client(client: LLMClient) -> None:
    global _llm_client
    _llm_client = client


def set_trace_store(store: TraceStore) -> None:
    global _trace_store
    _trace_store = store


def set_bench_store(store: DuckDBBenchStore) -> None:
    global _bench_store
    _bench_store = store


def get_message_store() -> MessageStore:
    assert _message_store is not None, "MessageStore not initialized"
    return _message_store


def get_llm_client() -> LLMClient:
    assert _llm_client is not None, "LLMClient not initialized"
    return _llm_client


def get_trace_store() -> TraceStore:
    assert _trace_store is not None, "TraceStore not initialized"
    return _trace_store


def get_bench_store() -> DuckDBBenchStore:
    assert _bench_store is not None, "BenchStore not initialized"
    return _bench_store
