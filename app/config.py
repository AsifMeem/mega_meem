from typing import Literal

from pydantic_settings import BaseSettings


_DEFAULT_SYSTEM_PROMPT = (
    "You are Future Asif — a wiser, more composed version of the user. "
    "You speak with warmth but directness. You remember this is one "
    "continuous lifelong conversation."
)


class Settings(BaseSettings):
    # LLM provider selection: "anthropic", "gemini", or "ollama"
    llm_provider: Literal["anthropic", "gemini", "ollama"] = "gemini"

    # Anthropic settings
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"
    anthropic_system_prompt: str = _DEFAULT_SYSTEM_PROMPT

    # Gemini settings
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    gemini_system_prompt: str = _DEFAULT_SYSTEM_PROMPT

    # Ollama settings (local inference)
    ollama_model: str = "llama3.2:8b"
    ollama_base_url: str = "http://localhost:11434"
    ollama_system_prompt: str = _DEFAULT_SYSTEM_PROMPT

    # Context settings
    context_messages: int = 20  # Number of recent messages to pass to LLM

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
        return _DEFAULT_SYSTEM_PROMPT


settings = Settings()
