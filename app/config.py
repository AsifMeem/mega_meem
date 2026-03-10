from typing import Literal
from pathlib import Path

from pydantic_settings import BaseSettings


_DEFAULT_SYSTEM_PROMPT = (
    "You are Future Me — a wiser, more composed version of the user. "
    "You speak with warmth but directness. You remember this is one "
    "continuous lifelong conversation."
)

PROMPT_PATH = Path(__file__).resolve().parents[1] / "docs" / "prompts" / "director_system_prompt.md"


def _load_prompt(path: Path) -> str:
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    return _DEFAULT_SYSTEM_PROMPT


class Settings(BaseSettings):
    # LLM provider selection
    llm_provider: Literal["anthropic", "gemini", "ollama", "openai_compat"] = "gemini"

    # Anthropic settings
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"
    anthropic_system_prompt: str = _load_prompt(PROMPT_PATH)

    # Gemini settings
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    gemini_system_prompt: str = _load_prompt(PROMPT_PATH)

    # Ollama settings (local inference)
    ollama_model: str = "llama3.2:8b"
    ollama_base_url: str = "http://localhost:11434"
    ollama_system_prompt: str = _load_prompt(PROMPT_PATH)
    ollama_embed_model: str | None = None  # reuse ollama_model if None

    # OpenAI-compatible settings (vLLM, Modal, RunPod, etc.)
    openai_compat_base_url: str = "http://localhost:8001/v1"
    openai_compat_model: str = "meta-llama/Llama-3.1-8B-Instruct"
    openai_compat_api_key: str = ""
    openai_compat_system_prompt: str = _load_prompt(PROMPT_PATH)

    # Embedding provider selection
    embedding_provider: Literal["ollama", "openai_compat"] = "ollama"
    embedding_base_url: str = ""  # defaults to ollama_base_url or openai_compat_base_url
    embedding_model: str = ""  # defaults to ollama_embed_model or "BAAI/bge-small-en-v1.5"
    embedding_api_key: str = ""

    # Context settings
    context_messages: int = 20  # Number of recent messages to pass to LLM
    memory_top_k: int = 3  # Number of long-term memories to retrieve
    memory_max_chars: int = 800  # Max chars of injected long-term memory

    # API key for securing endpoints (empty = no auth required)
    api_key: str = ""

    # CORS — extra origins (comma-separated) for Railway/custom domains
    cors_extra_origins: str = ""

    # Database
    database_path: str = "./data/future_asif.db"
    trace_db_path: str = "./data/traces.duckdb"

    model_config = {"env_file": ".env"}

    @property
    def active_system_prompt(self) -> str:
        """Get the system prompt for the currently configured provider."""
        if self.llm_provider == "anthropic":
            return self.anthropic_system_prompt
        elif self.llm_provider == "gemini":
            return self.gemini_system_prompt
        elif self.llm_provider == "ollama":
            return self.ollama_system_prompt
        elif self.llm_provider == "openai_compat":
            return self.openai_compat_system_prompt
        return _DEFAULT_SYSTEM_PROMPT


settings = Settings()
