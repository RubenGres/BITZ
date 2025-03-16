import glob
import json
import re
import requests

# Define the regex pattern to extract location names
location_pattern = re.compile(r'The user is based in ([^\.]*)\.')

# Function to get coordinates from OpenStreetMap's Nominatim API
import time

def get_coordinates(location_name):
    # adapt from this:     fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${place_name}`)
    url = 'https://nominatim.openstreetmap.org/search'
    params = {
        'q': location_name,
        'format': 'json',
    }
    
    try:
        response = requests.get(url, params=params)
        
        # Check if the response is empty or invalid
        if response.status_code != 200 or not response.text.strip():
            print(f"Error: Empty response or failed request for '{location_name}'. Status code: {response.status_code}")
            return None

        data = response.json()
        if data:
            return {
                'latitude': float(data[0]['lat']),
                'longitude': float(data[0]['lon'])
            }
        else:
            print(f"Coordinates not found for '{location_name}'")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Request failed for '{location_name}': {e}")
        return None
    except json.JSONDecodeError:
        print(f"JSON decoding failed for '{location_name}'")
        return None

# Recursively find all history.json files
json_files = glob.glob('**/history.json', recursive=True)

# Process each JSON file
for file_path in json_files:
    with open(file_path, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    # Convert JSON data to string for regex search
    json_str = json.dumps(data)
    match = location_pattern.search(json_str)
    
    if match:
        location_name = match.group(1).strip()
        location_name = ", ".join(location_name.split(", ")[:3])
        coordinates = get_coordinates(location_name)
        
        if coordinates:
            # Add the location field to the JSON data
            data['location'] = {
                'name': location_name,
                'coordinates': coordinates
            }
            
            # Write the updated data back to the JSON file
            with open(file_path, 'w', encoding='utf-8') as file:
                json.dump(data, file, ensure_ascii=False, indent=4)
            print(f"Updated {file_path} with location: {location_name}")
        else:
            print(f"Coordinates not found for location: {location_name}")
    else:
        print(f"No location pattern found in {file_path}")
