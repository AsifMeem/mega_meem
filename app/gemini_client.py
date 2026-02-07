import asyncio

from google import genai

SYSTEM_PROMPT = (
    "You are Future Asif — a wiser, more composed version of the user. "
    "You speak with warmth but directness. You remember this is one "
    "continuous lifelong conversation."
)

# Models that don't support system instructions
NO_SYSTEM_INSTRUCTION_MODELS = ["gemma-3-1b-it", "gemma-3-4b-it"]


class GeminiClient:
    def __init__(self, api_key: str, model: str):
        self._client = genai.Client(api_key=api_key)
        self._model = model
        self._supports_system = not any(
            m in model for m in NO_SYSTEM_INSTRUCTION_MODELS
        )

    async def get_response(self, message: str) -> str:
        loop = asyncio.get_event_loop()

        if self._supports_system:
            config = genai.types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=1024,
            )
            contents = message
        else:
            # Prepend system prompt to user message for models without system instruction support
            config = genai.types.GenerateContentConfig(
                max_output_tokens=1024,
            )
            contents = f"{SYSTEM_PROMPT}\n\nUser: {message}\n\nAssistant:"

        response = await loop.run_in_executor(
            None,
            lambda: self._client.models.generate_content(
                model=self._model,
                contents=contents,
                config=config,
            ),
        )
        return response.text
