import asyncio

from google import genai

# Models that don't support system instructions
NO_SYSTEM_INSTRUCTION_MODELS = ["gemma-3-1b-it", "gemma-3-4b-it"]


class GeminiClient:
    def __init__(self, api_key: str, model: str, system_prompt: str):
        self._client = genai.Client(api_key=api_key)
        self._model = model
        self._system_prompt = system_prompt
        self._supports_system = not any(
            m in model for m in NO_SYSTEM_INSTRUCTION_MODELS
        )

    async def get_response(
        self, message: str, history: list[dict] | None = None
    ) -> str:
        loop = asyncio.get_event_loop()

        # Build conversation contents
        contents = []
        if history:
            for msg in history:
                # Gemini uses "model" instead of "assistant"
                role = "model" if msg["role"] == "assistant" else msg["role"]
                contents.append({"role": role, "parts": [{"text": msg["content"]}]})
        contents.append({"role": "user", "parts": [{"text": message}]})

        if self._supports_system:
            config = genai.types.GenerateContentConfig(
                system_instruction=self._system_prompt,
                max_output_tokens=1024,
            )
        else:
            # Prepend system prompt to first user message
            config = genai.types.GenerateContentConfig(
                max_output_tokens=1024,
            )
            if contents and contents[0]["role"] == "user":
                original_text = contents[0]["parts"][0]["text"]
                contents[0]["parts"][0]["text"] = f"{self._system_prompt}\n\n{original_text}"

        response = await loop.run_in_executor(
            None,
            lambda: self._client.models.generate_content(
                model=self._model,
                contents=contents,
                config=config,
            ),
        )
        return response.text
