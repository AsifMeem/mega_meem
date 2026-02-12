import asyncio

from anthropic import Anthropic


class ClaudeClient:
    def __init__(self, api_key: str, model: str, system_prompt: str):
        self._client = Anthropic(api_key=api_key)
        self._model = model
        self._system_prompt = system_prompt

    async def get_response(
        self, message: str, history: list[dict] | None = None
    ) -> str:
        messages = []

        if history:
            for msg in history:
                messages.append({"role": msg["role"], "content": msg["content"]})

        messages.append({"role": "user", "content": message})

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self._client.messages.create(
                model=self._model,
                max_tokens=1024,
                system=self._system_prompt,
                messages=messages,
            ),
        )
        return response.content[0].text
