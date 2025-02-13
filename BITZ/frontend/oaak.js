const backend_url = "https://oaak.rubengr.es";
const max_resolution = 2000

let userLocation = "No user provided location";
let userLocationName;
let marker;
let map;
const mapCursor = document.getElementById('map-cursor');
const coordinatesDisplay = document.getElementById('coordinates');

async function initMap() {
    userLocation = await getUserLocation();
    let selectedLat = userLocation ? userLocation.latitude : 48.8566;
    let selectedLon = userLocation ? userLocation.longitude : 2.3522;

    map = L.map('map').setView([selectedLat, selectedLon], 20);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
}

async function getUserLocation() {
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            () => resolve(null)
        );
    });
}

initMap();

async function setUserLocationName(latitude, longitude) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch location data");
        }

        const data = await response.json();
        userLocationName = data.display_name || "Location not found.";

    } catch (error) {
        console.error("Error fetching location:", error);
        return "Error retrieving location.";
    }
}

// Center cursor on map
function updateMapCursor(e) {
    const mapContainer = document.getElementById('map-container');
    const mapRect = mapContainer.getBoundingClientRect();
    const centerX = mapRect.width / 2;
    const centerY = (mapRect.height / 2);

    mapCursor.style.left = `${centerX}px`;
    mapCursor.style.top = `${centerY}px`;
    
    coordinatesDisplay.innerHTML = `Lat: ${userLocation.latitude} | Lon: ${userLocation.longitude}`;
}

// Initial cursor placement
updateMapCursor();

function searchPlace() {
    let place = document.getElementById("place_name").value;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${place}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                map.setView([data[0].lat, data[0].lon], 12);
            } else {
                alert("Location not found");
            }
        });
}

// Rest of the previous script remains the same
function goToPage(pageNumber) {
    document.getElementById("page1").style.display = pageNumber === 1 ? "block" : "none";
    document.getElementById("page2").style.display = pageNumber === 2 ? "block" : "none";
    document.getElementById("page3").style.display = pageNumber === 3 ? "block" : "none";
    
    if (pageNumber === 2) {
        fetchSpecies();
        setUserLocationName(userLocation.latitude, userLocation.longitude);
    }

    if (pageNumber === 3) {
        send_first_message();
    }
}

function send_first_message() {
    let chatBox = document.getElementById("chat-box");
    let botResponse = document.createElement("div");
    botResponse.innerHTML = `<div><b>OAAK:</b> Hello! Ready to start your quest? <br> To begin please upload a picture of your surroundings! </div><br>`;
    chatBox.appendChild(botResponse);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function fetchSpecies() {
    const radius = 10; // 10 km radius, adjust as needed

    document.getElementById("species-container").innerHTML = "<p>Loading species...</p>";
    fetch(`https://api.inaturalist.org/v1/observations/species_counts?lat=${userLocation.latitude}&lng=${userLocation.longitude}&radius=${radius}&verifiable=true`)
        .then(response => response.json())
        .then(data => {
            if (!data.results || data.results.length === 0) {
                document.getElementById("species-container").innerHTML = "<p>No species found in this location.</p>";
                return;
            }

            const maxCount = Math.max(...data.results.map(species => species.count));

            let speciesData = data.results.slice(0, 10).map(species_info => {
                let taxon = species_info.taxon || {};
                let size = Math.max(50, Math.min(200, (species_info.count / maxCount) * 150));
                return `
                    <div class='bubble' style='width: ${size}px; height: ${size}px;'>
                        <img src='${taxon.default_photo ? taxon.default_photo.medium_url : ''}'>
                        <span>
                            <h3>${taxon.name || 'Unknown'}</h3>
                            ${taxon.common_name || 'No common name'}
                        </span>
                    </div>
                `;
            }).join('');
            document.getElementById("species-container").innerHTML = speciesData;
        })
        .catch(error => {
            document.getElementById("species-container").innerHTML = "<p>Error fetching species.</p>";
        });
}

document.getElementById('image-upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        }
        
        reader.readAsDataURL(file);
    }

    const imagePreview = document.getElementById('image-preview');
});

const conversation_id = `${Date.now()}${Math.floor(performance.now())}`;

async function sendMessage() {
    let input = document.getElementById("user-input");
    let chatBox = document.getElementById("chat-box");
    let userMessage = input.value.trim();
    let system_prompt = document.getElementById("system_prompt").value
    let imagePreview = document.getElementById("image-preview");
    let imagePreview_src = imagePreview.src;

    let spinner = document.getElementById("spinner");

    if (!userMessage && (!imagePreview_src || imagePreview_src === "")) {
        return; // Prevent sending empty messages
    }

    input.value = "";
    imagePreview.src = "";
    imagePreview.style.display = "none";
    document.getElementById("image-upload").value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    spinner.style.display = "block"; // Show spinner

    // Create message container
    let messageDiv = document.createElement("div");
    messageDiv.innerHTML += `<div><b>You:</b> ${userMessage}</div>`;
    chatBox.appendChild(messageDiv);

    let imageBase64 = "";
    let image_location = "";
    if (imagePreview_src && imagePreview_src.startsWith("data:image")) {
        imageBase64 = await resizeBase64Image(imagePreview_src, max_resolution, max_resolution);
        image_location = await getUserLocation();
        messageDiv.innerHTML += `<img src="${imageBase64}" style="max-width: 200px; max-height: 200px;"><br>`;
    }

    messageDiv.innerHTML += `<br>`;

    try {
        let response = await fetch(`${backend_url}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            mode: "cors",
            body: JSON.stringify({
                system_prompt: system_prompt,
                message: userMessage,
                history: getChatHistory(),
                conversation_id: conversation_id,
                user_location: userLocationName,
                image_b64: imageBase64.split(",")[1],
                image_location: image_location
            })
        });

        let data = await response.json();
        let botResponse = document.createElement("div");
        botResponse.innerHTML = `<div><b>OAAK:</b> ${data.response}</div><br>`;
        chatBox.appendChild(botResponse);
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        console.error("Error sending message:", error);
    } finally {
        spinner.style.display = "none"; // Hide spinner after response
    }
}

async function resizeBase64Image(base64, maxWidth, maxHeight) {
    return new Promise((resolve) => {
        let img = new Image();
        img.onload = function () {
            let canvas = document.createElement("canvas");
            let ctx = canvas.getContext("2d");

            // Maintain aspect ratio
            let width = img.width;
            let height = img.height;
            if (width > maxWidth || height > maxHeight) {
                let ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL("image/jpeg", 0.7)); // Convert to JPEG with compression
        };
        img.src = base64;
    });
}


function getChatHistory() {
    let messages = document.querySelectorAll("#chat-box div");
    let history = [];
    for (let i = 0; i < messages.length; i += 2) {
        let userMsg = messages[i]?.textContent.replace("You: ", "");
        let botMsg = messages[i + 1]?.textContent.replace("Bot: ", "");
        if (userMsg && botMsg) {
            history.push([userMsg, botMsg]);
        }
    }
    return history;
}
