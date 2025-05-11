# using LLM to classify species from images

import os
import json
import re
import csv
from tqdm import tqdm
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
import image_handler

def extract_json(input_string):
    """
    Extracts and parses JSON content from a string.

    Args:
        input_string (str): The input string containing JSON content.

    Returns:
        list: A list of parsed JSON objects.
    """
    # Extract JSON blocks within markdown-style triple backticks
    code_blocks = re.findall(r'```json\s*(.*?)\s*```', input_string, re.DOTALL)

    parsed_data = []
    for block in code_blocks:
        block = block.strip()  # Remove unnecessary whitespace
        try:
            data = json.loads(block)
            parsed_data.append(data)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")

    return parsed_data

def identify_chatgpt_raw(image_path, language):
    model = ChatOpenAI(model="gpt-4o")

    system_prompt = f"""
Analyze this image and identify all visible species. Return your findings in JSON format with the following structure:

{{
    "birds": [
        {{"scientific_name": "Scientific name", "common_name": "Common name in {language}", "confidence": "high/medium/low"}}
    ],
    "mammals": [...],
    "reptiles": [...],
    "amphibians": [...],
    "fish": [...],
    "insects": [...],
    "arachnids": [...],
    "mollusks": [...],
    "crustaceans": [...],
    "plants": [...],
    "fungi": [...],
    "other": [...]
}}

Guidelines:
1. Only include categories where species are detected
2. If uncertain about identification, include your best guess and mark confidence as "low"
3. For partially visible organisms, note this in an optional "notes" field
4. If multiple individuals of the same species appear, only list the species once
5. For cultivated plants or domesticated animals, note this status if identifiable
6. Prioritize accuracy over completeness - don't guess if identification isn't possible
7. For complex scenes with many species, prioritize the most prominent/visible organisms
"""

    messages = [SystemMessage(content=system_prompt)]
    user_message_content = [{"type": "text", "text": ""}]

    image_b64 = image_handler.get_base64_from_path(image_path)

    if image_b64:
        user_message_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
        })

    messages.append(HumanMessage(content=user_message_content))
    
    llm_reply_raw = model.invoke(messages)
    return llm_reply_raw.content

def identify_chatgpt(image_path, language):
    llm_reply_raw = identify_chatgpt_raw(image_path, language)
    print(image_path)

    identified_species = extract_json(llm_reply_raw)

    species_csv_lines = []
    for species in identified_species:
        for taxonomic_group, species_list in species.items():
            if isinstance(species_list, list):
                for species in species_list:
                    species_csv_lines.append([
                        os.path.basename(image_path), #filename
                        taxonomic_group,
                        species["scientific_name"],
                        species["common_name"],
                        species.get("confidence", ""),
                        species.get("notes", "")
                    ])
            else:
                print(f"Unexpected format for {taxonomic_group}: expected list but got {type(species_list)}")

    return species_csv_lines

def identify_and_populate(image, quest_id, history_directory, image_coordinates, language="english"):
    # Define species_csv_header before using it
    species_csv_header = ["image_name", "taxonomic_group", "scientific_name", "common_name", "confidence", "notes", "latitude", "longitude"]
    
    csv_filename = os.path.join(history_directory, "data", quest_id, f"species_data_{language}.csv")
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(csv_filename), exist_ok=True)
    
    # Check if file exists to determine if we need to write the header
    file_exists = os.path.isfile(csv_filename)
    
    with open(csv_filename, 'a', newline='') as file:
        writer = csv.writer(file)
        
        # Write header only if the file is new
        if not file_exists:
            writer.writerow(species_csv_header)
        
        # Get the species data and write to CSV
        species_csv_lines = identify_chatgpt(image, language=language)
        species_csv_lines.append(image_coordinates)
        writer.writerows(species_csv_lines)