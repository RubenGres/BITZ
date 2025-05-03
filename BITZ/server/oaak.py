import os
import base64
import json

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI

import oaak_classify
import threading

class ModelSingleton:
    _instance = None
    _model_name = None

    @classmethod
    def get_instance(cls, model_name="gpt-4o"):
        if cls._instance is None:
            cls._model_name = model_name
            cls._instance = ChatOpenAI(model=model_name)
        return cls._instance

def get_model(model_name="gpt-4o"):
    return ModelSingleton.get_instance(model_name)

def save_conversation(system_prompt, conversation_id, history, history_directory="./history"):
    """Save conversation history and images."""
    history_data_dir = os.path.join(history_directory, "data")
    
    os.makedirs(history_data_dir, exist_ok=True)

    # # check if the image directory exist 
    # if not os.path.exists(convo_dir):
    #     return # return if we don't have any images in the conversation (saving images create the dir)


    convo_dir = os.path.join(history_data_dir, conversation_id)
    history_file = os.path.join(convo_dir, "history.json")
    with open(history_file, "w") as f:
        conversation_data = {
            "system_prompt": system_prompt,
            "history": history  # Ensure it's saved as a list of dictionaries
        }

        json.dump(conversation_data, f, indent=4)

def load_conversation(conversation_id, history_directory="./history"):
    """Load conversation history if it exists."""
    history_file = os.path.join(history_directory, "data", conversation_id, "history.json")

    if os.path.exists(history_file):
        with open(history_file, "r") as f:
            data = json.load(f)
            return data.get("history", [])
    
    return []

def save_image(image_b64, conversation_id, history_length, history_directory):
    history_data_dir = os.path.join(history_directory, "images")
    convo_dir = os.path.join(history_data_dir, conversation_id)
    
    image_filename = f"{history_length}_image.jpg"
    image_path = os.path.join(convo_dir, image_filename)
    image_data = base64.b64decode(image_b64)

    os.makedirs(os.path.dirname(image_path), exist_ok=True)

    with open(image_path, "wb") as img_file:
        img_file.write(image_data)

    return image_path

def extract_species_from_images(image_path, conversation_id, history_directory):
    # run this in parallel to avoid slowing down
    classify_thread = threading.Thread(
        target=oaak_classify.identify_and_populate,
        args=(image_path, conversation_id, history_directory),
        daemon=True  # Ensures the thread is killed if the main program exits
    )
    classify_thread.start()

def process_image(image_b64, conversation_id, history_length, history_directory="./history"):
    """Processes and saves an uploaded image."""
    image_path = save_image(image_b64, conversation_id, history_length, history_directory)
    extract_species_from_images(image_path, conversation_id, history_directory)
    return image_path

def prepare_messages(system_prompt, history, current_message, image_b64):
    """Prepares the message list for the model."""
    messages = [SystemMessage(content=system_prompt)]
    
    # Add conversation history
    for entry in history:
        messages.append(HumanMessage(content=[{"type": "text", "text": entry["user"]}]))
        messages.append(AIMessage(content=entry["assistant"]))
    
    # Add current user message
    user_message_content = [{"type": "text", "text": current_message}]
    
    # Add image if provided
    if image_b64:
        user_message_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
        })
    
    messages.append(HumanMessage(content=user_message_content))
    
    return messages


def create_user_message(message, timestamp, image_filename, image_location, assistant_response):
    """Creates a user message entry for the conversation history."""
    user_message = {
        "user": message,
        "timestamp": timestamp,
        "assistant": assistant_response
    }

    if image_filename:
        user_message["image_filename"] = image_filename

    if image_location:
        user_message["image_location"] = image_location
    
    return user_message
