import datetime
import markdown
from flask import Flask, send_from_directory, abort, request, jsonify, url_for
from flask_cors import CORS
from dotenv import load_dotenv
import os

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
BASE_DIR = os.path.abspath("history")  # Set base directory to "history"

BASE_DIR = os.path.abspath("history")  # Base directory


def human_readable_size(size, decimal_places=1):
    """Convert bytes to human-readable format (KB, MB, GB, etc.)"""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size < 1024.0:
            return f"{size:.{decimal_places}f} {unit}"
        size /= 1024.0
    return f"{size:.{decimal_places}f} PB"



@app.route("/", methods=["GET"])
def home():
    """Serves the OAAK homepage with two buttons."""
    index_file_path = os.path.join(os.path.dirname(__file__), "templates/home/index.html")
    if os.path.exists(index_file_path):
        with open(index_file_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>OAAK</h1><p>Missing index.html file</p>"

@app.route("/quest", methods=["GET"])
def quest():
    """Serves the OAAK homepage with two buttons."""
    index_file_path = os.path.join(os.path.dirname(__file__), "templates/quest/index.html")
    if os.path.exists(index_file_path):
        with open(index_file_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>OAAK</h1><p>Missing index.html file</p>"


@app.route("/explore/", methods=["GET"])
@app.route("/explore/<path:subpath>", methods=["GET"])
def explore(subpath=""):
    abs_path = os.path.join(BASE_DIR, subpath)

    # Prevent directory traversal attacks
    if not os.path.commonpath([BASE_DIR, abs_path]).startswith(BASE_DIR):
        abort(403)

    if os.path.isdir(abs_path):
        items = os.listdir(abs_path)
        items.sort()  # Sort for better organization
        file_info = []

        for item in items:
            item_path = os.path.join(abs_path, item)
            is_dir = os.path.isdir(item_path)
            size = "-" if is_dir else human_readable_size(os.path.getsize(item_path))
            mod_time = datetime.datetime.fromtimestamp(os.path.getmtime(item_path)).strftime('%Y-%m-%d %H:%M')
            icon = "📁" if is_dir else "📄"
            link = f'<a href="{url_for("explore", subpath=f"{subpath}/{item}" if subpath else item)}">{icon} {item}</a>'
            file_info.append(f"<tr><td>{link}</td><td>{size}</td><td>{mod_time}</td></tr>")

        # "Go Up" button
        go_up_link = ""
        if subpath:
            parent_path = "/".join(subpath.split("/")[:-1])  # Go up one level
            go_up_link = f'<tr><td><a href="{url_for("explore", subpath=parent_path)}">..</a></td><td>-</td><td>-</td></tr>'

        return f"""
            <html>
            <head>
                <title>File Explorer</title>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        padding: 10px;
                    }}
                    table {{
                        width: 100%;
                        border-collapse: collapse;
                    }}
                    th, td {{
                        padding: 10px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }}
                    th {{
                        background-color: #f4f4f4;
                    }}
                    a {{
                        text-decoration: none;
                        color: #007bff;
                    }}
                    a:hover {{
                        text-decoration: underline;
                    }}
                </style>
            </head>
            <body>
                <h1>Browsing: {subpath or 'history'}</h1>
                <table>
                    <tr><th>Name</th><th>Size</th><th>Last Modified</th></tr>
                    {go_up_link}
                    {''.join(file_info)}
                </table>
            </body>
            </html>
        """

    elif os.path.isfile(abs_path):
        return send_from_directory(BASE_DIR, subpath)

    abort(404)


@app.route("/file/<path:subpath>", methods=["GET"])
def get_file(subpath):
    abs_path = os.path.join(BASE_DIR, subpath)

    if not os.path.commonpath([BASE_DIR, abs_path]).startswith(BASE_DIR) or not os.path.isfile(abs_path):
        abort(403)

    return send_from_directory(BASE_DIR, subpath)


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
