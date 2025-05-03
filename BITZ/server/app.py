import os
import json
import datetime
import markdown
from dotenv import load_dotenv
from image_analyzer import ImageAnalyzer
from flask import Flask, send_from_directory, abort, request, jsonify, url_for, render_template, make_response, redirect, Response, stream_with_context
from flask_cors import CORS
import mimetypes
import oaak
from openai import OpenAI


BASE_DIR = os.path.abspath("history")  # Base directory
analyzers = {}

load_dotenv()

app = Flask(__name__)

CORS(app, resources={r"/*": {
    "origins": [
        "https://bitz.tools",
        r"https://*.rubengr.es",
        "*" # Allow all origins for development purposes
    ],
    "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],  # Allow all common methods
    "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"]  # Common headers
}})

def _validate_chat_request(data):
    """Validates the chat request data."""
    conversation_id = data.get("conversation_id")
    user_location = data.get("user_location")
    
    if not conversation_id:
        return jsonify({"error": "Please provide a conversation_id."}), 400
    
    if not user_location:
        return jsonify({"error": "Please provide a user location."}), 400
    
    return None

def human_readable_size(size, decimal_places=1):
    """Convert bytes to human-readable format (KB, MB, GB, etc.)"""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size < 1024.0:
            return f"{size:.{decimal_places}f} {unit}"
        size /= 1024.0
    return f"{size:.{decimal_places}f} PB"

def get_quest_ids():
    """List folder names in history/data directory - these represent quest IDs"""
    quest_path = os.path.join(BASE_DIR, "data")
    
    # Check if the directory exists
    if not os.path.isdir(quest_path):
        return []
    
    # Get all items in the directory
    items = os.listdir(quest_path)
    
    # Filter to only include directories and exclude any hidden folders
    quest_ids = [
        item for item in items 
        if os.path.isdir(os.path.join(quest_path, item)) and not item.startswith('.')
    ]
    
    # Sort the quest IDs for consistent output
    quest_ids.sort()
    
    return quest_ids

@app.route("/", methods=["GET"])
def home():
    """Serves the OAAK homepage with two buttons."""
    return render_template('home.html')

@app.route('/viz/', defaults={'path': ''})
@app.route('/viz/<path:path>')
def serve_viz(path):
    # Handle directory paths
    viz_folder = os.path.join(app.static_folder, 'viz')
    full_path = os.path.join(viz_folder, path)
    
    # If it's a directory and doesn't end with a slash, redirect to the slash version
    if os.path.isdir(full_path) and not path.endswith('/') and path:
        return redirect('/viz/' + path + '/')
    
    # If it's a directory, look for index.html
    if os.path.isdir(full_path):
        path = os.path.join(path, 'index.html')
    
    try:
        response = send_from_directory(viz_folder, path)
        return response
    except Exception as e:
        app.logger.error(f"Error serving {path}: {str(e)}")
        return f"File not found: {path}", 404
    
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

@app.route("/map")
def map_view():
    quest_ids = get_quest_ids()

    if not quest_ids:
        return "Error: No quest IDs provided. Use ?ids=quest1&ids=quest2", 400
    
    # Prepare data for all quests
    all_quests_data = []
    
    for quest_id in quest_ids:
        # Construct paths to the CSV file and history JSON
        csv_path = os.path.join(BASE_DIR, "data", quest_id, "species_data_english.csv")
        history_path = os.path.join(BASE_DIR, "data", quest_id, "history.json")
        imgs_path = os.path.join(BASE_DIR, "images", quest_id)
        
        # Verify files exist
        if not os.path.isfile(csv_path) or not os.path.isfile(history_path) or not os.path.isdir(imgs_path):
            continue  # Skip this quest if any required files are missing
        
        # Prepare relative paths for frontend
        relative_csv_path = f"/explore/data/{quest_id}/species_data_english.csv"
        relative_history_path = f"/explore/data/{quest_id}/history.json"
        relative_imgs_path = f"/explore/images/{quest_id}/"
        
        # Add quest data to the collection
        all_quests_data.append({
            "id": quest_id,
            "csv_path": relative_csv_path,
            "history_path": relative_history_path,
            "images_path": relative_imgs_path
        })
    
    if not all_quests_data:
        return "Error: None of the provided quest IDs exist or have valid data", 404
    
    # Render the quests overview template
    return render_template('map_view.html', quests=all_quests_data)

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
        image_path = oaak.process_image(image_b64, conversation_id, len(history))
        image_filename = os.path.basename(image_path)
    
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

@app.route("/images/")
def image_grid(quest_id=None):
    quest_id = request.args.get('id', None)

    # If quest_id is not provided, get all quest IDs from query params or use all available
    if not quest_id:
        quest_ids = request.args.getlist('ids')
        if not quest_ids:
            # If no IDs are provided, try to find all available quests
            try:
                data_dir = os.path.join(BASE_DIR, "data")
                quest_ids = [d for d in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, d))]
            except Exception as e:
                return f"Error finding quests: {str(e)}", 500
    else:
        quest_ids = [quest_id]
    
    # Collect all image data
    all_images = []
    
    for qid in quest_ids:
        # Construct paths
        csv_path = os.path.join(BASE_DIR, "data", qid, "species_data_english.csv")
        history_path = os.path.join(BASE_DIR, "data", qid, "history.json")
        imgs_path = os.path.join(BASE_DIR, "images", qid)
        
        # Skip if required files don't exist
        if not os.path.isfile(csv_path) or not os.path.isfile(history_path) or not os.path.isdir(imgs_path):
            continue
        
        # Get relative paths for frontend
        relative_imgs_path = f"/explore/images/{qid}/"
        
        try:
            # Load species data from CSV - key differences here to handle multiple entries
            species_data = {}
            with open(csv_path, 'r', encoding='utf-8') as f:
                csv_lines = f.readlines()
                # Skip header
                for line in csv_lines[1:]:
                    if line.strip():
                        parts = line.strip().split(',')
                        if len(parts) >= 4:
                            image_name = parts[0]
                            
                            # If this image isn't in the dictionary yet, initialize an empty list
                            if image_name not in species_data:
                                species_data[image_name] = []
                            
                            # Add this entry as a new item in the list
                            species_data[image_name].append({
                                'image_name': image_name,
                                'taxonomic_group': parts[1],
                                'scientific_name': parts[2],
                                'common_name': parts[3],
                                # Add a unique identifier for each instance to differentiate them
                                'entry_id': len(species_data[image_name])
                            })
            
            # Load history data
            with open(history_path, 'r', encoding='utf-8') as f:
                history_json = json.load(f)
            
            # Get center location
            center_location = None
            if history_json.get('location') and history_json['location'].get('coordinates'):
                center_location = {
                    'latitude': history_json['location']['coordinates'].get('latitude'),
                    'longitude': history_json['location']['coordinates'].get('longitude')
                }
            
            # Extract image data from history
            for entry in history_json.get('history', []):
                if entry.get('image_filename'):
                    image_filename = entry['image_filename']
                    
                    # If this image has species data
                    if image_filename in species_data:
                        # For each entry in the species data, create a separate image entry
                        for species_entry in species_data[image_filename]:
                            image_info = {
                                'quest_id': qid,
                                'image_path': f"{relative_imgs_path}{image_filename}",
                                'image_filename': image_filename,
                                'timestamp': entry.get('timestamp'),
                                'location': entry.get('image_location'),
                                # Add a unique ID combining filename and entry ID for proper randomization
                                'unique_id': f"{image_filename}_{species_entry['entry_id']}"
                            }
                            
                            # Add species data
                            image_info.update(species_entry)
                            
                            all_images.append(image_info)
                    else:
                        # If no species data, still add the image once
                        image_info = {
                            'quest_id': qid,
                            'image_path': f"{relative_imgs_path}{image_filename}",
                            'image_filename': image_filename,
                            'timestamp': entry.get('timestamp'),
                            'location': entry.get('image_location'),
                            'unique_id': f"{image_filename}_0"
                        }
                        
                        all_images.append(image_info)
        
        except Exception as e:
            print(f"Error processing quest {qid}: {str(e)}")
            continue
    
    # Sort images by timestamp (newest first)
    all_images.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    
    # Render the template
    return render_template('image_grid.html', 
                          images=all_images,
                          filtered_quest_id=quest_id,
                          total_quests=len(set(img['quest_id'] for img in all_images)),
                          total_images=len(all_images))

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    
    conversation_id = data.get("conversation_id")
    user_location = data.get("user_location")
    image_b64 = data['image_data']
    image_location = data.get("image_location", None)
    history = oaak.load_conversation(conversation_id)    

    print("conversation_id:", conversation_id)
    print("image_b64[:10]:", image_b64[:10])
    print("history:", history)

    if not image_b64:
        return
    
    analyzer = analyzers.setdefault(conversation_id, ImageAnalyzer())
    
    image_path = oaak.process_image(image_b64, conversation_id, len(history))
    image_filename = os.path.basename(image_path)

    result = analyzer.analyze_image(image_path)

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
        conversation_id = data.get("conversation_id")

        analyzer = analyzers.setdefault(conversation_id, ImageAnalyzer())

        result = analyzer.process_user_response(
            answer=data['answer']
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/question', methods=['POST'])
def question():
    """
    Route for asking additional questions about an already analyzed image.
    Uses standard (non-streaming) response with GPT-4o Mini.
    """
    openai_client = OpenAI()
    try:
        data = request.json
        user_message = data.get('question')
        history = data.get('history')
        analysis_reply = data.get('analysis_reply')
                    
        # Prepare system prompt for GPT-4o Mini
        system_prompt = f"""You are a helpful assistant that answers questions about biodiversity. 
        Use the provided analysis context to answer the user's question. 
        Be concise and informative. If you don't know the answer, say so.
        Context from image analysis: {json.dumps(analysis_reply)}"""
        
        # Start with system prompt
        messages = [{"role": "system", "content": system_prompt}]

        # Add the conversation history if available
        if history and isinstance(history, list):
            # Filter out any potential duplicate of the current message
            history_messages = [msg for msg in history 
                              if not (msg.get('role') == 'user' and msg.get('content') == user_message)]
            messages.extend(history_messages)
        
        # Always add the current user message at the end to ensure it's processed
        messages.append({"role": "user", "content": user_message})
        
        # Create the API call without streaming
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",  # Using GPT-4o Mini as requested
            messages=messages
        )
        
        # Return the response content
        return response.choices[0].message.content
        
    except Exception as e:
        app.logger.error(f"Error in question route: {str(e)}")
        return jsonify({"error": str(e)}), 500
        
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
