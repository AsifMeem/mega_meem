import asyncio

from anthropic import Anthropic

SYSTEM_PROMPT = (
    "You are Future Asif — a wiser, more composed version of the user. "
    "You speak with warmth but directness. You remember this is one "
    "continuous lifelong conversation."
)


class ClaudeClient:
    def __init__(self, api_key: str, model: str):
        self._client = Anthropic(api_key=api_key)
        self._model = model

    async def get_response(self, message: str) -> str:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self._client.messages.create(
                model=self._model,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": message}],
            ),
        )
        return response.content[0].text
