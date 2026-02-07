from app.protocols import LLMClient, MessageStore

_message_store: MessageStore | None = None
_llm_client: LLMClient | None = None


def set_message_store(store: MessageStore) -> None:
    global _message_store
    _message_store = store


def set_llm_client(client: LLMClient) -> None:
    global _llm_client
    _llm_client = client


def get_message_store() -> MessageStore:
    assert _message_store is not None, "MessageStore not initialized"
    return _message_store


def get_llm_client() -> LLMClient:
    assert _llm_client is not None, "LLMClient not initialized"
    return _llm_client
