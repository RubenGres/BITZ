
import requests
import base64

def get_base64_from_url(image_url):
    response = requests.get(image_url)
    if response.status_code == 200:
        return base64.b64encode(response.content).decode('utf-8')
    else:
        raise ValueError(f"Failed to fetch image, status code: {response.status_code}")
    
def get_base64_from_path(image_path):
    """Reads an image from a file and converts it to a Base64-encoded string."""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")
    except FileNotFoundError:
        raise ValueError(f"File not found: {image_path}")
    except Exception as e:
        raise ValueError(f"Error processing file {image_path}: {e}")

