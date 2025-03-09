// Import necessary modules from three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

// Map tile management
const tileSize = 256; // Standard OSM tile size
const tileScale = 1;
const loadedTiles = {};
const visibleTileRadius = 4; // Number of tiles to load in each direction

// Current position in world coordinates
let worldX = 0;
let worldZ = 0;

// Initial zoom level
let zoomLevel = 16;

// Helper to convert lat/lon to tile coordinates
function lon2tile(lon, zoom) { return Math.floor((lon + 180) / 360 * Math.pow(2, zoom)); }
function lat2tile(lat, zoom) { return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)); }

// Starting coordinates (San Francisco)
const startLat = 52.3292;
const startLon = 4.894237;

// Convert starting coordinates to tile coordinates
let centerTileX = lon2tile(startLon, zoomLevel);
let centerTileY = lat2tile(startLat, zoomLevel);

async function get_all_quests(url) {
    // Fetch the JSON data from <url>/explore/raw
    const response = await fetch(`${url}/explore/raw`);
    const questsList = await response.json();

    // Fetch image data for each quest
    const questPromises = questsList.map(async (quest) => {
        const imgsResponse = await fetch(`${url}/explore/${quest.name}/imgs/raw`);
        let imgsData;
        try {
            imgsData = await imgsResponse.json();
        } catch (error) {
            imgsData = []; // Handle cases where there's no image data
        }

        // Extract only the "name" field from each image object
        const images_url = imgsData.map(img => `${url}/explore/${quest.name}/imgs/${img.name}`);

        return { ...quest, "image_urls": images_url };
    });

    // Resolve all fetch promises
    const questsWithImageNames = await Promise.all(questPromises);

    return questsWithImageNames;
}

// Function to create a point with an image billboard
function createPoint(texture, position) {
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.userData.originalPosition = position.clone(); // Store original position
    sprite.scale.set(5, 5, 1); // Makes the sprite 5x5 in world units
    return sprite;
}

function loadTile(tileX, tileY, zoom) {
    const tileId = `${tileX},${tileY},${zoom}`;
    
    
    // Check if tile is already loaded
    if (loadedTiles[tileId]) return;
    
    // Create tile material with OSM texture
    const texture = new THREE.TextureLoader().load(
        `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`,
        function() {
            document.getElementById('info').textContent = `Coords: ${tileX}, ${tileY} | Zoom: ${zoom}`;
        },
        undefined,
        function(err) {
            console.error('Error loading tile:', err);
        }
    );
    
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    const material = new THREE.MeshBasicMaterial({ map: texture });
    
    // Create tile geometry
    const geometry = new THREE.PlaneGeometry(tileSize * tileScale, tileSize * tileScale);
    
    // Create tile mesh
    const tile = new THREE.Mesh(geometry, material);
    
    // Position tile in world (rotated to lie flat)
    tile.rotation.x = -Math.PI / 2;
    
    // Position based on tile coordinates
    const worldTileX = (tileX - centerTileX) * tileSize * tileScale;
    const worldTileZ = (tileY - centerTileY) * tileSize * tileScale;
    
    tile.position.set(worldTileX, 0, worldTileZ);
    
    // Add to scene and tracking
    scene.add(tile);
    loadedTiles[tileId] = tile;
}

// Function to update visible tiles based on current position
function updateTiles() {
    // Convert world position to center tile
    const offsetTileX = Math.floor(worldX / (tileSize * tileScale));
    const offsetTileY = Math.floor(worldZ / (tileSize * tileScale));
    
    const currentCenterTileX = centerTileX + offsetTileX;
    const currentCenterTileY = centerTileY + offsetTileY;
    
    // Load tiles around current position
    for (let x = -visibleTileRadius; x <= visibleTileRadius; x++) {
        for (let y = -visibleTileRadius; y <= visibleTileRadius; y++) {
            loadTile(currentCenterTileX + x, currentCenterTileY + y, zoomLevel);
        }
    }
    
    // Clean up tiles that are too far away
    const cleanupRadius = visibleTileRadius + 2;
    for (const tileId in loadedTiles) {
        const [tx, ty, tz] = tileId.split(',').map(Number);
        
        if (tz !== zoomLevel ||
            Math.abs(tx - currentCenterTileX) > cleanupRadius ||
            Math.abs(ty - currentCenterTileY) > cleanupRadius) {
            scene.remove(loadedTiles[tileId]);
            delete loadedTiles[tileId];
        }
    }
}

// Function to create lines connecting each sprite to one of its five nearest neighbors
function createSequentialLines(group, lineColor = 0x000000) {
    const points = group.children.filter((child) => child instanceof THREE.Sprite);
    if (points.length < 2) return; // Need at least 2 points to create a line

    const lineMaterial = new LineMaterial({
        color: lineColor,
        linewidth: 3,
        transparent: true,
        opacity: 0.8,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight), // Needed for Line2
    });

    for (let i = 0; i < points.length - 1; i++) {
        const pointA = points[i].position;
        const pointB = points[i + 1].position;

        

        // Create geometry using LineGeometry (supports thick lines)
        const geometry = new LineGeometry();
        geometry.setPositions([pointA.x, pointA.y, pointA.z, pointB.x, pointB.y, pointB.z]);

        // Use Line2 instead of regular Line for proper thickness
        const line = new Line2(geometry, lineMaterial);
        line.computeLineDistances(); // Required for proper rendering
        line.userData = { point1: points[i], point2: points[i + 1] };

        group.add(line);
    }

    
}

function createColumn(radius, origin, lineColor = 0x000000, images_urls) {
    const group = new THREE.Group();
    group.position.copy(origin);
    const loader = new THREE.TextureLoader();

    let loadedCount = 0; // Track loaded images

    for (let i = 0; i < images_urls.length; i++) {
        const imageUrl = images_urls[i]; // Use the correct image URL from the array

        loader.load(imageUrl, (texture) => {
            const y = radius * i

            const point = createPoint(texture, new THREE.Vector3(0, y, 0));
            group.add(point);

            loadedCount++; // Increment loaded textures

            // When all textures are loaded, create the lines
            if (loadedCount === images_urls.length) {
                createSequentialLines(group, lineColor);
            }
        });
    }

    spheresGroup.add(group);
}


function createSphere(radius, origin, lineColor = 0x000000, images_urls) {
    const group = new THREE.Group();
    group.position.copy(origin);
    const loader = new THREE.TextureLoader();

    let loadedCount = 0; // Track loaded images

    for (let i = 0; i < images_urls.length; i++) {
        const imageUrl = images_urls[i]; // Use the correct image URL from the array

        loader.load(imageUrl, (texture) => {
            const theta = Math.acos(2 * Math.random() - 1); // Random angle for latitude
            const phi = 2 * Math.PI * Math.random(); // Random angle for longitude

            const x = radius * Math.sin(theta) * Math.cos(phi);
            const y = radius * Math.sin(theta) * Math.sin(phi);
            const z = radius * Math.cos(theta);

            const point = createPoint(texture, new THREE.Vector3(x, y, z));
            group.add(point);

            loadedCount++; // Increment loaded textures

            // When all textures are loaded, create the lines
            if (loadedCount === images_urls.length) {
                
                createSequentialLines(group, lineColor);
            }
        });
    }

    spheresGroup.add(group);
}


// Function to generate a random number within a range
function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Function to apply 3D scrolling Perlin noise to points and lines
function applyPerlinNoiseToGroup(group, time, frequency, amplitude, offset) {
    const points = group.children.filter((child) => child instanceof THREE.Sprite);
    const lines = group.children.filter((child) => child instanceof THREE.Line);

    points.forEach((point) => {
        const original = point.userData.originalPosition;
        const noiseX = simplex.noise4d((original.x + offset.x) * frequency, (original.y + offset.y) * frequency, (original.z + offset.z) * frequency, time);
        const noiseY = simplex.noise4d((original.y + offset.y) * frequency, (original.z + offset.z) * frequency, (original.x + offset.x) * frequency, time);
        const noiseZ = simplex.noise4d((original.z + offset.z) * frequency, (original.x + offset.x) * frequency, (original.y + offset.y) * frequency, time);

        point.position.set(
            original.x + noiseX * amplitude,
            original.y + noiseY * amplitude,
            original.z + noiseZ * amplitude
        );
    });

    lines.forEach((line) => {
        const { point1, point2 } = line.userData;
        line.geometry.setFromPoints([
            point1.position.clone(),
            point2.position.clone()
        ]);
        line.geometry.verticesNeedUpdate = true;
    });
}

// Apply Perlin noise to the entire group of spheres
function applyPerlinNoise(spheresGroup, time) {
    const frequency = 0.1; // Frequency of the noise
    const amplitude = 0.2; // Amplitude of the noise (subtle effect)
    const offset = new THREE.Vector3(0, 0, 0); // Shared offset for all spheres

    spheresGroup.children.forEach((group) => {
        applyPerlinNoiseToGroup(group, time, frequency, amplitude, offset);
    });
}

// Render loop
function animate() {
    const time = performance.now() * 0.001; // Time in seconds

    // Apply Perlin noise to the entire group of spheres
    applyPerlinNoise(spheresGroup, time);

    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create a scene
const scene = new THREE.Scene();

// Set the background color to white
scene.background = new THREE.Color(0xffffff);

// Create a camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 100, 0); // Position it above the scene
camera.lookAt(0, 0, 0); // Make it look dow

// Create a renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Smooth orbiting

// Make the initial ground plane
updateTiles()

// Create a group to hold the spheres
const spheresGroup = new THREE.Group();
scene.add(spheresGroup);

// Simplex noise instance for perlin noise generation
const simplex = new SimplexNoise();

  
const quests = await get_all_quests("https://oaak.rubengr.es");

for (let i = 0; i < quests.length; i++) {
    const radius = getRandomInRange(5, 10); // Random radius between 5 and 10
    const position = new THREE.Vector3(
        getRandomInRange(0, 100), // Random x position
        getRandomInRange(0, 100), // Random y position
        getRandomInRange(0, 50)  // Random z position
    );

    // Generate a pastel color in HSV and convert to HEX
    const hue = getRandomInRange(0, 360); // Random hue
    const saturation = getRandomInRange(60, 80) / 100; // Increased saturation for more color
    const value = getRandomInRange(85, 95) / 100; // High value for brightness
    const color = new THREE.Color().setHSL(hue / 360, saturation, value);

    createColumn(radius, position, color.getHex(), quests[i].image_urls);
}


animate();
