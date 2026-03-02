import logging

import httpx

logger = logging.getLogger(__name__)


class OllamaEmbedder:
    """Embedding provider using Ollama's /api/embeddings endpoint."""

    def __init__(self, base_url: str, model: str):
        self._base_url = base_url.rstrip("/")
        self._model = model

    async def embed(self, text: str) -> list[float]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self._base_url}/api/embeddings",
                json={"model": self._model, "prompt": text},
            )
            response.raise_for_status()
            data = response.json()
            return data.get("embedding", [])


class OpenAICompatEmbedder:
    """Embedding provider using any OpenAI-compatible /v1/embeddings endpoint."""

    def __init__(self, base_url: str, model: str, api_key: str | None = None):
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._api_key = api_key

    async def embed(self, text: str) -> list[float]:
        headers: dict[str, str] = {}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self._base_url}/v1/embeddings",
                json={"model": self._model, "input": text},
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            return data["data"][0]["embedding"]
