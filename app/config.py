from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM provider selection: "anthropic" or "gemini"
    llm_provider: Literal["anthropic", "gemini"] = "gemini"

    # Anthropic settings
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # Gemini settings
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # Database
    database_path: str = "./data/future_asif.db"

    model_config = {"env_file": ".env"}


settings = Settings()
