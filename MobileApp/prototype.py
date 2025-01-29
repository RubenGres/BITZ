from datetime import datetime, timedelta
from io import BytesIO
import requests
import base64
import re
import os

# interface
import gradio as gr
from folium import Map, Marker
import plotly.graph_objects as go

# data processing
import pandas as pd
import numpy as np
from PIL import Image

# LLM
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from openai import OpenAI

# setting the API key
os.environ["OPENAI_API_KEY"] = "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"

model = ChatOpenAI(model="gpt-4o")

user_location = None

def get_coordinates_from_place(place_name):
    url = f"https://nominatim.openstreetmap.org/search?q={place_name}&format=json&limit=1"
    try:
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx and 5xx)
        data = response.json()
        
        if not data:
            raise ValueError("Place not found")
        
        latitude = float(data[0]['lat'])
        longitude = float(data[0]['lon'])
        return latitude, longitude
    
    except requests.RequestException as e:
        raise ValueError(f"An error occurred while fetching coordinates: {e}")

def create_map(lat, lon, radius):
    fig = go.Figure(go.Scattermapbox(
        lat=[lat],
        lon=[lon],
        mode='markers',
        marker=go.scattermapbox.Marker(
            size=20
        ),
    ))

    fig.update_layout(
        mapbox_style="open-street-map",
        hovermode='closest',
        mapbox=dict(
            bearing=0,
            center=go.layout.mapbox.Center(
                lat=lat,
                lon=lon
            ),
            pitch=0,
            zoom=9
        ),
        margin=dict(l=0, r=0, t=0, b=0),  # Remove margins/borders
        showlegend=False,  # Remove legend
        paper_bgcolor='rgba(0,0,0,0)',  # Transparent background
        plot_bgcolor='rgba(0,0,0,0)'    # Transparent plot area
    )

    return fig

def get_species_inaturalist(lat, lng, radius):
    base_url = "https://api.inaturalist.org/v1/observations/species_counts"
    params = {
        'lat': lat,
        'lng': lng,
        'radius': radius,
    }

    response = requests.get(base_url, params=params)

    data = response.json()

    if response.status_code != 200:
        raise(f"Error {response.status_code}: {data}")
    
    return data

def inaturalist_to_df(data, limit=100):
    species_data = []

    for species_info in data.get('results', [])[:limit]:
        count = species_info.get('count', 0)
        taxon = species_info.get('taxon', {})
        
        sci_name = taxon.get('name', 'Unknown')
        common_name = taxon.get('common_name', {}).get('name', 'No common name')
        kingdom = next((ancestor.get('name') for ancestor in taxon.get('ancestors', []) if ancestor.get('rank') == 'kingdom'), 'Unknown')
        family = next((ancestor.get('name') for ancestor in taxon.get('ancestors', []) if ancestor.get('rank') == 'family'), 'Unknown')
        last_observed = species_info.get('last_observed', 'Unknown')
        image_url = taxon.get('default_photo', {}).get('medium_url', 'No image available')

        species_data.append({
            "Scientific Name": sci_name,
            "Common Name": common_name,
            "Kingdom": kingdom,
            "Family": family,
            "Observations Count": count,
            "Last Observed": last_observed,
            "Image": image_url
        })

    return pd.DataFrame(species_data)

def inaturalist_to_html(data, limit=100):
    species_data = []

    for species_info in data.get('results', [])[:limit]:
        count = species_info.get('count', 0)
        taxon = species_info.get('taxon', {})

        sci_name = taxon.get('name', 'Unknown')
        common_name = taxon.get('common_name', {}).get('name', 'No common name')
        kingdom = next((ancestor.get('name') for ancestor in taxon.get('ancestors', []) if ancestor.get('rank') == 'kingdom'), 'Unknown')
        family = next((ancestor.get('name') for ancestor in taxon.get('ancestors', []) if ancestor.get('rank') == 'family'), 'Unknown')
        last_observed = species_info.get('last_observed', 'Unknown')
        image_url = taxon.get('default_photo', {}).get('medium_url', 'No image available')

        species_data.append({
            "Image": image_url,
            "Scientific Name": sci_name,
            "Common Name": common_name,
            "Kingdom": kingdom,
            "Family": family,
            "Observations Count": count,
            "Last Observed": last_observed,
        })

    # Convert species data to a DataFrame
    df = pd.DataFrame(species_data)

    # Create an HTML table with images and formatted rows
    html_table = "<table border='1' style='border-collapse: collapse; width: 100%; text-align: left;'>"
    html_table += "<thead><tr>" + "".join(f"<th>{col}</th>" for col in df.columns) + "</tr></thead>"
    html_table += "<tbody>"

    for _, row in df.iterrows():
        html_table += "<tr>"
        for col in df.columns:
            if col == "Image":
                html_table += f"<td><img src='{row[col]}' alt='No image available' style='max-height: 100px;'></td>"
            else:
                html_table += f"<td>{row[col]}</td>"
        html_table += "</tr>"

    html_table += "</tbody></table>"

    return html_table

def search_species(place_name, radius):
    global user_location

    user_location = place_name

    try:
        lat, lon = get_coordinates_from_place(place_name)
        osm_map = create_map(lat, lon, radius)
        species_data = get_species_inaturalist(lat, lon, radius)
        species_html = f"<h3> Top 5 most common species spotted in a {radius}km area: </h3>"
        species_html += inaturalist_to_html(species_data, limit=5)
        return osm_map, species_html
    
    except Exception as e:
        return None, f"Error: {str(e)}"
    
def process_image(image):
    img = Image.open(image)
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

def discussion_function(message, history, image=None):
    if not user_location:
        return "Please enter your location in the field above before starting the quest", None
    
    system_prompt = """
    Help me identify the biodiversity around me. Ask me for pictures of what there is too see here and ask me to look for specific species. To know what kind of species are around me, ask me increasingly specific questions.

    When you told me what species I'm looking for and how to look for it, ask me for a picture.
    Never use more than 5 sentences for each reply.

    I am based in {user_location}. To start ask me where I am and give me a multiple choice answer using letters as indexes.
    I will reply using the number of the answer.
    """

    messages = [
        SystemMessage(content=system_prompt)
    ]

    for user_content, assistant_content in history:
            messages.append(HumanMessage(content=[{"type": "text", "text": user_content}]))
            messages.append(AIMessage(content=assistant_content))

    response = ""
    user_message_content = [{"type": "text", "text": message}]

    if image is not None:
        image_input.clear()

        try:
            image_data = process_image(image)
            response += f'<img src="data:image/png;base64,{image_data}" alt="Uploaded user image" width="200" />'
            user_message_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
            })

        except Exception as e:
            response += f"<p>Error processing image: {str(e)}</p>"

    messages.append(HumanMessage(content=user_message_content))
    
    ai_response = model.invoke(messages)
    response += ai_response.content
    
    return response, None #None is to clear the image input field

# Gradio interface
with gr.Blocks() as gradio_app:
    gr.Markdown("# Eyes on the Field")

    with gr.Row():
        with gr.Column():
            place_name = gr.Textbox(
                label="Place Name",
                placeholder="e.g., Paris, France"
            )
            radius = gr.Slider(
                minimum=1,
                maximum=10,
                value=5,
                step=0.1,
                label="Search Radius (km)"
            )
            search_button = gr.Button("Start quest!")

            species_map = gr.Plot(label="Map of Observations")
            species_html = gr.HTML(label="Species Found")

    search_button.click(
        fn=search_species,
        inputs=[place_name, radius],
        outputs=[species_map, species_html]
    )

    chatbot_window = gr.Chatbot(
        show_label=False,
        render_markdown=True
    )

    image_input = gr.Image(
        label="Upload an Image (Optional)", 
        type="filepath",
        height=200,
    )

    # Create the chat interface
    discussion_chat = gr.ChatInterface(
        fn=discussion_function,
        chatbot=chatbot_window,
        additional_inputs=[image_input],
        additional_outputs=[image_input]
    )

if __name__ == "__main__":
    gradio_app.launch(show_error=True)
