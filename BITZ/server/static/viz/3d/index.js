import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.152.0/examples/jsm/controls/OrbitControls.js';

const ImagePaths = [
    "10070.jpg","126155.jpg","13858.jpg","15282.jpg","204496.jpg","4270.jpg","480298.jpg","52482.jpg","53059.jpg","552449.JPG","55626.jpg","55882.jpeg","56162.jpeg","58085.jpeg","7008.jpeg","79025.jpg","84954.jpeg",
    "118552.jpg","126585.jpg","13988.jpg","153440.jpeg","204533.jpeg","43151.jpg","48484.jpg","52506.jpg","53168.jpg","55563.jpeg","55637.jpg","55891.jpeg","56170.jpg","61508.jpg","70211.jpeg","79141.jpeg","891696.jpg",
    "119019.jpg","127112.jpg","141725.jpg","166162.jpg","243824.jpg","43584.jpg","49133.jpg","52592.jpg","53178.jpg","55576.jpg","55666.jpg","55925.jpg","57036.jpg","61906.jpg","7089.jpg","8088.jpg",
    "119664.jpg","12716.jpg","144510.jpg","181594.jpg","287309.jpg","44576.jpg","4954.jpg","52628.jpg","53211.jpg","55607.jpeg","55727.jpg","55990.jpg","57278.jpeg","62205.jpg","75916.jpg","81923.jpeg",
    "119791.jpg","13094.jpeg","144849.jpg","18911.jpg","3017.jpg","47219.jpg","51702.jpg","52796.jpg","53294.jpeg","55610.jpg","55757.jpg","56077.jpg","57281.jpg","6921.jpg","76923.jpg","83074.jpg",
    "119792.jpg","132070.jpeg","145363.jpg","201282.jpg","3048.jpg","47443.jpg","51884.jpeg","52821.jpg","53298.jpeg","55620.jpeg","55830.jpg","56088.jpeg","57283.jpg","6930.jpg","76943.jpg","84298.jpeg",
    "123629.jpeg","13688.jpg","14850.jpg","203153.jpg","333813.jpg","47553.jpg","52402.jpg","52989.jpeg","53945.jpg","55625.jpg","55876.jpeg","56121.jpeg","57516.jpg","70045.jpg","77490.jpg","84804.jpg"
]

// Create a scene
const scene = new THREE.Scene();

// Create a camera
const camera = new THREE.PerspectiveCamera(
    75, // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
);
camera.position.z = 5;

// Create a renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);

// Create a group to hold the points
const pointsGroup = new THREE.Group();
scene.add(pointsGroup);

// Function to create a point with an image billboard
function createPoint(texture, position) {
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    return sprite;
}

// Generate points arranged in a sphere
const radius = 5;
const numPoints = 100;
const loader = new THREE.TextureLoader();

for (let i = 0; i < numPoints; i++) {
    const theta = Math.acos(2 * Math.random() - 1); // Random angle for latitude
    const phi = 2 * Math.PI * Math.random(); // Random angle for longitude

    const x = radius * Math.sin(theta) * Math.cos(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(theta);

    const randomImage = ImagePaths[Math.floor(Math.random() * ImagePaths.length)];

    loader.load('images/' + randomImage, (texture) => {
        const point = createPoint(texture, new THREE.Vector3(x, y, z));
        pointsGroup.add(point);
    });
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
