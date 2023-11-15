import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'dat.gui';

// Scene, Camera, Renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 5;


// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Mouse Controls
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('click', onCanvasClick, false);
renderer.domElement.addEventListener('mousemove', onMouseMove, false);
renderer.domElement.addEventListener('mousedown', onMouseDown, false);
renderer.domElement.addEventListener('mouseup', onMouseUp, false);

// Plane for intersection
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

// Create GUI
const gui = new GUI();
let currentMode = 'addLargeMass';

const input_params = {
    addLargeMass: function () { currentMode = 'addLargeMass'; },
    addSmallMass: function () { currentMode = 'addSmallMass'; }
};

gui.add(input_params, 'addLargeMass').name('Add Planets');
gui.add(input_params, 'addSmallMass').name('Add Satellites');

// Keep track of positions of masses & current mode
let planetPositions = [];
let satellitePositions = [];

// Mathematical Constants
const G =  10000;
const DELTA_TIME = 0.001;
const ORIGINAL_PLANET_MASS = 10;
const SATELLITE_MASS = 1;

// Create a mass
function createMass(isPlanet, position = new THREE.Vector3(0, 0, 0)) {
    // Create a sphere geometry
    const geometry = new THREE.SphereGeometry(isPlanet ? 0.5 : 0.1, 32, 32);

    // Create a material
    const material = new THREE.MeshBasicMaterial({ color: isPlanet ? 0x00ff00 : 0xff0000 });

    // Create a mesh
    const mesh = new THREE.Mesh(geometry, material);

    // Set the position
    mesh.position.copy(position);

    // set the mass
    mesh.mass = isPlanet ? ORIGINAL_PLANET_MASS : SATELLITE_MASS;

    // Add the mesh to the scene
    scene.add(mesh);

    // Add the position to the appropriate array
    if (isPlanet) {
        planetPositions.push(mesh);
    } else {
        mesh.velocity = new THREE.Vector3(0, 0, 0);
        satellitePositions.push(mesh);
        startOrbit(mesh);
    }
}

function onCanvasClick(event) {
    // Get the mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // update plane position with camera position
    // plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(plane.normal), camera.position);

    // Find the intersection with the plane
    raycaster.setFromCamera(mouse, camera);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersect);

    // Determine the position where the sphere should be placed
    const distance = 5; // You can adjust this distance as needed
    const direction = raycaster.ray.direction.clone().normalize().multiplyScalar(distance);
    const spherePosition = camera.position.clone().add(direction);

    // Add a mass at the calculated position
    createMass(currentMode === 'addLargeMass', spherePosition);
}

// set planet mesh color and size based on mass
function setPlanetColor(planetMesh) {
    // set color based on mass
    const color = new THREE.Color();
    color.setHSL(planetMesh.mass / 100, 1, 0.5);
    planetMesh.material.color = color;

    // set size based on mass, default mass is 
}

// calulate ability to retain or lose mass upon collision
function calculateMassRetained(planetMesh) {
    
    // 0.5 probability at original mass, 0 probability at 0 mass, 1 probability at infinite mass, otherwise follow sigmoid function
    const probabilty_to_gain = 1 / (1 + Math.exp(-(planetMesh.mass - ORIGINAL_PLANET_MASS)));

    // if random number is less than probability to retain, retain mass, otherwise lose mass
    const random_number = Math.random();
    if (random_number < probabilty_to_gain) {
        // gain satellite mass from the planet and resize planet accordingly    
        planetMesh.mass += SATELLITE_MASS;
        setPlanetColor(planetMesh);
    }
    else {
        // lose satellite mass from the planet and resize planet accordingly
        planetMesh.mass -= SATELLITE_MASS;
        setPlanetColor(planetMesh);
    }
    // const massRetained = planetMesh.mass - (planetMesh.mass * 0.5);
    // return massRetained;
}


function findNearestPlanet(satelliteMesh) {
    // Find the nearest planet to the satellite
    let nearestPlanet = null;
    let shortestDistance = Infinity;
    for (const planetMesh of planetPositions) {
        const distance = satelliteMesh.position.distanceTo(planetMesh.position);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestPlanet = planetMesh;
        }
    }

    return [nearestPlanet, shortestDistance];
}

function applyGravitationalForceFromPlanets(satelliteMesh) {
    // keep an array of vectors to each planet from the satellite
    console.log(satelliteMesh.position)
    for (const planetMesh of planetPositions) {
        // add console.log statements to see what's going on
        const directionToPlanet = new THREE.Vector3().subVectors(planetMesh.position, satelliteMesh.position);
        // console.log(directionToPlanet);
        const distanceSquared = directionToPlanet.lengthSq();
        // console.log(distanceSquared);

        // if satellite is too close to planet, record collision
        if (distanceSquared <= 0.25) {
            console.log("collision");
            // calculate mass retained by planet
            calculateMassRetained(planetMesh);
            scene.remove(satelliteMesh);
            satellitePositions.splice(satellitePositions.indexOf(satelliteMesh), 1);
            continue;
        }


        const forceMagnitude = G * planetMesh.mass / distanceSquared;
        // console.log(forceMagnitude);
        const forceDirection = directionToPlanet.normalize();
        // console.log(forceDirection);
        const gravityForce = forceDirection.multiplyScalar(forceMagnitude);
        // console.log(gravityForce);

        // Update velocity based on gravity
        satelliteMesh.velocity.add(gravityForce.multiplyScalar(DELTA_TIME));

        // Update position
        satelliteMesh.position.add(satelliteMesh.velocity.multiplyScalar(DELTA_TIME));

        // console log new position and velocity
        // console.log(satelliteMesh.position);
        console.log(satelliteMesh.velocity);
    }
}

function startOrbit(satelliteMesh) {


    // for now, initialize each satellite's velocity to 0
    console.log(satelliteMesh.position);
    // initialize satellite velocity to random velocity
    satelliteMesh.velocity = new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10);
    // satelliteMesh.velocity = new THREE.Vector3(0, 0, 0);
}

function updateSatellitePositions() {
    for (const satelliteMesh of satellitePositions) {
        applyGravitationalForceFromPlanets(satelliteMesh);
    }
}

// Animate
function animate() {
    requestAnimationFrame(animate);

    // Update satellite positions
    updateSatellitePositions();

    // Update the controls
    controls.update();

    // Render
    renderer.render(scene, camera);
}

animate();
