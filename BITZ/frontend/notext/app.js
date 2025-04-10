const API_URL = "https://scaling-space-carnival-qvvrrjxqgrp246pj-5000.app.github.dev"
//const API_URL = "https://oaak.rubengr.es"

// DOM Elements
const app = {
    screens: {
        initial: document.getElementById('initial-screen'),
        camera: document.getElementById('camera-screen'),
        analysis: document.getElementById('analysis-screen'),
        loading: document.getElementById('loading-screen')
    },
    elements: {
        video: document.getElementById('video'),
        capturedImage: document.getElementById('captured-image'),
        cameraButton: document.getElementById('camera-button'),
        cameraInput: document.getElementById('camera-input'),
        captureButton: document.getElementById('capture-button'),
        cameraBackButton: document.getElementById('camera-back'),
        uploadButton: document.getElementById('upload-button'),
        fileInput: document.getElementById('file-input'),
        newPhotoButton: document.getElementById('new-photo'),
        endQuestButton: document.getElementById('end-quest'),
        description: document.getElementById('description'),
        questions: document.getElementById('questions')
    }
};

// State
let stream = null;
let currentQuestions = [];

// Generate a unique conversation ID or retrieve from localStorage
const conversation_id = localStorage.getItem('conversation_id') || `${Date.now()}${Math.floor(performance.now())}`;
localStorage.setItem('conversation_id', conversation_id);

// User location storage
let userLocation = {
    name: "unknown",
    coordinates: null
};

// Screen Management
function showScreen(screenId) {
    Object.values(app.screens).forEach(screen => screen.classList.remove('active'));
    app.screens[screenId].classList.add('active');
}

// Get user location
async function getUserLocation() {
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation.coordinates = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                // Try to get location name
                fetchLocationName(position.coords.latitude, position.coords.longitude)
                    .then(() => resolve(userLocation))
                    .catch(() => resolve(userLocation));
            },
            () => resolve(userLocation)
        );
    });
}

// Fetch location name from coordinates
async function fetchLocationName(latitude, longitude) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            userLocation.name = data.display_name || "Location not found";
        }
    } catch (error) {
        console.error("Error fetching location name:", error);
    }
}

// Camera Handling (fallback for devices without capture support)
async function startCamera() {
    // On modern mobile devices, we'll use the capture attribute
    // This is just a fallback for browsers that don't support it
    if (isMobile()) {
        app.elements.cameraInput.click();
    } else {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' }, 
                audio: false 
            });
            app.elements.video.srcObject = stream;
            showScreen('camera');
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Unable to access camera. Please make sure you have granted camera permissions.');
        }
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

// Check if the device is mobile
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Image Capture (for the fallback camera interface)
async function captureImage() {
    const canvas = document.createElement('canvas');
    canvas.width = app.elements.video.videoWidth;
    canvas.height = app.elements.video.videoHeight;
    canvas.getContext('2d').drawImage(app.elements.video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg').split(',')[1];
    stopCamera();
    
    // Get user location before processing image
    await getUserLocation();
    processImage(imageData);
}

// File Upload Handling (for both camera capture and gallery uploads)
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const imageData = e.target.result.split(',')[1];
        
        // Get user location before processing image
        await getUserLocation();
        processImage(imageData);
    };
    reader.readAsDataURL(file);
}

// API Communication
async function processImage(imageData) {
    showScreen('loading');
    try {
        // Prepare the request body with all needed parameters
        const requestBody = {
            image_data: imageData,
            conversation_id: conversation_id,
            user_location: userLocation.name,
            image_location: userLocation.coordinates
        };
        
        const response = await fetch(API_URL + '/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        
        const result = await response.json();
        
        console.log(result)

        if (result.error) throw new Error(result.error);
        
        displayResults(result, imageData);
    } catch (err) {
        console.error('Error processing image:', err);
        alert('Error processing image. Please try again.');
        showScreen('initial');
    }
}

// Display Results
function displayResults(result, imageData) {
    // Set the captured image
    app.elements.capturedImage.src = `data:image/jpeg;base64,${imageData}`;
    
    // Build HTML with only non-empty values
    let html = '<h2>Species Identification</h2>';
    
    // Only add name if it's not empty
    const name = result.species_identification?.name;
    if (name && !isEmptyValue(name)) {
        html += `<p><strong>${name}</strong></p>`;
    }
    
    // Only add description if it's not empty
    const description = result.species_identification?.what_is_it;
    if (description && !isEmptyValue(description)) {
        html += `<p>${description}</p>`;
    }
    
    // Only add ecological importance if it's not empty
    const importance = result.species_identification?.ecological_importance;
    if (importance && !isEmptyValue(importance)) {
        html += `<h3>Ecological Importance</h3>`;
        html += `<p>${importance}</p>`;
    }
    
    // Only add interactions if there are non-empty ones
    const interactions = result.species_identification?.species_interactions;
    if (interactions && interactions.length > 0 && interactions.some(i => !isEmptyValue(i))) {
        html += `<h3>Species Interactions</h3>`;
        html += `<ul>`;
        interactions.forEach(interaction => {
            if (!isEmptyValue(interaction)) {
                html += `<li>${interaction}</li>`;
            }
        });
        html += `</ul>`;
    }
    
    // Add next target information if available
    if (result.next_target) {
        html += `<h3>Next Target</h3>`;
        
        if (result.next_target.focus && !isEmptyValue(result.next_target.focus)) {
            html += `<p><strong>Look for:</strong> ${result.next_target.focus}</p>`;
        }
        
        if (result.next_target.location && !isEmptyValue(result.next_target.location)) {
            html += `<p><strong>Where:</strong> ${result.next_target.location}</p>`;
        }
        
        if (result.next_target.importance && !isEmptyValue(result.next_target.importance)) {
            html += `<p><strong>Why:</strong> ${result.next_target.importance}</p>`;
        }
    }
    
    // Set the HTML
    app.elements.description.innerHTML = html;

    // Display yes/no guidance question if available
    displayYesNoGuidance(result.sampling_guidance);

    showScreen('analysis');
}

function displayYesNoGuidance(guidance) {
    // Clear previous questions
    app.elements.questions.innerHTML = '';
    
    // Skip if guidance is missing or question is empty
    if (!guidance || !guidance.question || isEmptyValue(guidance.question)) {
        return;
    }
    
    // Check if we have at least one non-empty action
    const hasYesAction = guidance.yes_action && !isEmptyValue(guidance.yes_action);
    const hasNoAction = guidance.no_action && !isEmptyValue(guidance.no_action);
    
    if (!hasYesAction && !hasNoAction) {
        return;
    }
    
    // Create the yes/no question UI
    const container = document.createElement('div');
    container.className = 'question-container';
    
    const questionText = document.createElement('p');
    questionText.className = 'question-text';
    questionText.textContent = guidance.question;
    container.appendChild(questionText);
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'options-container';
    
    // Yes button
    if (hasYesAction) {
        const yesButton = document.createElement('button');
        yesButton.className = 'option-button yes-button';
        yesButton.setAttribute('data-value', 'yes');
        yesButton.setAttribute('data-action', guidance.yes_action);
        yesButton.textContent = 'Yes';
        yesButton.addEventListener('click', handleYesNoResponse);
        optionsContainer.appendChild(yesButton);
    }
    
    // No button
    if (hasNoAction) {
        const noButton = document.createElement('button');
        noButton.className = 'option-button no-button';
        noButton.setAttribute('data-value', 'no');
        noButton.setAttribute('data-action', guidance.no_action);
        noButton.textContent = 'No';
        noButton.addEventListener('click', handleYesNoResponse);
        optionsContainer.appendChild(noButton);
    }
    
    container.appendChild(optionsContainer);
    app.elements.questions.appendChild(container);
}

// Handle Yes/No Response
function handleYesNoResponse(event) {
    const button = event.target;
    const response = button.getAttribute('data-value');
    const action = button.getAttribute('data-action');
    
    // Update UI to show selected option
    button.closest('.question-container').querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    
    // Display the action guidance
    const guidanceContainer = document.createElement('div');
    guidanceContainer.className = 'guidance-container';
    
    const guidanceText = document.createElement('p');
    guidanceText.className = 'guidance-text';
    guidanceText.textContent = action;
    guidanceContainer.appendChild(guidanceText);
    
    // Add action button if appropriate
    if (action.toLowerCase().includes('take a photo') || 
        action.toLowerCase().includes('photo') ||
        action.toLowerCase().includes('picture') ||
        action.toLowerCase().includes('capture')) {
        
        const actionButton = document.createElement('button');
        actionButton.className = 'primary-button action-button';
        actionButton.textContent = 'Take Photo';
        actionButton.addEventListener('click', () => {
            if (isMobile()) {
                app.elements.cameraInput.click();
            } else {
                startCamera();
            }
        });
        guidanceContainer.appendChild(actionButton);
    }
    
    // Replace the options with the guidance
    const optionsContainer = button.closest('.options-container');
    optionsContainer.innerHTML = '';
    optionsContainer.appendChild(guidanceContainer);
    
    // Send the response to the server
    processYesNoResponse(response, action);
}

async function processYesNoResponse(response, action) {
    try {
        const apiResponse = await fetch(API_URL + '/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                answer: response + ": " + action,
                conversation_id: conversation_id,
                user_location: userLocation.name,
                image_location: userLocation.coordinates
            })
        });
        
        const result = await apiResponse.json();
        if (result.error) throw new Error(result.error);
        
        // We'll update with new data if the server responds with new info
        if (result.species_identification || result.sampling_guidance || result.next_target) {
            // Store the current image data
            const currentImage = app.elements.capturedImage.src.split(',')[1];
            
            // Wait a moment before updating to give user time to read the guidance
            setTimeout(() => {
                displayResults(result, currentImage);
            }, 5000);
        }
    } catch (err) {
        console.error('Error processing response:', err);
    }
}

// Helper function to check if a value is empty
function isEmptyValue(value) {
    if (!value) return true;
    
    const emptyValues = ['empty', 'none', 'unknown', 'null', 'nothing', 'n/a', 'undefined', '-'];
    const cleanedValue = value.toString().trim().toLowerCase();
    
    return cleanedValue === '' || 
           emptyValues.includes(cleanedValue) || 
           cleanedValue === '...' ||
           cleanedValue === 'not specified';
}

// Initialize
(async function() {
    // Try to get user location at startup
    await getUserLocation();
})();

// Event Listeners
app.elements.cameraButton.addEventListener('click', () => {
    // Use the capture attribute on mobile, fallback to getUserMedia on desktop
    if (isMobile()) {
        app.elements.cameraInput.click();
    } else {
        startCamera();
    }
});

app.elements.cameraInput.addEventListener('change', handleFileUpload);
app.elements.captureButton.addEventListener('click', captureImage);
app.elements.cameraBackButton.addEventListener('click', () => {
    stopCamera();
    showScreen('initial');
});
app.elements.uploadButton.addEventListener('click', () => {
    app.elements.fileInput.click();
});
app.elements.fileInput.addEventListener('change', handleFileUpload);
app.elements.newPhotoButton.addEventListener('click', () => {
    if (isMobile()) {
        app.elements.cameraInput.click();
    } else {
        startCamera();
    }
});
app.elements.endQuestButton.addEventListener('click', () => {
    localStorage.removeItem('conversation_id');
    window.open(API_URL + '/graph_view?quest_id=' + conversation_id);
});
