import logging

import httpx

logger = logging.getLogger(__name__)


class OpenAICompatClient:
    """LLM client for any OpenAI-compatible API (vLLM, Modal, RunPod, etc.)."""

    def __init__(
        self,
        base_url: str,
        model: str,
        system_prompt: str,
        api_key: str | None = None,
        http_client: httpx.AsyncClient | None = None,
    ):
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._system_prompt = system_prompt
        self._api_key = api_key
        self._external_client = http_client

    async def get_response(
        self, message: str, history: list[dict] | None = None
    ) -> str:
        messages = [{"role": "system", "content": self._system_prompt}]

        if history:
            for msg in history:
                messages.append({"role": msg["role"], "content": msg["content"]})

        messages.append({"role": "user", "content": message})

        headers: dict[str, str] = {}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        logger.info(
            f"[openai_compat] Request: model={self._model}, "
            f"context_msgs={len(history) if history else 0}, prompt_len={len(message)}"
        )

        payload = {"model": self._model, "messages": messages}

        if self._external_client:
            response = await self._external_client.post(
                f"{self._base_url}/chat/completions",
                json=payload,
                headers=headers,
            )
        else:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self._base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                )

        response.raise_for_status()
        data = response.json()

        usage = data.get("usage", {})
        logger.info(
            f"[openai_compat] Response: "
            f"prompt_tokens={usage.get('prompt_tokens', '?')}, "
            f"completion_tokens={usage.get('completion_tokens', '?')}"
        )

        return data["choices"][0]["message"]["content"]
