from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM provider selection: "anthropic", "gemini", or "ollama"
    llm_provider: Literal["anthropic", "gemini", "ollama"] = "gemini"

    # Anthropic settings
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # Gemini settings
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # Ollama settings (local inference)
    ollama_model: str = "llama3.2:8b"
    ollama_base_url: str = "http://localhost:11434"

    # Database
    database_path: str = "./data/future_asif.db"

    model_config = {"env_file": ".env"}


settings = Settings()
