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
const G =  1;

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
    mesh.mass = 1;

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

function startOrbit(satelliteMesh) {
    // Find the nearest planet to the satellite
    const [nearestPlanet, shortestDistance] = findNearestPlanet(satelliteMesh);

    // log nearest planet
    console.log("Nearset Planet: ", nearestPlanet);
    console.log("shortestDistance: ", shortestDistance);


    if (nearestPlanet) {
        // Calculate the orbit velocity
        const r = satelliteMesh.position.distanceTo(nearestPlanet.position);
        const v = Math.sqrt((G * nearestPlanet.mass) / r);

        // log velocity on console
        console.log(v);

        // Calculate the tangent vector for the satellite's velocity
        const direction = new THREE.Vector3().subVectors(satelliteMesh.position, nearestPlanet.position).normalize();
        const tangent = new THREE.Vector3(-direction.y, direction.x, 0).normalize();

        // Set the satellite's velocity
        satelliteMesh.velocity = tangent.multiplyScalar(v);

        // Store the planet as the satellite's anchor for orbit
        satelliteMesh.orbitCenter = nearestPlanet;
    }
}

function updateSatellitePositions() {
    for (const satelliteMesh of satellitePositions) {
        // Find the nearest planet to the satellite
        const [planet, shortestDistance] = findNearestPlanet(satelliteMesh);
        // const planet = satelliteMesh.orbitCenter;

        // console.logs
        console.log("planet: ", planet);

        // Gravitational force calculation
        const directionToPlanet = new THREE.Vector3().subVectors(planet.position, satelliteMesh.position);
        const distanceSquared = directionToPlanet.lengthSq();
        const forceMagnitude = G * planet.mass / distanceSquared;
        const forceDirection = directionToPlanet.normalize();
        const gravityForce = forceDirection.multiplyScalar(forceMagnitude);

        console.log("gravityForce: ", gravityForce);

        // Update velocity based on gravity
        satelliteMesh.velocity.add(gravityForce);

        console.log("satelliteMesh.velocity: ", satelliteMesh.velocity);

        // Update position
        satelliteMesh.position.add(satelliteMesh.velocity);

        // console.log
        console.log("satelliteMesh.position: ", satelliteMesh.position);
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