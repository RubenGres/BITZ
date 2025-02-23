import os
import base64
import json
import datetime
import markdown
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI

from dotenv import load_dotenv

load_dotenv()

# Initialize the model
model = ChatOpenAI(model="gpt-4o")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

HISTORY_DIR = "./history"
os.makedirs(HISTORY_DIR, exist_ok=True)

def save_conversation(system_prompt, conversation_id, history):
    """Save conversation history and images."""
    convo_dir = os.path.join(HISTORY_DIR, conversation_id)
    os.makedirs(convo_dir, exist_ok=True)

    conversation_data = {
        "system_prompt": system_prompt,
        "history": history  # Ensure it's saved as a list of dictionaries
    }

    history_file = os.path.join(convo_dir, "history.json")
    with open(history_file, "w") as f:
        json.dump(conversation_data, f, indent=4)

def load_conversation(conversation_id):
    """Load conversation history if it exists."""
    convo_dir = os.path.join(HISTORY_DIR, conversation_id)
    history_file = os.path.join(convo_dir, "history.json")

    if os.path.exists(history_file):
        with open(history_file, "r") as f:
            data = json.load(f)
            return data.get("history", [])
    return []

@app.route("/", methods=["GET"])
def home():
    return "Everything is working!"

@app.route("/load", methods=["POST"])
def load_history():
    data = request.json
    conversation_id = data.get("conversation_id")
    conversation = load_conversation(conversation_id)
    return conversation

@app.route("/chat", methods=["POST"])
def chat():
    """Handles text and image input for biodiversity exploration."""
    data = request.json
    conversation_id = data.get("conversation_id")
    message = data.get("message", "")
    user_location = data.get("user_location")
    system_prompt = data.get("system_prompt")
    image_b64 = data.get("image_b64", None)
    image_location = data.get("image_location", None)
    
    if not conversation_id:
        return jsonify({"error": "Please provide a conversation_id."}), 400
    
    if not user_location:
        return jsonify({"error": "Please provide a user location."}), 400
    
    formatted_system_prompt = system_prompt.format(user_location=user_location)

    history = load_conversation(conversation_id)
    messages = [SystemMessage(content=formatted_system_prompt)]
    
    for entry in history:
        messages.append(HumanMessage(content=[{"type": "text", "text": entry["user"]}]))
        messages.append(AIMessage(content=entry["assistant"]))
    
    user_message_content = [{"type": "text", "text": message}]
    timestamp = datetime.datetime.utcnow().isoformat()
    image_filename = None
    
    if image_b64:
        convo_dir = os.path.join(HISTORY_DIR, conversation_id)
        image_filename = f"{len(history)}_image.jpg"
        image_path = os.path.join(convo_dir, image_filename)
        image_data = base64.b64decode(image_b64)

        os.makedirs(os.path.dirname(image_path), exist_ok=True)

        with open(image_path, "wb") as img_file:
            img_file.write(image_data)
        user_message_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
        })
    
    messages.append(HumanMessage(content=user_message_content))
    
    ai_response = model.invoke(messages)
    
    user_message = {
        "user": message,
        "timestamp": timestamp,
    }

    if image_filename:
        user_message["image_filename"] = image_filename,

    if image_location:
        user_message["image_location"] =  image_location,
    
    user_message["assistant"] = ai_response.content
    markdown_to_html = markdown.markdown(ai_response.content)

    history.append(user_message)

    save_conversation(formatted_system_prompt, conversation_id, history)
    
    return jsonify({"response": markdown_to_html, "timestamp": timestamp, "image_filename": image_filename})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
