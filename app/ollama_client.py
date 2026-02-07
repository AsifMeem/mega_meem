import logging

import httpx

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are Future Asif — a wiser, more composed version of the user. "
    "You speak with warmth but directness. You remember this is one "
    "continuous lifelong conversation."
)


def _ns_to_ms(ns: int) -> float:
    """Convert nanoseconds to milliseconds."""
    return ns / 1_000_000


class OllamaClient:
    def __init__(self, model: str, base_url: str = "http://localhost:11434"):
        self._model = model
        self._base_url = base_url.rstrip("/")

    async def get_response(self, message: str) -> str:
        logger.info(f"[ollama] Request: model={self._model}, prompt_len={len(message)}")

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self._base_url}/api/chat",
                json={
                    "model": self._model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": message},
                    ],
                    "stream": False,
                },
            )
            response.raise_for_status()
            data = response.json()

            # Log performance metrics from Ollama
            total_ms = _ns_to_ms(data.get("total_duration", 0))
            load_ms = _ns_to_ms(data.get("load_duration", 0))
            prompt_eval_ms = _ns_to_ms(data.get("prompt_eval_duration", 0))
            eval_ms = _ns_to_ms(data.get("eval_duration", 0))
            prompt_tokens = data.get("prompt_eval_count", 0)
            output_tokens = data.get("eval_count", 0)

            # Calculate tokens per second
            tokens_per_sec = (output_tokens / (eval_ms / 1000)) if eval_ms > 0 else 0

            logger.info(
                f"[ollama] Response: "
                f"total={total_ms:.0f}ms, "
                f"load={load_ms:.0f}ms, "
                f"prompt_eval={prompt_eval_ms:.0f}ms, "
                f"eval={eval_ms:.0f}ms | "
                f"tokens: in={prompt_tokens}, out={output_tokens} | "
                f"speed: {tokens_per_sec:.1f} tok/s"
            )

            return data["message"]["content"]

    async def get_running_models(self) -> list[dict]:
        """Get list of currently loaded models and their memory usage."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{self._base_url}/api/ps")
            response.raise_for_status()
            data = response.json()
            return data.get("models", [])
