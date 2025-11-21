from flask import Flask, render_template, request, jsonify
import os
import json
import re
from LLM_QA_CLI import preprocess_question, construct_prompt, send_to_llm  # reuse functions

app = Flask(__name__)

# Home page
@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

# API endpoint to process and ask LLM
@app.route("/ask", methods=["POST"])
def ask():
    data = request.json or {}
    question = data.get("question", "")
    provider = os.getenv("LLM_PROVIDER", "openai")
    model = os.getenv("LLM_MODEL", "gpt-3.5-turbo")

    if not question:
        return jsonify({"error": "No question provided"}), 400

    processed, tokens = preprocess_question(question)
    prompt = construct_prompt(processed)

    try:
        answer_text, raw = send_to_llm(prompt, provider=provider, model=model)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "original_question": question,
        "processed_question": processed,
        "tokens": tokens,
        "prompt": prompt,
        "answer": answer_text,
        "raw_response": raw
    })

if __name__ == "__main__":
    # For local testing
    app.run(debug=True, host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
