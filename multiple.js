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

// Create GUI
const gui = new GUI();
const input_params = {
    vehicle_speed: 0.02,
    num_ICC: 1,
    num_vehicles: 1
};

gui.add(input_params, 'vehicle_speed', 0, 2.0).name('Vehicle Speed').onChange((newSpeed) => {
    vehicle_speed = newSpeed; // Update the vehicle speed whenever the slider is moved
});
gui.add(input_params, 'num_ICC', 1, 10).name('Number of ICC').onChange((newNum) => {
    num_ICC = newNum; // Update the vehicle speed whenever the slider is moved
    updatePoints();
});
gui.add(input_params, 'num_vehicles', 1, 10).name('Number of Vehicles').onChange((newNum) => {
    num_vehicles = newNum; // Update the vehicle speed whenever the slider is moved
    updatePoints();
});

// Define default parameters
let vehicle_speed = 0.02; // The speed at which the vehicle orbits around the ICC
let num_ICC = 1;
let num_vehicles = 1;

const vehicles = [];
const ICCs = [];

function createPoint(point_type) {
    // create a random red point point_type = "vehicle", otherwise a yellow point if point_type == "ICC"
    const point_material = new THREE.MeshBasicMaterial({ color: point_type == "vehicle" ? 0xff0000 : 0xffff00 });
    const point_geometry = new THREE.CircleGeometry(0.1, 32);
    const point = new THREE.Mesh(point_geometry, point_material);

    // set the position of the point
    point.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, 0);

    // add the point to the scene
    scene.add(point);

    // add the point to the corresponding array
    if (point_type == "vehicle") {
        point.orbitRadius = 2;
        vehicles.push(point);
    } else {
        ICCs.push(point);
    }

    return point;
}

function updatePoints() {
    // Adjust the ICC points
    while (ICCs.length > num_ICC) {
        const icc = ICCs.pop();
        scene.remove(icc);
    }
    while (ICCs.length < num_ICC) {
        ICCs.push(createPoint("ICC"));
    }

    // Adjust the vehicle points
    while (vehicles.length > num_vehicles) {
        const vehicle = vehicles.pop();
        scene.remove(vehicle);
    }
    while (vehicles.length < num_vehicles) {
        vehicles.push(createPoint("vehicle"));
    }
}

function findNearestICC(vehicle) {
    let nearestIcc = null;
    let shortestDistance = Infinity;
    
    // Go through all the ICCs to find the nearest one
    for (const icc of ICCs) {
        const distance = vehicle.position.distanceTo(icc.position);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestIcc = icc;
        }
    }
    
    return nearestIcc;
}


// initialize scene with correct amount of vehicles and ICCs
for (let i = 0; i < input_params.num_vehicles; i++) {
    createPoint("vehicle");
}
for (let i = 0; i < input_params.num_ICC; i++) {
    createPoint("ICC");
}



function animate() {
    requestAnimationFrame(animate);

    // Use delta time for smooth animations
    const delta = clock.getDelta(); // create a THREE.Clock() instance outside of this function to use here

    // Make each vehicle orbit the nearest ICC
    for (const vehicle of vehicles) {
        // Find nearest ICC
        const nearestIcc = findNearestICC(vehicle);
        if (nearestIcc) {
            // Check if we have a target ICC and if it's different from the current nearest ICC
            if (!vehicle.targetIcc || vehicle.targetIcc !== nearestIcc) {
                // If there's no targetIcc defined yet or it's different, define/update it
                vehicle.targetIcc = nearestIcc;

                // Define the new target radius
                vehicle.targetRadius = vehicle.position.distanceTo(nearestIcc.position);
                vehicle.transitionProgress = 0; // start the transition
            }

            // Check if we are in transition
            if (vehicle.transitionProgress !== undefined && vehicle.transitionProgress < 1) {
                // Smoothly interpolate from the current orbit radius to the target radius
                vehicle.orbitRadius += (vehicle.targetRadius - vehicle.orbitRadius) * vehicle.transitionProgress;
                vehicle.transitionProgress += delta; // progress the transition

                // Clamp the progress so it does not exceed 1
                if (vehicle.transitionProgress > 1) {
                    vehicle.orbitRadius = vehicle.targetRadius;
                    vehicle.transitionProgress = undefined; // end the transition
                }
            } else {
                // If not in transition, just orbit normally
                if (vehicle.orbitRadius === undefined) {
                    vehicle.orbitRadius = vehicle.targetRadius;
                }
            }

            // Calculate angle for the circular motion, considering a phase offset if needed
            const angle = ((Date.now() / 1000) * vehicle_speed) % (2 * Math.PI);

            // Set the new position for the vehicle to orbit the ICC
            vehicle.position.x = vehicle.targetIcc.position.x + Math.cos(angle) * vehicle.orbitRadius;
            vehicle.position.y = vehicle.targetIcc.position.y + Math.sin(angle) * vehicle.orbitRadius;
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

// Outside the animate function, create a THREE.Clock instance
const clock = new THREE.Clock();


updatePoints();
animate();
