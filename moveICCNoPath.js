import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene, Camera, Renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 5;

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Raycaster for mouse interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Vehicle point
const vehicle_point_material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const vehicle_point_geometry = new THREE.CircleGeometry(0.1, 32);
const vehicle_point = new THREE.Mesh(vehicle_point_geometry, vehicle_point_material);
scene.add(vehicle_point);

// ICC point (Initially not visible)
const icc_point_material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const icc_point_geometry = new THREE.CircleGeometry(0.05, 32);
const icc_point = new THREE.Mesh(icc_point_geometry, icc_point_material);
scene.add(icc_point);
icc_point.visible = false;

// Variables to control vehicle movement around ICC
let isMoving = false;
let vehicle_speed = 0.02; // The speed at which the vehicle orbits around the ICC
let vehicle_radius = 2; // The radius of the orbit
let vehicle_angle = 0; // The current angle of the vehicle around the ICC

function onCanvasClick(event) {
    // Only proceed for left click (event.button === 0)
    if (event.button !== 0) return;

    console.log('Left click detected');
    setICCandStartMoving(event);

    // Set the vehicle speed to positive if it was negative
    vehicle_speed = Math.abs(vehicle_speed);
}

function onCanvasRightClick(event) {
    // Prevent the default context menu from appearing
    event.preventDefault();

    console.log('Right click detected');
    // Set ICC as with left click
    setICCandStartMoving(event);
    // Reverse the direction for clockwise movement
    vehicle_speed = Math.abs(vehicle_speed) * -1;
}

function setICCandStartMoving(event) {
    // Convert mouse click to normalized device coordinates
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);

    // Calculate ICC position
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersect);
    
    icc_point.position.copy(intersect);
    icc_point.visible = true;

    // Start moving the vehicle
    isMoving = true;
    vehicle_radius = vehicle_point.position.distanceTo(icc_point.position);
    vehicle_angle = Math.atan2(
        vehicle_point.position.y - icc_point.position.y,
        vehicle_point.position.x - icc_point.position.x
    );
}

// Add event listener for left mouse click
renderer.domElement.addEventListener('mousedown', onCanvasClick, false);
// Add event listener for right mouse click
renderer.domElement.addEventListener('contextmenu', onCanvasRightClick, false);

function animate() {
    requestAnimationFrame(animate);

    if (isMoving) {
        // Orbit the vehicle around the ICC
        vehicle_angle += vehicle_speed;
        vehicle_point.position.x = icc_point.position.x + Math.cos(vehicle_angle) * vehicle_radius;
        vehicle_point.position.y = icc_point.position.y + Math.sin(vehicle_angle) * vehicle_radius;
    }

    controls.update();
    renderer.render(scene, camera);
}

// Add event listener for mouse click
renderer.domElement.addEventListener('click', onCanvasClick, false);

animate();
