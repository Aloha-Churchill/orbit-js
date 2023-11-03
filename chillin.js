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
    vehicle_speed: 0.02
};

gui.add(input_params, 'vehicle_speed', 0, 0.1).name('Vehicle Speed').onChange((newSpeed) => {
    vehicle_speed = newSpeed; // Update the vehicle speed whenever the slider is moved
});

// Vehicle point
const vehicle_point_material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const vehicle_point_geometry = new THREE.CircleGeometry(0.1, 32);
const vehicle_point = new THREE.Mesh(vehicle_point_geometry, vehicle_point_material);
scene.add(vehicle_point);

// ICC point (Initially not visible)
const icc_point_material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const icc_point_geometry = new THREE.CircleGeometry(0.05, 32);
const icc_point = new THREE.Mesh(icc_point_geometry, icc_point_material);
icc_point.visible = false;
scene.add(icc_point);

// Variables to control vehicle movement around ICC
let isMoving = false;
let vehicle_speed = 0.02; // The speed at which the vehicle orbits around the ICC
let vehicle_radius = 2; // The radius of the orbit
let vehicle_angle = 0; // The current angle of the vehicle around the ICC

// Path tracing
let pathPoints = [];
let pathLine;
let pathMaterial = new THREE.LineBasicMaterial();
let pathSegments = new THREE.Group();

// Function to move the vehicle around the ICC
function moveVehicle() {
    // Update the angle based on the speed
    vehicle_angle += vehicle_speed;

    // Calculate new position
    const x = icc_point.position.x + vehicle_radius * Math.cos(vehicle_angle);
    const y = icc_point.position.y + vehicle_radius * Math.sin(vehicle_angle);

    // Set the new position
    vehicle_point.position.set(x, y, 0);
}

function onCanvasClick(event) {
    // Only proceed for left click (event.button === 0)
    if (event.button !== 0) return;

    console.log('Click');
    setICCandStartMoving(event);

    // Set the vehicle speed to positive if it was negative
    vehicle_speed = Math.abs(vehicle_speed);
}

function onCanvasRightClick(event) {
    // Prevent the default context menu from appearing
    event.preventDefault();

    console.log('Right click');
    // Set ICC as with left click
    setICCandStartMoving(event);
    // Reverse the direction for clockwise movement
    vehicle_speed = -Math.abs(vehicle_speed);
}

function setICCandStartMoving(event) {
    // Convert mouse click to normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

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


function getColorForRadius(radius) {
    // Define the two colors you want to interpolate between
    const innerColor = new THREE.Color(0xff0000); // red for smaller radius
    const outerColor = new THREE.Color(0x0000ff); // blue for larger radius

    // Map the radius to a 0-1 scale (you might want to adjust the range based on your use case)
    const normalizedRadius = (radius - 1) / (5 - 1); // assuming the radius varies from 1 to 5

    // Interpolate between the two colors
    const color = innerColor.clone().lerp(outerColor, normalizedRadius);

    return color;
}

function addPathSegment(point1, point2, radius) {
    const segmentColor = getColorForRadius(radius);

        // Create the geometry and material for the segment
    let segmentGeometry = new THREE.BufferGeometry().setFromPoints([point1, point2]);
    let segmentMaterial = new THREE.LineBasicMaterial({ color: segmentColor });

    // Create the line segment and add it to the group
    let segment = new THREE.Line(segmentGeometry, segmentMaterial);
    pathSegments.add(segment);

}
function updatePath() {
    // Get the last point in the pathPoints array
    let lastPoint = pathPoints[pathPoints.length - 1];

    // Add the current position of the vehicle to the pathPoints array
    pathPoints.push(vehicle_point.position.clone());

    // If there's at least one segment, add a new segment
    if (pathPoints.length > 1) {
        addPathSegment(lastPoint, pathPoints[pathPoints.length - 1], vehicle_radius);
    }

    // Add the new segments to the scene if not already added
    if (!scene.getObjectById(pathSegments.id)) {
        scene.add(pathSegments);
    }
}

// Add event listener for left mouse click
renderer.domElement.addEventListener('mousedown', onCanvasClick, false);
// Add event listener for right mouse click
renderer.domElement.addEventListener('contextmenu', onCanvasRightClick, false);

// Raycaster for mouse interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function animate() {
    requestAnimationFrame(animate);

    // Update the vehicle position if it is moving
    if (isMoving) {
        moveVehicle();
        updatePath(); // Call the function to update the path
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();
