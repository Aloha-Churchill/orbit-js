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
    vehicle_length: 1
};

params_folder.add(input_params, 'articulation_angle', -Math.PI/2, Math.PI/2, 0.01).onChange(update_params);
params_folder.add(input_params, 'vehicle_width', 0, 10).onChange(update_params);
params_folder.add(input_params, 'vehicle_length', 0, 10).onChange(update_params);
params_folder.add(input_params, 'zone1_area', 0, 10).onChange(update_params);
params_folder.open();


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
    calculate_zone1();
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

function calculate_zone1() {
    const zone1_height = input_params.zone1_area/input_params.vehicle_width;
    const r1 = input_params.vehicle_length/Math.tan(input_params.articulation_angle) ?? Infinity;

    let ICC, r2, r3, r4;
    if (r1 === Infinity) {
        r4 = Infinity;
        r3 = Infinity;
        r2 = Infinity;
        ICC = new THREE.Vector3(Infinity, -input_params.vehicle_length, 0);
    }
    else {
        r4 = Math.sqrt(Math.pow(r1, 2) - Math.pow(input_params.vehicle_length,2));
        r3 = r4 + input_params.vehicle_width;
        r2 = Math.sqrt(Math.pow(r3,2) + Math.pow(input_params.vehicle_length,2));
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
    const ICC_to_upper_wheel_line = new THREE.Line( ICC_to_upper_wheel, circle_material );
    const ICC_to_lower_wheel_line = new THREE.Line( ICC_to_lower_wheel, circle_material );
    scene.add( ICC_to_upper_wheel_line );
    scene.add( ICC_to_lower_wheel_line );

    // add two circles around ICC with radius r1 and r2
    // const circle1_geometry = new THREE.CircleGeometry( r1, 32 );
    // const circle2_geometry = new THREE.CircleGeometry( r2, 32 );
    // const circle1 = new THREE.Line( circle1_geometry, circle_material );
    // const circle2 = new THREE.Line( circle2_geometry, circle_material );
    // circle1.position.add(ICC);
    // circle2.position.add(ICC);
    // scene.add( circle1 );
    // scene.add( circle2 );

    // caluclate helper angles
    const theta_1 = Math.acos(r3/r2);
    const theta_2 = Math.acos(r4/r1) - theta_1;
    var theta_3 = Math.PI/4;
    // var ZONE_AREA = Infinity;
    // while (Math.abs(ZONE_AREA - input_params.zone1_area) > 0.1) {
    //     ZONE_AREA = 0.5*(theta_2 + theta_3)*Math.pow(r2, 2) - 0.5*r1*r2*Math.sin(theta_2) - 0.5*theta_3*Math.pow(r1, 2);
    //     const scale_factor = Math.abs(input_params.zone1_area - ZONE_AREA)
    //     theta_3 = theta_3 / scale_factor;
    // }
    // // var theta_3 = Math.PI/4;
    const ZONE_AREA = 0.5*(theta_2 + theta_3)*Math.pow(r2, 2) - 0.5*r1*r2*Math.sin(theta_2) - 0.5*theta_3*Math.pow(r1, 2);
    console.log("ZONE_AREA: ", ZONE_AREA);
    const scale_factor = Math.abs(input_params.zone1_area - ZONE_AREA)
    var theta_3 = theta_3 / scale_factor;

    // add two arcs around ICC with radius r1 and r2
    const start_angle1 = input_params.articulation_angle > 0 ? Math.PI - (theta_1 + theta_2) : theta_1 + theta_2;
    const end_angle1 = input_params.articulation_angle > 0 ? Math.PI - (theta_1 + theta_2) - theta_3 : theta_1 + theta_2 + theta_3;
    const start_angle2 = input_params.articulation_angle > 0 ? Math.PI - theta_1 : Math.PI - (theta_1 + theta_2) - theta_3;
    const end_angle2 = input_params.articulation_angle > 0 ? Math.PI - (theta_1 + theta_2) - theta_3 : Math.PI - (theta_1 + theta_2) - theta_3;

    const curve1 = new THREE.EllipseCurve( ICC.x, ICC.y, r1, r1, start_angle1, end_angle1, input_params.articulation_angle > 0 ? true: true, 0 );
    const curve2 = new THREE.EllipseCurve( ICC.x, ICC.y, r2, r2, start_angle2, end_angle2,  input_params.articulation_angle > 0 ? true: true, 0 );
    const points1 = curve1.getPoints( 50 );
    const points2 = curve2.getPoints( 50 );
    const geometry1 = new THREE.BufferGeometry().setFromPoints( points1 );
    const geometry2 = new THREE.BufferGeometry().setFromPoints( points2 );
    const material = new THREE.LineBasicMaterial( { color : 0xffff00 } );
    const ellipse1 = new THREE.Line( geometry1, material );
    const ellipse2 = new THREE.Line( geometry2, material );
    scene.add( ellipse1 );
    scene.add( ellipse2 );

    const zone1_vertices = {
        bottom_left: new THREE.Vector3(0, 0, 0),
        bottom_right: new THREE.Vector3(input_params.vehicle_width, 0, 0),
        top_right: new THREE.Vector3(input_params.vehicle_width, zone1_height, 0),
        top_left: new THREE.Vector3(0, zone1_height, 0)
    };

    // draw planar lines
    const horizontal_lower = new THREE.BufferGeometry().setFromPoints( [zone1_vertices.bottom_left, zone1_vertices.bottom_right] );
    const horizontal_upper = new THREE.BufferGeometry().setFromPoints( [zone1_vertices.top_left, zone1_vertices.top_right] );
    const horizontal_material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
    const horizontal_lower_line = new THREE.Line( horizontal_lower, horizontal_material );
    const horizontal_upper_line = new THREE.Line( horizontal_upper, horizontal_material );
    scene.add( horizontal_lower_line );
    scene.add( horizontal_upper_line );

    // draw radial lines
    const vertical_left = new THREE.BufferGeometry().setFromPoints( [zone1_vertices.bottom_left, zone1_vertices.top_left] );
    const vertical_right = new THREE.BufferGeometry().setFromPoints( [zone1_vertices.bottom_right, zone1_vertices.top_right] );
    const vertical_material = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
    const vertical_left_line = new THREE.Line( vertical_left, vertical_material );
    const vertical_right_line = new THREE.Line( vertical_right, vertical_material );
    scene.add( vertical_left_line );
    scene.add( vertical_right_line );

}

show_vehicle();
calculate_zone1();

function animate() {
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
    controls.update();

}

animate();