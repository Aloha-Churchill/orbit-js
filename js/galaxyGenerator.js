import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { GUI } from 'dat.gui';

// Scene, Camera, Renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 20;


// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);



// Plane for intersection
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

// Create GUI
const gui = new GUI();
let currentMode = 'addLargeMass';
let justDragged = false;
let v_start = new THREE.Vector3(0, 0, 0);
let pointer_line = null;

const input_params = {
    numPlanets: 0,
    numSatellites: 0,
};
// gui add slider between 0 and 10
gui.add(input_params, 'numPlanets', 0, 100).name('Number of Planets').onChange(generatePlanets);
gui.add(input_params, 'numSatellites', 0, 1000).name('Number of Satellites').onChange(generateSatellites);

// Keep track of positions of masses & current mode
let planets = [];
let satellites = [];

// Mathematical Constants
const G = 500;
const DELTA_TIME = 0.001;
const ORIGINAL_PLANET_MASS = 10;
const SATELLITE_MASS = 1;
const ORIGINAL_PLANET_SCALE = 0.5;
const ORIGINAL_SATELLITE_SCALE = 0.1;


function generatePlanets() {
    console.log("generating planets: " + input_params.numPlanets);
    // Clear the scene
    for (const planetMesh of planets) {
        scene.remove(planetMesh);
    }
    for (let i = 0; i < input_params.numPlanets; i++) {
        const x = Math.random() * 10 - 5;
        const y = Math.random() * 10 - 5;
        const z = Math.random() * 10 - 5;
        createMass(true, new THREE.Vector3(x, y, z));
    }
}

function generateSatellites() {
    console.log("generating satellites");
    // Clear the scene
    for (const satelliteMesh of satellites) {
        scene.remove(satelliteMesh);
    }
    for (let i = 0; i < input_params.numSatellites; i++) {
        const x = Math.random() * 10 - 5;
        const y = Math.random() * 10 - 5;
        const z = Math.random() * 10 - 5;
        createMass(false, new THREE.Vector3(x, y, z));
    }
}

// Create a mass
function createMass(isPlanet, position = new THREE.Vector3(0, 0, 0)) {
    // Create a sphere geometry
    const geometry = new THREE.SphereGeometry(isPlanet ? ORIGINAL_PLANET_SCALE : ORIGINAL_SATELLITE_SCALE, 32, 32);

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
        mesh.num_collisions = 0;
        console.log("Planet created at position: " + mesh.position);
        planets.push(mesh);
        return mesh;
    } else {
        console.log("Satellite created at position: " + mesh.position);
        // set random initial velocity
        mesh.velocity = new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10);
        satellites.push(mesh);
        return mesh;
    }
}

function setSattelliteColor(satelliteMesh) {
    // set satellite mesh color based on velocity
    const base_color = 0xff0000;
    const color_increment = 0x0000ff;
    const color = base_color + (satelliteMesh.velocity.length() * color_increment);
    satelliteMesh.material.color.setHex(color);
}

function setPlanetColorSize(planetMesh) {

    // generate random number between 0 and 1
    const random = Math.random();
    // scale up or down based on random number

    if (random < 0.5) {
        planetMesh.scale.x += ORIGINAL_SATELLITE_SCALE;
        planetMesh.scale.y += ORIGINAL_SATELLITE_SCALE;
        planetMesh.scale.z += ORIGINAL_SATELLITE_SCALE;
        planetMesh.mass += SATELLITE_MASS;
    } else {
        planetMesh.scale.x -= ORIGINAL_SATELLITE_SCALE;
        planetMesh.scale.y -= ORIGINAL_SATELLITE_SCALE;
        planetMesh.scale.z -= ORIGINAL_SATELLITE_SCALE;
        planetMesh.mass -= SATELLITE_MASS;
    }

    // if planet is over 10x original size, just keep size at 10x
    if (planetMesh.scale.x > 10 * ORIGINAL_PLANET_SCALE) {
        planetMesh.scale.x = 10 * ORIGINAL_PLANET_SCALE;
        planetMesh.scale.y = 10 * ORIGINAL_PLANET_SCALE;
        planetMesh.scale.z = 10 * ORIGINAL_PLANET_SCALE;
    }

    // return true if planet gained mass, false if lost mass
    if (random < 0.5) {
        return true;
    }
    return false;

}

function applyGravitationalForceFromPlanets(satelliteMesh) {
    // Calculate gravitational force from all planets
    let totalGravityForce = new THREE.Vector3(0, 0, 0);
    let forceApplied = false;

    for (const planetMesh of planets) {
        const directionToPlanet = new THREE.Vector3().subVectors(planetMesh.position, satelliteMesh.position);
        const distanceSquared = directionToPlanet.lengthSq();

        // Check for collision
        if (distanceSquared <= 0.25) {
            planetMesh.num_collisions += 1;
            const gainedMass = setPlanetColorSize(planetMesh);
            // if planet gained mass, remove satellite
            if (gainedMass) {
                console.log("Planet gained mass, removing satellite")
                scene.remove(satelliteMesh);
                satellites.splice(satellites.indexOf(satelliteMesh), 1);
            }

            // if planet lost mass, create new satellite, and have the other one bounce off
            else {
                console.log("Planet lost mass, creating new satellite")
                // set new velocity
                const newVelocity = satelliteMesh.velocity.clone().multiplyScalar(-1);
                satelliteMesh.velocity.copy(newVelocity);

                // update position
                const newPosition = satelliteMesh.position.clone().add(satelliteMesh.velocity.clone().multiplyScalar(DELTA_TIME));
                satelliteMesh.position.copy(newPosition);

                // spawn new satellite at new position and give it same velocity but a bit slower
                const newSatellite = createMass(false, newPosition);
                const newSatelliteVelocity = new THREE.Vector3().copy(newVelocity).multiplyScalar(0.9);



            }
            // scene.remove(satelliteMesh);
            // satellites.splice(satellites.indexOf(satelliteMesh), 1);
            return;
        }

        // Calculate gravitational force
        const forceMagnitude = G * planetMesh.mass / distanceSquared;
        const forceDirection = directionToPlanet.normalize();
        const gravityForce = forceDirection.multiplyScalar(forceMagnitude);

        // Accumulate total gravitational force
        totalGravityForce.add(gravityForce);
        forceApplied = true;
    }

    if (forceApplied) {
        // Clone the current velocity and update it based on total gravitational force
        let newVelocity = satelliteMesh.velocity.clone().add(totalGravityForce.multiplyScalar(DELTA_TIME));
        satelliteMesh.velocity.copy(newVelocity);
    }

    // Update position based on current velocity
    let newPosition = satelliteMesh.position.clone().add(satelliteMesh.velocity.clone().multiplyScalar(DELTA_TIME));
    satelliteMesh.position.copy(newPosition);

    // set satellite color based on velocity
    setSattelliteColor(satelliteMesh);

}

function updateSatellitePositions() {
    for (const satelliteMesh of satellites) {
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
