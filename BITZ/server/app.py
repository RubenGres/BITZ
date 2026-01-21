import concurrent.futures
import threading
import markdown
import mimetypes
import hashlib
import os
import json
from dotenv import load_dotenv
from image_analyzer import ImageAnalyzer
from flask import Flask, send_from_directory, abort, request, jsonify, url_for, render_template, make_response, redirect, Response, stream_with_context
from flask_cors import CORS
import oaak
from openai import OpenAI
from datetime import datetime
from collections import Counter
import time
from PIL import Image, ImageOps
from functools import partial
import zipfile
import io

BASE_DIR = os.path.abspath("history")  # Base directory
analyzers = {}
species_link_cache = {}
species_link_cache_lock = threading.Lock()

load_dotenv()

app = Flask(__name__)

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

def get_quest_metadata(quest_id, force_reload=False):
    """Extract and return metadata for a specific quest.
    
    Args:
        quest_id: The ID of the quest to get metadata for
        force_reload: If True, bypass cache and reload metadata from disk
        
    Returns:
        Metadata dictionary or None if files are missing
    """
    global quest_metadata_cache
    
    # Return cached metadata if available and force_reload is False
    if not force_reload and quest_id in quest_metadata_cache:
        return quest_metadata_cache[quest_id]
    
    # Construct paths to the CSV file and history JSON
    csv_path = os.path.join(BASE_DIR, "data", quest_id, "species_data_english.csv")
    history_path = os.path.join(BASE_DIR, "data", quest_id, "history.json")

    if not os.path.isfile(history_path):
        return None
    
    # Read the CSV file
    csv_string = ""
    if os.path.isfile(csv_path):
        with open(csv_path, 'r', encoding='utf-8') as f:
            csv_string = f.read()
    else:
        return None

    # load the history JSON
    with open(history_path, 'r', encoding='utf-8') as f:
        history_json = json.load(f)
    
    flavor = history_json.get('flavor', 'unknown')
    location = history_json.get('location', None)

    quest_timestamp = history_json['history'][0]['timestamp']

    start_time = datetime.fromtimestamp(int(quest_timestamp))
    end_time = datetime.fromtimestamp(int(history_json['history'][-1]['timestamp']))
    duration = (end_time - start_time).total_seconds()

    nb_images = len(history_json.get('history', 0))

    # lines in csv_string -1 for header
    species_count = len(csv_string.split('\n')) - 1

    # taxonomic_groups is second column in csv 
    taxonomic_groups = [line.split(',')[1] for line in csv_string.strip().split('\n')[1:]]
    taxonomic_groups_count = dict(Counter(taxonomic_groups))

    # Create metadata dictionary
    metadata = {
        'quest_id': quest_id,
        'user_id': history_json.get('user_id', 'N/A'),
        'location': location,
        'coordinates': history_json.get('coordinates', 'N/A'),
        'flavor': flavor,
        'date_time': datetime.fromtimestamp(int(quest_timestamp)),
        'duration': duration,
        'nb_images': nb_images,
        'species_count': species_count,
        'taxonomic_groups': taxonomic_groups_count,
        'last_updated': datetime.now().isoformat()  # Add timestamp when this metadata was generated
    }
    
    # Update cache
    quest_metadata_cache[quest_id] = metadata
    
    return metadata

@app.route("/quest_info", methods=["GET"])
def quest_info():
    data = request.args
    quest_id = data.get("id")
    force_reload = request.args.get("force_reload", "false").lower() == "true"

    if not quest_id:
        return jsonify({"error": "No quest ID provided"}), 400
    
    # Get metadata for the quest, with option to force reload
    metadata = get_quest_metadata(quest_id, force_reload)
    if metadata is None:
        return jsonify({"error": f"Quest {quest_id} not found or CSV file missing"}), 404
    
    # Construct paths to the CSV file and history JSON
    csv_path = os.path.join(BASE_DIR, "data", quest_id, "species_data_english.csv")
    history_path = os.path.join(BASE_DIR, "data", quest_id, "history.json")
    
    # Read the CSV file
    with open(csv_path, 'r', encoding='utf-8') as f:
        csv_string = f.read()
    
    # load the history JSON
    with open(history_path, 'r', encoding='utf-8') as f:
        history_json = json.load(f)
        history_json['species_data_csv'] = csv_string
        history_json['metadata'] = metadata
    
    # Return the JSON response
    return jsonify(history_json)

# Create a global cache for quest metadata
quest_metadata_cache = {}
cached_quest_ids = set()  # Track which quest IDs have been cached
cache_last_updated = None  # Track when the quest list was last fully updated

def check_cache_freshness():
    """Check if the cache needs to be refreshed based on file system changes"""
    global cache_last_updated
    
    # If cache has never been initialized or it's been more than 5 minutes since last full update
    if cache_last_updated is None or (datetime.now() - cache_last_updated).total_seconds() > 300:
        return False
    
    return True

@app.route("/quest_list", methods=["GET"])
def quest_list():
    """List all quests with their metadata, using caching for efficiency."""
    global quest_metadata_cache, cached_quest_ids, cache_last_updated
    
    # Check if we should force a refresh based on query parameter
    # force_refresh = request.args.get("force_refresh", "false").lower() == "true"
    
    # Get current list of all quest IDs
    current_quest_ids = get_quest_ids()
    current_quest_ids_set = set(current_quest_ids)
    
    # Determine if we need to refresh the cache
    cache_is_fresh = check_cache_freshness()
    
    if cache_is_fresh and cached_quest_ids == current_quest_ids_set:
        # Cache is fresh and no quests have been added or removed
        response_data = {
            "quests": quest_metadata_cache,
            "cache_info": {
                "timestamp": datetime.now().isoformat(),
                "last_full_update": cache_last_updated.isoformat() if cache_last_updated else None,
                "status": "cached",
                "total_cached": len(quest_metadata_cache)
            }
        }
        return jsonify(response_data)
    
    # Find new quests that aren't in the cache
    new_quest_ids = current_quest_ids_set - cached_quest_ids
    
    # Find quests that have been deleted and should be removed from cache
    removed_quest_ids = cached_quest_ids - current_quest_ids_set
    
    # Remove deleted quests from cache
    for quest_id in removed_quest_ids:
        if quest_id in quest_metadata_cache:
            del quest_metadata_cache[quest_id]
    
    # Update cache with new quests
    for quest_id in new_quest_ids:
        metadata = get_quest_metadata(quest_id)
        if metadata:  # Only add if metadata was successfully retrieved
            quest_metadata_cache[quest_id] = metadata
    
    # Update the cached set of quest IDs and timestamp
    cached_quest_ids = current_quest_ids_set
    cache_last_updated = datetime.now()
    
    # Add cache timestamp for debugging/monitoring
    response_data = {
        "quests": quest_metadata_cache,
        "cache_info": {
            "timestamp": datetime.now().isoformat(),
            "last_full_update": cache_last_updated.isoformat(),
            "status": "updated",
            "total_cached": len(quest_metadata_cache),
            "new_quests_added": len(new_quest_ids),
            "quests_removed": len(removed_quest_ids)
        }
    }
    
    return jsonify(response_data)

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
                "modified": datetime.fromtimestamp(os.path.getmtime(item_path)).strftime('%Y-%m-%d %H:%M')
            }
            file_list.append(file_info)

        return jsonify(file_list)

    abort(404)

@app.route("/explore/images/<path:image_path>", methods=["GET"])
def explore_images(image_path=""):
    # Get requested resolution
    res = request.args.get('res', 'full')
    
    # Define sizes for different resolutions
    sizes = {
        'icon': (50, 50),
        'thumb': (150, 150),
        'medium': (800, 800),
        'large': (1600, 1600),
        'full': None
    }
    
    # Validate resolution parameter
    if res not in sizes:
        res = 'full'
    
    # Create absolute path to the original image
    abs_image_path = os.path.join(BASE_DIR, 'images', image_path)
    
    # Security check and file existence check
    try:
        if not os.path.commonpath([os.path.join(BASE_DIR, 'images'), abs_image_path]).startswith(BASE_DIR):
            abort(403)
        if not os.path.isfile(abs_image_path):
            abort(404)
    except (ValueError, FileNotFoundError):
        abort(404)
    
    # For full resolution, serve the original image
    if res == 'full':
        return send_from_directory(os.path.join(BASE_DIR, 'images'), image_path)
    
    # Set up cache
    cache_dir = os.path.join(BASE_DIR, 'cache', res)
    os.makedirs(cache_dir, exist_ok=True)
    
    # Create cached filename
    image_hash = hashlib.md5(image_path.encode()).hexdigest()
    file_ext = os.path.splitext(image_path)[1].lower()
    cached_filename = f"{image_hash}{file_ext}"
    cached_image_path = os.path.join(cache_dir, cached_filename)
    
    # Create resized version if it doesn't exist
    if not os.path.exists(cached_image_path):
        try:
            img = Image.open(abs_image_path)
            img = ImageOps.exif_transpose(img)
            
            # Get target size and resize
            target_size = sizes[res]
            if target_size:
                img.thumbnail(target_size, Image.LANCZOS)
            
            # Save cached version
            img.save(cached_image_path, quality=85, optimize=True)
            img.close()
            
        except Exception as e:
            app.logger.error(f"Image processing error ({res}): {image_path}: {str(e)}")
            try:
                # Try to serve original if resize fails
                return send_from_directory(os.path.join(BASE_DIR, 'images'), image_path)
            except Exception:
                abort(500)
    
    # Serve the cached image
    try:
        return send_from_directory(cache_dir, cached_filename)
    except Exception as e:
        app.logger.error(f"Error serving cached image: {cached_image_path}: {str(e)}")
        abort(500)

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
                'mod_time': datetime.fromtimestamp(os.path.getmtime(item_path)).strftime('%Y-%m-%d %H:%M'),
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

@app.route("/download/<quest_id>", methods=["GET"])
def download_quest(quest_id):
    """
    Download a complete quest as a ZIP file containing all data and images.
    """
    if not quest_id:
        return jsonify({"error": "No quest ID provided"}), 400
    
    # Paths to the quest data and images
    data_path = os.path.join(BASE_DIR, "data", quest_id)
    images_path = os.path.join(BASE_DIR, "images", quest_id)
    
    # Check if the quest exists
    if not os.path.exists(data_path):
        return jsonify({"error": f"Quest {quest_id} not found"}), 404
    
    # Create an in-memory ZIP file
    memory_file = io.BytesIO()
    
    try:
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add all files from the data directory
            if os.path.exists(data_path):
                for root, dirs, files in os.walk(data_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.join('data', os.path.relpath(file_path, data_path))
                        zf.write(file_path, arcname)
            
            # Add all files from the images directory
            if os.path.exists(images_path):
                for root, dirs, files in os.walk(images_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.join('images', os.path.relpath(file_path, images_path))
                        zf.write(file_path, arcname)
        
        # Seek to the beginning of the BytesIO object
        memory_file.seek(0)
        
        # Create response with the ZIP file
        response = make_response(memory_file.getvalue())
        response.headers['Content-Type'] = 'application/zip'
        response.headers['Content-Disposition'] = f'attachment; filename=quest_{quest_id}.zip'
        
        return response
        
    except Exception as e:
        app.logger.error(f"Error creating ZIP for quest {quest_id}: {str(e)}")
        return jsonify({"error": f"Error creating download: {str(e)}"}), 500

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
            'mod_time': datetime.fromtimestamp(os.path.getmtime(item_path)).strftime('%Y-%m-%d %H:%M'),
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
    conversation = oaak.load_conversation(conversation_id).get('history', [])
    return conversation

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
                                'image_path': f"{relative_imgs_path}{image_filename}?res=thumb",
                                'image_filename': image_filename,
                                'timestamp': datetime.fromtimestamp(int(entry.get('timestamp'))).strftime('%Y-%m-%d %H:%M'),
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
                            'image_path': f"{relative_imgs_path}{image_filename}?res=thumb",
                            'image_filename': image_filename,
                            'timestamp': datetime.fromtimestamp(int(entry.get('timestamp'))).strftime('%Y-%m-%d %H:%M'),
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
    user_id = data.get("user_id")
    image_b64 = data['image_data']
    image_location = data.get("image_location", None)
    image_coordinates = data.get("image_coordinates", None)
    flavor = data.get("flavor", None)

    # Check if the image data is provided
    if not image_b64:
        return jsonify({"error": "No image data provided"}), 400

    conversation = oaak.load_conversation(conversation_id)

    # If this is not the first message on this conversation, get the coordinates and location from history
    if conversation:
        conversation_coordinates = conversation.get('coordinates', None)
        conversation_location = conversation.get('location', None)
        history = conversation.get('history', [])
    else:
        conversation_coordinates = image_coordinates
        conversation_location = image_location
        history = []

    analyzer = analyzers.setdefault(conversation_id, ImageAnalyzer())
    image_path = oaak.process_image(image_b64, conversation_id, len(history), image_coordinates)
    
    last_result = history[-1] if history else None
    result = analyzer.analyze_image(image_path, flavor, history)

    # Create user message entry
    timestamp = str(int(time.time()))
    image_filename = os.path.basename(image_path)
    user_message = oaak.create_user_message("", timestamp, image_filename, image_coordinates, str(result))
    
    history.append(user_message)

    oaak.save_conversation(flavor, conversation_coordinates, conversation_location, conversation_id, user_id, history)

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


def get_species_link_single(openai_client, species_pair):
    """
    Helper function to get a link for a single species pair.
    This is the core logic extracted from your existing link_species route.
    """
    # Validate species input
    if not isinstance(species_pair, list):
        return {"error": "Species must be a list."}
    
    if len(species_pair) > 2:
        return {"error": "Too many species provided. Please provide 2 or fewer species."}
    
    if not species_pair:
        return {"error": "No species provided."}
    
    # Create a consistent cache key by sorting species names (case-insensitive)
    cache_key = tuple(sorted([s.lower().strip() for s in species_pair]))
    
    # Thread-safe cache check
    with species_link_cache_lock:
        if cache_key in species_link_cache:
            return {"link": species_link_cache[cache_key], "cached": True}
    
    # Prepare system prompt for GPT-4o Mini
    system_prompt = f"""
    You are a helpful assistant that links species by their common or scientific names using short relationship phrases or common characteristics (1–3 words) with action verbs.
    Action verbs can be such as eats, is eaten by, pollinates, is pollinated by, parasitizes, is parasitized by, feeds on, is host to, shares habitat, competes with, nests in,
    shelters, lays eggs on, mutualism with, camouflages in, mimics, disperses seeds of, is preyed on by, infects, provides nutrients to, prefers wet soil, well drained soil,
    sandy soil, shade tolerant, needs a lot of sun, or mutualistic; if the relationship is unclear, respond with an empty string (""), otherwise provide a short phrase.
    """
    
    messages = [{"role": "system", "content": system_prompt}]
    messages.append({"role": "user", "content": f"Link these species: {', '.join(species_pair)}"})
    
    try:
        # Create the API call without streaming
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages
        )
        
        # Get the response content
        link_response = response.choices[0].message.content.strip()
        link_response = link_response.strip('"')
        
        # Thread-safe cache update
        with species_link_cache_lock:
            species_link_cache[cache_key] = link_response
        
        return {"link": link_response, "cached": False}
        
    except Exception as e:
        app.logger.error(f"Error linking species {species_pair}: {str(e)}")
        return {"error": str(e)}

@app.route('/link_species_batch', methods=['POST'])
def link_species_batch():
    """
    Batch endpoint for linking multiple species pairs.
    Accepts a list of species pairs and processes them in parallel.
    
    Expected input format:
    {
        "species_pairs": [
            ["species1", "species2"],
            ["species3", "species4"],
            ["species5", "species6"]
        ]
    }
    
    Returns:
    {
        "results": [
            {"pair": ["species1", "species2"], "link": "eats", "cached": false},
            {"pair": ["species3", "species4"], "link": "", "cached": true},
            {"pair": ["species5", "species6"], "error": "Error message"}
        ]
    }
    """
    openai_client = OpenAI()
    
    data = request.json
    species_pairs = data.get('species_pairs', [])
    
    # Validate input
    if not isinstance(species_pairs, list):
        return jsonify({"error": "species_pairs must be a list."}), 400
    
    if not species_pairs:
        return jsonify({"error": "No species pairs provided."}), 400
    
    if len(species_pairs) > 10:
        return jsonify({"error": "Too many species pairs provided. Maximum 10 allowed."}), 400

    # Validate each pair
    for i, pair in enumerate(species_pairs):
        if not isinstance(pair, list):
            return jsonify({"error": f"Species pair {i} must be a list."}), 400
        if len(pair) > 2:
            return jsonify({"error": f"Species pair {i} has too many species. Maximum 2 allowed."}), 400
        if not pair:
            return jsonify({"error": f"Species pair {i} is empty."}), 400
    
    # Process species pairs in parallel
    results = []
    
    # Use ThreadPoolExecutor for I/O-bound OpenAI API calls
    max_workers = min(10, len(species_pairs))  # Limit concurrent requests
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Create a partial function with the OpenAI client
        link_function = partial(get_species_link_single, openai_client)
        
        # Submit all tasks
        future_to_pair = {
            executor.submit(link_function, pair): pair 
            for pair in species_pairs
        }
        
        # Collect results as they complete
        for future in concurrent.futures.as_completed(future_to_pair):
            pair = future_to_pair[future]
            try:
                result = future.result()
                result["pair"] = pair
                results.append(result)
            except Exception as e:
                app.logger.error(f"Exception for pair {pair}: {str(e)}")
                results.append({
                    "pair": pair,
                    "error": f"Processing failed: {str(e)}"
                })
    
    # Sort results to maintain input order
    pair_to_result = {tuple(result["pair"]): result for result in results}
    ordered_results = [pair_to_result[tuple(pair)] for pair in species_pairs]
    
    return jsonify({"results": ordered_results})

# Keep your existing single link_species endpoint for backward compatibility
@app.route('/link_species', methods=['POST'])
def link_species():
    """
    Original single species pair linking endpoint.
    Kept for backward compatibility.
    """
    openai_client = OpenAI()
    
    data = request.json
    species = data.get('species')
    
    result = get_species_link_single(openai_client, species)
    
    if "error" in result:
        return jsonify(result), 400
    
    return jsonify({"link": result["link"]})

if __name__ == "__main__":
    # CORS is handled at the nginx level in production, but for development we can enable it here
    CORS(app, resources={r"/*": {
        "origins": [
            "*" # Allow all origins for development purposes
        ],
        "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],  # Allow all common methods
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"]  # Common headers
    }})
    
    app.run(host="0.0.0.0", port=5000, debug=True)