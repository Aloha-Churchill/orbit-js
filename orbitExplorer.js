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
let justDragged = false;
let v_start = new THREE.Vector3(0, 0, 0);
let pointer_line = null;

const input_params = {
    addLargeMass: function () { currentMode = 'addLargeMass'; },
    addSmallMass: function () { currentMode = 'addSmallMass'; },
    generateMode: function () { currentMode = 'generate'}
};

gui.add(input_params, 'addLargeMass').name('Add Planets');
gui.add(input_params, 'addSmallMass').name('Add Satellites');
gui.add(input_params, 'generateMode').name('Generate Random Scene');

// Keep track of positions of masses & current mode
let planets = [];
let satellites = [];

// Mathematical Constants
const G = 1000;
const DELTA_TIME = 0.001;
const ORIGINAL_PLANET_MASS = 10;
const SATELLITE_MASS = 1;


// Drag Controls
const drag_controls = new DragControls(satellites, camera, renderer.domElement);

drag_controls.addEventListener('dragstart', function (event) {
    // disable orbit controls while dragging
    controls.enabled = false;

    // set v_start to current position of satellite
    v_start = event.object.position.clone();

    // console.log position of event object
    console.log("drag start: " + JSON.stringify(v_start));
});

// draw line from start to end of drag controls
drag_controls.addEventListener('drag', function (event) {

    // remove previous pointer line
    if (pointer_line != null) {
        scene.remove(pointer_line);
    }
    console.log("drag");


    // draw line from start to current mouse position
    // yellow hex 
    const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const points = [];
    console.log("RIGHT BEFORE Vstart: " + v_start);
    points.push(v_start);
    points.push(event.object.position);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    pointer_line = new THREE.Line(geometry, material);
    scene.add(pointer_line);
});


drag_controls.addEventListener('dragend', function (event) {
    console.log("drag end");

    // get end position of drag 

    const v_end = event.object.position.clone();
    const v_delta = new THREE.Vector3().subVectors(v_end, v_start);

    console.log("drag delta: " + JSON.stringify(v_delta));
    // set satellite velocity to delta times a constant
    event.object.velocity = v_delta.multiplyScalar(100);
    
    // re-enable orbit controls after dragging
    controls.enabled = true;

    justDragged = true;

    // remove pointer line
    scene.remove(pointer_line);
    pointer_line = null;
});


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
        console.log("Planet created at position: " + mesh.position);
        planets.push(mesh);
    } else {
        mesh.drag = false;
        console.log("Satellite created at position: " + mesh.position);
        mesh.velocity = new THREE.Vector3(0, 0, 0);
        satellites.push(mesh);
        // startOrbit(mesh);
    }
}

function onCanvasClick(event) {
    if (justDragged) {
        justDragged = false;
        return;
    }
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
    if (currentMode === 'addSmallMass') {
        createMass(false, spherePosition);
    }
    else {
        createMass(true, spherePosition);
    }
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
    // const probabilty_to_gain = 1 / (1 + Math.exp(-(planetMesh.mass - ORIGINAL_PLANET_MASS)));
    const probability_to_gain = 0.5;
    // mass to gain is based on sigmoid
    // if random number is less than probability to retain, retain mass, otherwise lose mass
    const random_number = Math.random();
    if (random_number < probability_to_gain) {
        // gain satellite mass from the planet and resize planet accordingly    
        planetMesh.mass += SATELLITE_MASS;
        setPlanetColor(planetMesh);
    }
    else {
        // lose satellite mass from the planet and resize planet accordingly
        if (planetMesh.mass <= 0 ) {
            planetMesh.mass -= SATELLITE_MASS;
            setPlanetColor(planetMesh);
        }


    }
    // const massRetained = planetMesh.mass - (planetMesh.mass * 0.5);
    // return massRetained;
}


function applyGravitationalForceFromPlanets(satelliteMesh) {
    let totalGravityForce = new THREE.Vector3(0, 0, 0);
    let forceApplied = false;

    for (const planetMesh of planets) {
        const directionToPlanet = new THREE.Vector3().subVectors(planetMesh.position, satelliteMesh.position);
        const distanceSquared = directionToPlanet.lengthSq();

        // Check for collision
        if (distanceSquared <= 0.25) {
            console.log("collision");
            calculateMassRetained(planetMesh);
            scene.remove(satelliteMesh);
            satellites.splice(satellites.indexOf(satelliteMesh), 1);
            return; // Exit the function as the satellite is destroyed
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

    // Log new velocity
    console.log("Vel = " + JSON.stringify(satelliteMesh.velocity));
}


// function applyGravitationalForceFromPlanets(satelliteMesh) {

//     // if planets is empty still update satellite position with velocity
//     let s_vel = satelliteMesh.velocity.clone();
//     satelliteMesh.position.add(s_vel.multiplyScalar(DELTA_TIME));
//     // if (planets.length == 0) {
//     //     console.log("Curr velocity = " + JSON.stringify(satelliteMesh.velocity));
//     //     let s_vel = satelliteMesh.velocity.clone();
//     //     satelliteMesh.position.add(s_vel.multiplyScalar(DELTA_TIME));
//     // }    
//     for (const planetMesh of planets) {
//         // add console.log statements to see what's going on
//         const directionToPlanet = new THREE.Vector3().subVectors(planetMesh.position, satelliteMesh.position);
//         // console.log(directionToPlanet);
//         const distanceSquared = directionToPlanet.lengthSq();
//         // console.log(distanceSquared);

//         // if satellite is too close to planet, record collision
//         if (distanceSquared <= 0.25) {
//             console.log("collision");
//             // calculate mass retained by planet
//             calculateMassRetained(planetMesh);
//             scene.remove(satelliteMesh);
//             satellites.splice(satellites.indexOf(satelliteMesh), 1);
//             continue;
//         }


//         const forceMagnitude = G * planetMesh.mass / distanceSquared;
//         // console.log(forceMagnitude);
//         const forceDirection = directionToPlanet.normalize();
//         // console.log(forceDirection);
//         const gravityForce = forceDirection.multiplyScalar(forceMagnitude);
//         // console.log(gravityForce);

//         // Update velocity based on gravity
//         satelliteMesh.velocity.add(gravityForce.multiplyScalar(DELTA_TIME));

//         // Update position
//         satelliteMesh.position.add(satelliteMesh.velocity.multiplyScalar(DELTA_TIME));

//         // console log new position and velocity
//         // console.log(satelliteMesh.position);
//         console.log("Vel = " + JSON.stringify(satelliteMesh.velocity));
//     }
// }

function startOrbit(satelliteMesh) {
    // for now, initialize each satellite's velocity to 0
    // console.log(satelliteMesh.position);
    // initialize satellite velocity to random velocity
    // satelliteMesh.velocity = new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10);
    // satelliteMesh.velocity = new THREE.Vector3(0, 0, 0);
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
