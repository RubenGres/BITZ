import os
import base64
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

def process_image(image):
    """Convert an image file to base64."""
    img = Image.open(image)
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

@app.route("/", methods=["GET"])
def home():
    return "Everything is working!"

@app.route("/chat", methods=["POST"])
def chat():
    """Handles text and image input for biodiversity exploration."""
    data = request.json
    message = data.get("message", "")
    history = data.get("history", [])  # Expecting a list of (user_msg, assistant_msg) tuples
    user_location = data.get("user_location")
    image_b64 = data.get("image_b64")

    if not user_location:
        return jsonify({"error": "Please provide a user location."}), 400
    
    system_prompt = """
    You are a helpful assitant helping users identifying the biodiversity around them.
    Ask for pictures of what there is too see around the user and ask to look for specific species giving detailed instructions.
    
    The flow is as follow:
    1. user submit an image of a species (insect, bird, animal, plant, etc.)
    2. assistant analyze this image and return a ecological fact about the species
    3. assistant propose a new idea to keep exploring new species
    4. go back to 1.

    Use picture from the user environment to start guiding them in their quest of finding species.
    When telling what species the user has to look for and how to look for them, ask them for a picture for confirmation.
    Once you have a picture return facts about the species if you can identify it from the picture.
    The fact should'nt be longer than 3 lines. Never use more than 5 sentences for each reply.

    The user is based in {user_location}. Ask them to take a picture of their surroundings to initiate the hunt.
    """


    messages = [SystemMessage(content=system_prompt)]

    for user_content, assistant_content in history:
        messages.append(HumanMessage(content=[{"type": "text", "text": user_content}]))
        messages.append(AIMessage(content=assistant_content))
    
    user_message_content = [{"type": "text", "text": message}]
    
    if image_b64:
        user_message_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
        })
    
    messages.append(HumanMessage(content=user_message_content))
    
    ai_response = model.invoke(messages)
    
    return jsonify({"response": ai_response.content})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)