import datetime
import markdown
from flask import Flask, send_from_directory, abort, request, jsonify, url_for, render_template
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
    return render_template('home.html')

@app.route("/explore/raw", methods=["GET"])
@app.route("/explore/<path:subpath>/raw", methods=["GET"])
def explore_raw(subpath=""):
    abs_path = os.path.join(BASE_DIR, subpath)

    # Prevent directory traversal attacks
    if not os.path.commonpath([BASE_DIR, abs_path]).startswith(BASE_DIR):
        abort(403)

    if os.path.isdir(abs_path):
        items = os.listdir(abs_path)
        items.sort()

        file_list = []
        for item in items:
            item_path = os.path.join(abs_path, item)
            is_dir = os.path.isdir(item_path)
            file_info = {
                "name": item,
                "type": "DIR" if is_dir else "FILE",
                "size": None if is_dir else os.path.getsize(item_path),
                "modified": datetime.datetime.fromtimestamp(os.path.getmtime(item_path)).strftime('%Y-%m-%d %H:%M')
            }
            file_list.append(file_info)

        return jsonify(file_list)

    abort(404)

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
        
        file_list = []
        for item in items:
            item_path = os.path.join(abs_path, item)
            is_dir = os.path.isdir(item_path)
            
            # Get full path for links
            full_path = os.path.join(subpath, item) if subpath else item
            
            file_info = {
                'name': item,
                'full_path': full_path,
                'is_dir': is_dir,
                'size': "-" if is_dir else human_readable_size(os.path.getsize(item_path)),
                'mod_time': datetime.datetime.fromtimestamp(os.path.getmtime(item_path)).strftime('%Y-%m-%d %H:%M'),
                'icon': "📁" if is_dir else "📄"
            }
            
            file_list.append(file_info)
        
        # Prepare parent path for "Go Up" link
        parent_path = None
        if subpath:
            parent_path = "/".join(subpath.split("/")[:-1])  # Go up one level
        
        return render_template('explorer.html', 
                              items=file_list, 
                              current_path=subpath,
                              parent_path=parent_path)
    
    elif os.path.isfile(abs_path):
        return send_from_directory(BASE_DIR, subpath)
    
    abort(404)


@app.route("/delete/<id>", methods=["GET", "POST"])
def delete(id=""):
    """
    Handle deletion of a conversation record.
    GET: Display password confirmation form
    POST: Verify password and delete record if authorized
    
    This will delete:
    - The main record directory (BASE_DIR/<id>)
    - Associated images (BASE_DIR/images/<id>)
    - Associated data (BASE_DIR/data/<id>)
    """
    if not id:
        return jsonify({"error": "No ID provided"}), 400
    
    # Paths to the record and associated data to be deleted
    images_path = os.path.join(BASE_DIR, "images", id)
    data_path = os.path.join(BASE_DIR, "data", id)
    
    # Check if the main record exists
    if not os.path.exists(data_path):
        return render_template('delete_error.html', message=f"Record with ID {id} not found"), 404
    
    # Handle POST request (password submission)
    if request.method == "POST":
        password = request.form.get('password')
        
        # Get the deletion password from environment variable
        correct_password = os.environ.get('DELETE_PASSWORD')
        
        # Verify password
        if password == correct_password:
            import shutil
            try:
                # Delete the images directory if it exists
                if os.path.exists(images_path):
                    shutil.rmtree(images_path)
                
                # Delete the data directory if it exists
                if os.path.exists(data_path):
                    shutil.rmtree(data_path)
                    
                return render_template('delete_success.html', 
                                       message=f"Record {id} and all associated data successfully deleted",
                                       redirect_url="/dashboard")
            except Exception as e:
                return render_template('delete_error.html', 
                                       message=f"Error deleting record: {str(e)}"), 500
        else:
            # Password is incorrect
            return render_template('delete.html', 
                                  id=id, 
                                  error="Incorrect password. Please try again.")
    
    # Handle GET request (show password form)
    return render_template('delete.html', id=id)

@app.route("/images/", methods=["GET"])
@app.route("/images/<id>", methods=["GET"])
def images(id=""):
    abort(404)

@app.route("/dashboard/", methods=["GET"])
def dashboard():
    """
    Display a dashboard with all quests and associated actions.
    """
    # Get all top-level folders in the history directory
    abs_path = os.path.join(BASE_DIR, "data")
    
    # Check if the directory exists
    if not os.path.isdir(abs_path):
        return render_template('delete_error.html', message="History directory not found"), 404
    
    # Get list of top-level folders (quests)
    items = os.listdir(abs_path)
    items.sort()  # Sort alphabetically by default
    
    quests = []
    for item in items:
        item_path = os.path.join(abs_path, item)
        
        # Skip if not a directory or if it's a special directory
        if not os.path.isdir(item_path) or item.startswith('.'):
            continue
        
        # Calculate directory size
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(item_path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if os.path.isfile(fp):
                    total_size += os.path.getsize(fp)
        
        # Create quest info dictionary
        quest_info = {
            'name': item,
            'full_path': item,
            'is_dir': True,
            'size': human_readable_size(total_size),
            'mod_time': datetime.datetime.fromtimestamp(os.path.getmtime(item_path)).strftime('%Y-%m-%d %H:%M'),
            'icon': "📁"
        }
        
        quests.append(quest_info)
    
    return render_template('dashboard.html', quests=quests)

@app.route("/recap/<id>")
def recap(id):
    # Construct paths to the CSV file and images directory
    csv_path = os.path.join(BASE_DIR, "data", id, "species_data_english.csv")
    imgs_path = os.path.join(BASE_DIR, "images", id)
    
    # Check if the CSV file exists
    if not os.path.isfile(csv_path):
        return f"Error: CSV file not found at {csv_path}", 404
    
    # Check if the images directory exists
    if not os.path.isdir(imgs_path):
        return f"Error: Images directory not found at {imgs_path}", 404
    
    # Prepare the relative path for the CSV file to be used in the template
    relative_csv_path = f"/explore/data/{id}/species_data_english.csv"
    relative_history_path = f"/explore/data/{id}/history.json"
    relative_imgs_path = f"/explore/images/{id}/"
    
    # Render the template
    return render_template('species_viewer.html', 
                          id=id, 
                          csv_path=relative_csv_path,
                          imgs_path=relative_imgs_path,
                          images_base_path=relative_imgs_path,
                          history_path=relative_history_path)

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


from image_analyzer import ImageAnalyzer
analyzer = ImageAnalyzer()

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    
    conversation_id = data.get("conversation_id")
    user_location = data.get("user_location")
    image_b64 = data['image_data']
    image_location = data.get("image_location", None)

    print(conversation_id)

    history = oaak.load_conversation(conversation_id)    

    print(image_b64[:10])
    print(history)

    if image_b64: 
        image_filename = oaak.process_image(image_b64, conversation_id, len(history))
        
        image_input = {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{data['image_data']}"}
        }
        
        result = analyzer.analyze_image(image_input)

        print(result)
        
        # Create user message entry
        timestamp = datetime.datetime.utcnow().isoformat()
        user_message = oaak.create_user_message("", timestamp, image_filename, image_location, str(result))
        history.append(user_message)
        
        oaak.save_conversation("Bernat's system prompt", conversation_id, history)

        return jsonify(result)

@app.route('/answer', methods=['POST'])
def answer():
    try:
        data = request.json
        result = analyzer.process_user_response(
            answer=data['answer']
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
