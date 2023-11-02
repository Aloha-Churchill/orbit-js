import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'dat.gui';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const renderer = new THREE.WebGLRenderer();

renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
camera.position.z = 5;

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();


const gui = new GUI();
const params_folder = gui.addFolder('Parameters');
const input_params = {
    articulation_angle: 0,
    vehicle_width: 1,
    zone1_area: 1,
    vehicle_length: 1,
    velocity: 1
};

params_folder.add(input_params, 'articulation_angle', -Math.PI/2, Math.PI/2, 0.01).onChange(update_params);
params_folder.add(input_params, 'vehicle_width', 0, 10).onChange(update_params);
params_folder.add(input_params, 'vehicle_length', 0, 10).onChange(update_params);
params_folder.add(input_params, 'zone1_area', 0, 10).onChange(update_params);
params_folder.add(input_params, 'velocity', 0, 10).onChange(update_params);
params_folder.open();

// Global Variables
let r0, r1, r2, r3, r4, ICC;
const DELTA_TIME = 1;
// Initial state of the vehicle
let vehicle_position = new THREE.Vector3(0, 0, 0); // Starting at the origin
let vehicle_orientation = 0; // Starting with 0 orientation (facing positive y-axis direction)


function clear_scene() {
    while(scene.children.length > 0){ 
        let child = scene.children[0];
        if (child.geometry) {
            child.geometry.dispose();
        }
        if (child.material) {
            child.material.dispose();
        }
        scene.remove(child); 
    }
} 

function update_params() {
    clear_scene();
    show_vehicle();
    find_ICC();
}



function show_vehicle() {

    const vehicle_geometry = new THREE.BoxGeometry( input_params.vehicle_width, input_params.vehicle_length, 0);
    const vehicle_material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    const vehicle = new THREE.Mesh( vehicle_geometry, vehicle_material );
    scene.add( vehicle );
    vehicle.position.add(new THREE.Vector3(input_params.vehicle_width/2, -input_params.vehicle_length/2, 0));

    // add front wheels to vehicle that can tilt based on articulation angle represented by line segments
    const wheel_length = input_params.vehicle_length/10;
    const offset_x = Math.sin(input_params.articulation_angle)*wheel_length;
    const offset_y = Math.cos(input_params.articulation_angle)*wheel_length;

    const left_wheel = new THREE.BufferGeometry().setFromPoints( [new THREE.Vector3(- offset_x, -offset_y, 0), new THREE.Vector3(offset_x, offset_y, 0)] );
    const right_wheel = new THREE.BufferGeometry().setFromPoints( [new THREE.Vector3(input_params.vehicle_width - offset_x, -offset_y, 0), new THREE.Vector3(input_params.vehicle_width + offset_x, offset_y, 0)] );
    const wheel_material = new THREE.LineBasicMaterial( { color: 0xff00ff } );
    wheel_material.linewidth = 20;
    const left_wheel_line = new THREE.Line( left_wheel, wheel_material );
    const right_wheel_line = new THREE.Line( right_wheel, wheel_material );
    scene.add( left_wheel_line );
    scene.add( right_wheel_line );
    
}


function find_ICC() {
    r1 = input_params.vehicle_length/Math.tan(input_params.articulation_angle) ?? Infinity;

    if (r1 === Infinity) {
        r4 = Infinity;
        r3 = Infinity;
        r2 = Infinity;
        r0 = Infinity;
        ICC = new THREE.Vector3(Infinity, -input_params.vehicle_length, 0);
    }
    else {
        r4 = Math.sqrt(Math.pow(r1, 2) - Math.pow(input_params.vehicle_length,2));
        r3 = r4 + input_params.vehicle_width;
        r2 = Math.sqrt(Math.pow(r3,2) + Math.pow(input_params.vehicle_length,2));
        r0 = Math.sqrt(Math.pow(input_params.vehicle_length,2) + Math.pow(input_params.vehicle_width/2 + r4,2));
        ICC = input_params.articulation_angle > 0 ? new THREE.Vector3(r3, -input_params.vehicle_length, 0) : new THREE.Vector3(-r4, -input_params.vehicle_length, 0);    
    }

    // draw ICC as circle
    const circle_geometry = new THREE.CircleGeometry( 0.1, 32 );
    const circle_material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
    const circle = new THREE.Mesh( circle_geometry, circle_material );
    circle.position.add(ICC);
    scene.add( circle );

    // draw lines from ICC to vehicle upper wheel and lower wheel
    const ICC_to_upper_wheel = new THREE.BufferGeometry().setFromPoints( [ICC, new THREE.Vector3(input_params.vehicle_width, 0, 0)] );
    const ICC_to_lower_wheel = new THREE.BufferGeometry().setFromPoints( [ICC, new THREE.Vector3(0, 0, 0)] );
    const ICC_to_middle = new THREE.BufferGeometry().setFromPoints( [ICC, new THREE.Vector3(input_params.vehicle_width/2, 0, 0)] );
    const ICC_to_upper_wheel_line = new THREE.Line( ICC_to_upper_wheel, circle_material );
    const ICC_to_lower_wheel_line = new THREE.Line( ICC_to_lower_wheel, circle_material );
    const ICC_to_middle_line = new THREE.Line( ICC_to_middle, circle_material );
    scene.add( ICC_to_upper_wheel_line );
    scene.add( ICC_to_lower_wheel_line );
    scene.add( ICC_to_middle_line );

    // add two arcs around ICC with radius r1 and r2
    const curve1 = new THREE.EllipseCurve( ICC.x, ICC.y, r1, r1, 0, 2*Math.PI, input_params.articulation_angle > 0 ? true: true, 0 );
    const curve2 = new THREE.EllipseCurve( ICC.x, ICC.y, r2, r2, 0, 2*Math.PI,  input_params.articulation_angle > 0 ? true: true, 0 );
    const points1 = curve1.getPoints( 50 );
    const points2 = curve2.getPoints( 50 );
    const geometry1 = new THREE.BufferGeometry().setFromPoints( points1 );
    const geometry2 = new THREE.BufferGeometry().setFromPoints( points2 );
    const material = new THREE.LineBasicMaterial( { color : 0xffff00 } );
    const ellipse1 = new THREE.Line( geometry1, material );
    const ellipse2 = new THREE.Line( geometry2, material );
    scene.add( ellipse1 );
    scene.add( ellipse2 );
}


function find_vehicle_position() {
    let vehicle_x_offset, vehicle_y_offset;
    if (input_params.articulation_angle === 0) {
        vehicle_x_offset = input_params.vehicle_width/2;
        vehicle_y_offset = input_params.velocity*DELTA_TIME;
    }
    else {
        // // calculate position of vehicle
        const phi_0 = Math.asin(input_params.vehicle_length/r0);
        const omega = input_params.velocity / r0; // Angular velocity (rad/s)
        const theta = omega * DELTA_TIME; // Angle of rotation (rad)
        const ICC_x_offset = Math.cos(phi_0 + theta) * r0;
        const ICC_y_offset = Math.sin(phi_0 + theta) * r0;
    
        vehicle_x_offset = ICC.x - ICC_x_offset;
        vehicle_y_offset = ICC.y + ICC_y_offset;
    }

    // plot point of vehicle (x, y,0) in red
    const vehicle_point_geometry = new THREE.CircleGeometry( 0.1, 32 );
    const vehicle_point_material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
    const vehicle_point = new THREE.Mesh( vehicle_point_geometry, vehicle_point_material );
    vehicle_point.position.add(new THREE.Vector3(vehicle_x_offset, vehicle_y_offset, 0));
    scene.add( vehicle_point );
}

show_vehicle();
find_ICC();

function animate() {
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
    controls.update();
    find_vehicle_position();

}

animate();