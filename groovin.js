import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'dat.gui';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 5;

const controls = new OrbitControls(camera, renderer.domElement);

const gui = new GUI();
const params_folder = gui.addFolder('Parameters');
const input_params = {
    articulation_angle: 0,
    vehicle_width: 1,
    vehicle_length: 1,
    velocity: 1
};

params_folder.add(input_params, 'articulation_angle', -Math.PI / 2, Math.PI / 2, 0.01);
params_folder.add(input_params, 'vehicle_width', 0, 10);
params_folder.add(input_params, 'vehicle_length', 0, 10);
params_folder.add(input_params, 'velocity', 0, 10);
params_folder.open();

// Global Variables
let ICC = new THREE.Vector3(0, 0, 0);
const DELTA_TIME = 1 / 60; // Assuming 60 FPS

// Initial state of the vehicle
let vehicle_position = new THREE.Vector3(0, 0, 0);
let vehicle_orientation = 0;
let vehicle_point_material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
let vehicle_point_geometry = new THREE.CircleGeometry(0.1, 32);
let vehicle_point = new THREE.Mesh(vehicle_point_geometry, vehicle_point_material);
scene.add(vehicle_point);

// Initial state of the ICC
let icc_point_material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow color for ICC
let icc_point_geometry = new THREE.CircleGeometry(0.05, 32); // Smaller circle geometry for ICC
let icc_point = new THREE.Mesh(icc_point_geometry, icc_point_material);
scene.add(icc_point); // Add ICC point to the scene initially
let path_curve; // This will hold our path curve object


function find_vehicle_position() {
    if (input_params.articulation_angle === 0) {
        // Move straight if there is no articulation angle
        vehicle_position.y += input_params.velocity * DELTA_TIME;

        // Since we are moving straight, ICC is at infinity and we don't draw it or the path
        icc_point.visible = false; // Hide the ICC point
        if (path_curve) {
            scene.remove(path_curve); // Remove the path curve if it exists
            path_curve = undefined; // Set to undefined to indicate there is no path curve
        }
    } else {
        // The ICC and path are relevant, so we make sure they are visible
        icc_point.visible = true;

        // Calculate the turning radius from the articulation angle
        let r0 = input_params.vehicle_length / Math.tan(input_params.articulation_angle);

        // Calculate the ICC position relative to the vehicle
        ICC.x = vehicle_position.x - r0 * Math.sin(vehicle_orientation);
        ICC.y = vehicle_position.y + r0 * Math.cos(vehicle_orientation);

        // Update the ICC point mesh position
        icc_point.position.x = ICC.x;
        icc_point.position.y = ICC.y;

        // Calculate the angular velocity based on the velocity and turning radius
        const omega = input_params.velocity / r0; // Angular velocity (rad/s)
        const theta = omega * DELTA_TIME; // Angle of rotation (rad)

        // Update the vehicle's orientation
        vehicle_orientation += theta;

        // Calculate new position based on rotation around ICC
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        const x_relative = vehicle_position.x - ICC.x;
        const y_relative = vehicle_position.y - ICC.y;

        vehicle_position.x = ICC.x + cosTheta * x_relative - sinTheta * y_relative;
        vehicle_position.y = ICC.y + sinTheta * x_relative + cosTheta * y_relative;

        // Draw or update the curve from ICC to the vehicle position
        drawPathFromICCtoVehicle();
    }

    // Update the position of the vehicle point mesh
    vehicle_point.position.x = vehicle_position.x;
    vehicle_point.position.y = vehicle_position.y;
}

function drawPathFromICCtoVehicle() {
    if (path_curve) {
        scene.remove(path_curve); // Remove the old path curve from the scene
    }
    const path_points = [];
    path_points.push(new THREE.Vector3(ICC.x, ICC.y, 0)); // Start at the ICC
    path_points.push(vehicle_point.position.clone()); // End at the vehicle point position

    const path_geometry = new THREE.BufferGeometry().setFromPoints(path_points);
    const path_material = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blue color for the path
    path_curve = new THREE.Line(path_geometry, path_material);

    scene.add(path_curve); // Add the new path curve to the scene
}

function animate() {
    requestAnimationFrame(animate);
    find_vehicle_position(); // Continuously update the vehicle's position
    controls.update();
    renderer.render(scene, camera);
}

animate();

// Listen for changes in the articulation angle or velocity
params_folder.__controllers.forEach(controller => {
    controller.onChange(find_vehicle_position);
});
