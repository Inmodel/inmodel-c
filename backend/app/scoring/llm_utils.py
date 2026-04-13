import os
import json
import logging
from google import genai

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


async def analyze_code_with_llm(files_content: dict) -> int:
    if not _client:
        logger.warning("[LLM] GEMINI_API_KEY missing. Using length-based heuristic fallback.")
        total_len = sum(len(c) for c in files_content.values())
        if total_len > 5000: return 8
        if total_len > 1000: return 5
        return 2

    context = "".join(f"\n--- FILE: {name} ---\n{content}\n" for name, content in files_content.items())
    prompt = (
        "You are a senior Solana developer and hackathon judge. "
        "Analyze the following project source code for quality, security, and MVP-focus.\n\n"
        f"Source Code:\n{context}\n\n"
        'Respond ONLY with a JSON object: {"score": <0-12>, "reasoning": "<brief>"}'
    )

    try:
        response = _client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        return int(json.loads(text).get("score", 0))
    except Exception as e:
        logger.error(f"[LLM] Error during generation: {e}. Falling back to default score (4).")
        return 4
