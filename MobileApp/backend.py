import os
import base64
import json
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI

# Secure API Key Management
os.environ["OPENAI_API_KEY"] = "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"

# Initialize the model
model = ChatOpenAI(model="gpt-4o")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

HISTORY_DIR = "./history"
os.makedirs(HISTORY_DIR, exist_ok=True)

def save_conversation(conversation_id, history, image_b64=None):
    """Save conversation history and images."""
    convo_dir = os.path.join(HISTORY_DIR, conversation_id)
    os.makedirs(convo_dir, exist_ok=True)

    # Save conversation history as JSON
    history_file = os.path.join(convo_dir, "history.json")
    with open(history_file, "w") as f:
        json.dump(history, f, indent=4)

    # Save image if provided
    if image_b64:
        image_data = base64.b64decode(image_b64)
        image_path = os.path.join(convo_dir, f"{len(history)//2}_image.jpg")
        with open(image_path, "wb") as img_file:
            img_file.write(image_data)

def load_conversation(conversation_id):
    """Load conversation history if it exists."""
    convo_dir = os.path.join(HISTORY_DIR, conversation_id)
    history_file = os.path.join(convo_dir, "history.json")
    
    if os.path.exists(history_file):
        with open(history_file, "r") as f:
            return json.load(f)
    return []

@app.route("/", methods=["GET"])
def home():
    return "Everything is working!"

@app.route("/chat", methods=["POST"])
def chat():
    """Handles text and image input for biodiversity exploration."""
    data = request.json
    conversation_id = data.get("conversation_id")
    message = data.get("message", "")
    user_location = data.get("user_location")
    image_b64 = data.get("image_b64")

    if not conversation_id:
        return jsonify({"error": "Please provide a conversation_id."}), 400

    if not user_location:
        return jsonify({"error": "Please provide a user location."}), 400
    
    system_prompt = f"""
    You are a helpful assistant helping users identify the biodiversity around them.
    Ask for pictures of what there is to see around the user and request images of specific species, providing detailed instructions.
    
    The flow is as follows:
    1. The user submits an image of a species (insect, bird, animal, plant, etc.).
    2. You analyze the image and return an ecological fact about the species.
    3. You propose a new idea to explore more species.
    4. Repeat from step 1.
    
    Use pictures from the user's environment to guide them in their quest to discover species.
    When instructing them on which species to look for and how, ask for a picture as confirmation.
    If an image is provided, try to identify the species and return a brief fact (maximum 3 lines, no more than 5 sentences total).
    
    The user is based in {user_location}. Ask them to take a picture of their surroundings to initiate the hunt.
    """

    history = load_conversation(conversation_id)
    messages = [SystemMessage(content=system_prompt)]

    for entry in history:
        messages.append(HumanMessage(content=[{"type": "text", "text": entry["user"]}]))
        messages.append(AIMessage(content=entry["assistant"]))
    
    user_message_content = [{"type": "text", "text": message}]
    
    if image_b64:
        user_message_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
        })
    
    messages.append(HumanMessage(content=user_message_content))
    
    ai_response = model.invoke(messages)
    
    # Save updated history
    history.append({"user": message, "assistant": ai_response.content})
    save_conversation(conversation_id, history, image_b64)
    
    return jsonify({"response": ai_response.content})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
