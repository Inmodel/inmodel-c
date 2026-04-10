import os
import google.generativeai as genai
import json

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

async def analyze_code_with_llm(files_content: dict) -> int:
    """
    Uses Gemini to analyze the logic and quality of source files.
    Returns a score from 0-12 to be added to the code quality total.
    """
    if not GEMINI_API_KEY:
        # Fallback to a basic length-based score if no API key is present
        total_len = sum(len(c) for c in files_content.values())
        if total_len > 5000: return 8
        if total_len > 1000: return 5
        return 2

    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # Prepare the context from multiple files
    context = ""
    for filename, content in files_content.items():
        context += f"\n--- FILE: {filename} ---\n{content}\n"

    prompt = f"""
    You are a senior Solana developer and hackathon judge. 
    Analyze the following project source code for quality, security, and "Harkirat-style" pragmatism (simplicity, MVP-focus, avoid over-engineering).

    Source Code:
    {context}

    Respond ONLY with a JSON object containing:
    {{
      "score": <number 0-12>,
      "reasoning": "<brief explanation>"
    }}
    """

    try:
        response = model.generate_content(prompt)
        # Extract JSON from response
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        
        data = json.loads(text)
        return int(data.get("score", 0))
    except Exception as e:
        print(f"LLM Error: {e}")
        return 4 # Neutral fallback
