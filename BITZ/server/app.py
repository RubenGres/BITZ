import datetime
import markdown
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

import oaak

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

def _validate_chat_request(data):
    """Validates the chat request data."""
    conversation_id = data.get("conversation_id")
    user_location = data.get("user_location")
    
    if not conversation_id:
        return jsonify({"error": "Please provide a conversation_id."}), 400
    
    if not user_location:
        return jsonify({"error": "Please provide a user location."}), 400
    
    return None

@app.route("/", methods=["GET"])
def home():
    return "Everything is working!"

@app.route("/load", methods=["POST"])
def load_history():
    data = request.json
    conversation_id = data.get("conversation_id")
    conversation = oaak.load_conversation(conversation_id)
    return conversation

@app.route("/chat", methods=["POST"])
def chat():
    """Handles text and image input for biodiversity exploration."""
    data = request.json
    
    if validation_result := _validate_chat_request(data):
        return validation_result
    
    # Extract data from request
    conversation_id = data.get("conversation_id")
    message = data.get("message", "")
    user_location = data.get("user_location")
    system_prompt = data.get("system_prompt")
    image_b64 = data.get("image_b64", None)
    image_location = data.get("image_location", None)
    
    formatted_system_prompt = system_prompt.format(user_location=user_location)
    
    history = oaak.load_conversation(conversation_id)
    
    # Process image if provided
    image_filename = None
    if image_b64: 
        image_filename = oaak.process_image(image_b64, conversation_id, len(history))
    
    messages = oaak.prepare_messages(formatted_system_prompt, history, message, image_b64)
    ai_response = oaak.get_model().invoke(messages)
    
    # Create user message entry
    timestamp = datetime.datetime.utcnow().isoformat()
    user_message = oaak.create_user_message(message, timestamp, image_filename, image_location, ai_response.content)
    
    # Update and save conversation history
    history.append(user_message)
    oaak.save_conversation(formatted_system_prompt, conversation_id, history)
    
    markdown_to_html = markdown.markdown(ai_response.content)
    
    return jsonify({
        "response": markdown_to_html, 
        "timestamp": timestamp, 
        "image_filename": image_filename
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
