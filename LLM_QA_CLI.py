#!/usr/bin/env python3
"""
LLM_QA_CLI.py
Simple CLI that accepts a natural-language question, preprocesses it,
sends it to an LLM (OpenAI example), and prints the answer.

Usage: python LLM_QA_CLI.py
"""

import os
import re
import json
import sys
from typing import Dict, Any, Tuple, List

# If using OpenAI, install openai and python-dotenv (optional)
# pip install openai python-dotenv
try:
    import openai
except Exception:
    openai = None

# ---------- Preprocessing ----------
def preprocess_question(text: str) -> Tuple[str, List[str]]:
    """
    Basic preprocessing:
      - lowercase
      - remove punctuation
      - simple tokenization (split on whitespace)
    Returns (processed_text, tokens)
    """
    text = text.strip().lower()
    # remove punctuation (keep question mark optional)
    text = re.sub(r"[^\w\s]", " ", text)
    # collapse multiple spaces
    text = re.sub(r"\s+", " ", text).strip()
    tokens = text.split()
    return text, tokens

# ---------- Prompt construction ----------
def construct_prompt(processed_question: str, task_instructions: str = None) -> str:
    """
    Construct a prompt to send to the LLM. You can adapt the instructions to your needs.
    """
    base_instructions = (
        "You are a helpful assistant. Answer the user question concisely, provide steps if relevant, "
        "and include a short summary at the end (1-2 sentences). Be factual and mention sources if the answer "
        "requires real-world facts (but do not invent citations)."
    )
    if task_instructions:
        base_instructions += " " + task_instructions

    prompt = (
        f"{base_instructions}\n\n"
        f"User question (processed):\n{processed_question}\n\n"
        f"Answer:"
    )
    return prompt

# ---------- LLM client wrapper (OpenAI example) ----------
def send_to_openai(prompt: str, model: str = "gpt-3.5-turbo", max_tokens: int = 512, temperature: float = 0.2) -> Dict[str, Any]:
    """
    Send the prompt to OpenAI ChatCompletion (chat API).
    Requires OPENAI_API_KEY in environment.
    Returns the response dict.
    """
    if openai is None:
        raise RuntimeError("openai package is not installed. Install with: pip install openai")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable not set. export OPENAI_API_KEY='sk-...'")

    openai.api_key = api_key

    # We use the chat completion format
    resp = openai.ChatCompletion.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return resp

# ---------- Generic send wrapper so it's easy to swap providers ----------
def send_to_llm(prompt: str, provider: str = "openai", **kwargs) -> Tuple[str, Dict[str, Any]]:
    """
    Send prompt to selected provider. Returns (answer_text, raw_response).
    Supported provider: 'openai' (default).
    """
    provider = provider.lower()
    if provider == "openai":
        raw = send_to_openai(prompt, **kwargs)
        # extract text
        try:
            text = raw["choices"][0]["message"]["content"].strip()
        except Exception:
            text = json.dumps(raw)
        return text, raw
    else:
        raise NotImplementedError(f"Provider '{provider}' not implemented yet. Add your provider integration.")

# ---------- CLI main loop ----------
def main():
    print("=== LLM_QA_CLI ===")
    print("Type your question and press Enter. Type 'exit' or Ctrl-C to quit.\n")

    provider = os.getenv("LLM_PROVIDER", "openai")
    model = os.getenv("LLM_MODEL", "gpt-3.5-turbo")

    while True:
        try:
            question = input("Question> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye.")
            sys.exit(0)

        if not question:
            continue
        if question.lower() in ("exit", "quit"):
            print("Goodbye.")
            break

        processed, tokens = preprocess_question(question)
        prompt = construct_prompt(processed)

        print("\nProcessed question:", processed)
        print("Tokens:", tokens)
        print("Sending to LLM (provider:", provider, "model:", model, ") ...\n")

        try:
            answer, raw = send_to_llm(prompt, provider=provider, model=model)
        except Exception as e:
            print("Error calling LLM:", str(e))
            continue

        print("=== LLM ANSWER ===")
        print(answer)
        print("\n=== RAW RESPONSE (abbreviated) ===")
        # print a short summary of raw
        try:
            print(json.dumps(raw, indent=2)[:2000])
        except Exception:
            print(str(raw))

        print("\n---\n")

if __name__ == "__main__":
    main()
