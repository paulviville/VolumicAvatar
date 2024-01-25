import CMap0 from './CMapJS/CMap/CMap0.js';
import Graph from './CMapJS/CMap/Graph.js';
import IncidenceGraph from './CMapJS/CMap/IncidenceGraph.js';
import Renderer from './CMapJS/Rendering/Renderer.js';
import * as THREE from './CMapJS/Libs/three.module.js';
import { OrbitControls } from './CMapJS/Libs/OrbitsControls.js';
import Skeleton, {Key, SkeletonRenderer } from './Skeleton.js';
import {DualQuaternion} from './DualQuaternion.js';
import CMap3 from './CMapJS/CMap/CMap3.js'
import { cutAllEdges, quadrangulateAllFaces } from './CMapJS/Utils/Subdivision.js';
import RendererDarts from '../CMapJS/Rendering/RendererDarts.js';
import FBXImporter from './FBXImport.js';

import { controllers, GUI } from './CMapJS/Libs/dat.gui.module.js';
import { CMap2 } from './CMapJS/CMap/CMap.js';


const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000.0);
camera.position.set(0, 200, 250);
// camera.position.set(10, 10.5, 11.5);
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

let ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
let pointLight0 = new THREE.PointLight(0xffffff, 1);
pointLight0.position.set(100,80,50);
scene.add(pointLight0);


const orbit_controls = new OrbitControls(camera, renderer.domElement)
orbit_controls.target.set(0, 100, 0)
orbit_controls.update()


window.addEventListener('resize', function() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

window.camera = function() {
	console.log(camera.position)
	console.log(camera)
}


let cmaps = [];
let cmapRenderers = [];
let skeletonRenderer;
let fbxImporter;
let skeleton;
const hexMesh = new CMap3();
let hexRenderer;

const gui = new GUI({autoPlace: true, hideable: false});

const guiParams = {
	currentTime: -1,
	timeRange: {first: undefined, last: undefined},
	tPose: function() {
		this.currentTime = -1;
		this.update();
	},
	updateSkeleton: function() {
		skeletonRenderer.computePositions(this.currentTime);
		skeleton.computeOffsets()
		skeletonRenderer.updateEdges();
		// skeletonRenderer.updateVertices();
	},
	updateSkin: function() {
		cmaps.forEach(cmap => {
			const position = cmap.getAttribute(cmap.vertex, "position");
			const weights = cmap.getAttribute(cmap.vertex, "weights");
			const bind = cmap.getAttribute(cmap.vertex, "bind");

			cmap.foreach(cmap.vertex, vd => {
				const vid = cmap.cell(cmap.vertex, vd);
				let pb = bind[vid].clone();
				let dqBlend = new DualQuaternion(new THREE.Quaternion(0,0,0,0), new THREE.Quaternion(0,0,0,0));
				for(let w = 0; w < weights[vid].length; ++w) {
					let b = weights[vid][w];
					let off = skeleton.getOffset(b.b);
					dqBlend.addScaledDualQuaternion(off, b.w);
				}
				dqBlend.normalize();
				let pdq = DualQuaternion.setFromTranslation(pb);
				pdq.multiplyDualQuaternions(dqBlend, pdq);
				position[vid].copy(pdq.transform(new THREE.Vector3));
			});
		});

		cmapRenderers.forEach(renderer => {
			renderer.vertices.update()
		});
	},

	updateScaffold: function() {
		const weights = scaffold.getAttribute(scaffold.vertex, "weights");
		const position = scaffold.getAttribute(scaffold.vertex, "position");
		const bind = scaffold.getAttribute(scaffold.vertex, "bind");

		scaffold.foreach(scaffold.vertex, vd => {
			const vid = scaffold.cell(scaffold.vertex, vd);
			let pb = bind[vid].clone();
			let dqBlend = new DualQuaternion(new THREE.Quaternion(0,0,0,0), new THREE.Quaternion(0,0,0,0));
			if(weights[vid] == undefined)
				return
			
			for(let w = 0; w < weights[vid]?.length ?? 0; ++w) {
				let b = weights[vid][w];
				let off = skeleton.getOffset(b.b);
				dqBlend.addScaledDualQuaternion(off, b.w);
			}
			dqBlend.normalize();
			let pdq = DualQuaternion.setFromTranslation(pb);
			pdq.multiplyDualQuaternions(dqBlend, pdq);
			position[vid].copy(pdq.transform(new THREE.Vector3));
		});

		scaffoldRenderer.vertices.update()
		scaffoldRenderer.edges.update()
	},

	updateHexes: function() {
		const weights = hexMesh.getAttribute(hexMesh.vertex, "weights");
		const position = hexMesh.getAttribute(hexMesh.vertex, "position");
		const bind = hexMesh.getAttribute(hexMesh.vertex, "bind");

		hexMesh.foreach(hexMesh.vertex, vd => {
			const vid = hexMesh.cell(hexMesh.vertex, vd);
			let pb = bind[vid].clone();
			let dqBlend = new DualQuaternion(new THREE.Quaternion(0,0,0,0), new THREE.Quaternion(0,0,0,0));
			if(weights[vid] == undefined)
				return
			
			for(let w = 0; w < weights[vid]?.length ?? 0; ++w) {
				let b = weights[vid][w];
				let off = skeleton.getOffset(b.b);
				dqBlend.addScaledDualQuaternion(off, b.w);
			}
			dqBlend.normalize();
			let pdq = DualQuaternion.setFromTranslation(pb);
			pdq.multiplyDualQuaternions(dqBlend, pdq);
			position[vid].copy(pdq.transform(new THREE.Vector3));
		});

		hexRenderer.vertices.update()
		hexRenderer.edges.update()
	},

	update: function() {
		this.updateSkeleton();
		// this.updateSkin();
		this.updateScaffold();
		this.updateHexes();
	},
	loop: false,
	speed: 1.0,
	loopFunc: function() {
		this.currentTime += (this.timeRange.last - this.timeRange.first) / (100/this.speed);
		this.currentTime *= this.currentTime >= this.timeRange.last ? 0 : 1;
		this.update();
	},
	/// showSkin
	/// showSkeleton
	/// vertexSize : skin + skel
	/// edgeSize : skin + skel
}

window.skin = guiParams.updateSkin;
window.scaffold = guiParams.updateScaffold;

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const scaffold = new CMap2();

scaffold.createEmbedding(scaffold.vertex);
const scaffoldPosition = scaffold.addAttribute(scaffold.vertex, "position");
const scaffoldHDart = scaffold.addAttribute(scaffold.dart, "hDart");
const scaffoldBind = scaffold.addAttribute(scaffold.vertex, "bind");
const scaffoldWeight = scaffold.addAttribute(scaffold.vertex, "weights");
const scaffoldRenderer = new Renderer(scaffold);



function testScaffold() {

	const boneScaffold = skeleton.newBoneAttribute("scaffold");

	const hips = skeleton.getBone("Hips");
	const spine = skeleton.getBone("Spine");
	const spine1 = skeleton.getBone("Spine1");
	const spine2 = skeleton.getBone("Spine2");
	const neck = skeleton.getBone("Neck");
	const head = skeleton.getBone("Head");

	const rightUpLeg = skeleton.getBone("RightUpLeg");
	const rightLeg = skeleton.getBone("RightLeg");
	const rightFoot = skeleton.getBone("RightFoot");
	const rightToeBase = skeleton.getBone("RightToeBase");
	const rightToe_End = skeleton.getBone("RightToe_End");
	const rightArm = skeleton.getBone("RightArm");
	const rightForeArm = skeleton.getBone("RightForeArm");
	const rightHand = skeleton.getBone("RightHand");
	const rightShoulder = skeleton.getBone("RightShoulder");

	const leftUpLeg = skeleton.getBone("LeftUpLeg");
	const leftLeg = skeleton.getBone("LeftLeg");
	const leftFoot = skeleton.getBone("LeftFoot");
	const leftToeBase = skeleton.getBone("LeftToeBase");
	const leftToe_End = skeleton.getBone("LeftToe_End");
	const leftArm = skeleton.getBone("LeftArm");
	const leftForeArm = skeleton.getBone("LeftForeArm");
	const leftHand = skeleton.getBone("LeftHand");
	const leftShoulder = skeleton.getBone("LeftShoulder");

	// const sphereGeometry = new THREE.SphereBufferGeometry(3, 10, 10);
	// const sphereMaterial = new THREE.MeshLambertMaterial({color: 0x0000FF});
	// const rightUpSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
	// rightUpSphere.position.copy(skeleton.getWorldTransform(rightUpLeg).transform(new THREE.Vector3))
	// const spineSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
	// spineSphere.position.copy(skeleton.getWorldTransform(head).transform(new THREE.Vector3))
	// // scene.add(rightUpSphere)
	// // scene.add(spineSphere)

	/// hips
	const hipsPosition = skeleton.getWorldTransform(hips).transform(new THREE.Vector3);
	let fd0 = scaffold.addFace(8);
	boneScaffold[hips] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = hipsPosition.clone()
		.addScaledVector(X, 10).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = hipsPosition.clone()
		.addScaledVector(X, 3).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = hipsPosition.clone()
		.addScaledVector(X, -3).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1], fd0))] = hipsPosition.clone()
		.addScaledVector(X, -10).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1], fd0))] = hipsPosition.clone()
		.addScaledVector(X, -10).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1], fd0))] = hipsPosition.clone()
		.addScaledVector(X, -3).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1,1], fd0))] = hipsPosition.clone()
		.addScaledVector(X, 3).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = hipsPosition.clone()
		.addScaledVector(X, 10).addScaledVector(Z, -5);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: hips, w: 1}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: hips, w: 1}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: hips, w: 1}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1], fd0))] = [{b: hips, w: 1}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1], fd0))] = [{b: hips, w: 1}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1], fd0))] = [{b: hips, w: 1}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1,1], fd0))] = [{b: hips, w: 1}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: hips, w: 1}]


	/// spine
	const spinePosition = skeleton.getWorldTransform(spine).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(8);
	boneScaffold[spine] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = spinePosition.clone()
		.addScaledVector(X, 10).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = spinePosition.clone()
		.addScaledVector(X, 3).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = spinePosition.clone()
		.addScaledVector(X, -3).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1], fd0))] = spinePosition.clone()
		.addScaledVector(X, -10).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1], fd0))] = spinePosition.clone()
		.addScaledVector(X, -10).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1], fd0))] = spinePosition.clone()
		.addScaledVector(X, -3).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1,1], fd0))] = spinePosition.clone()
		.addScaledVector(X, 3).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = spinePosition.clone()
		.addScaledVector(X, 10).addScaledVector(Z, -5);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: hips, w: 0.45}, {b: spine, w: 0.35}, {b: spine1, w: 0.20}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: hips, w: 0.57}, {b: spine, w: 0.30}, {b: spine1, w: 0.13}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: hips, w: 0.57}, {b: spine, w: 0.30}, {b: spine1, w: 0.13}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1], fd0))] = [{b: hips, w: 0.45}, {b: spine, w: 0.35}, {b: spine1, w: 0.20}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1], fd0))] = [{b: hips, w: 0.37}, {b: spine, w: 0.40}, {b: spine1, w: 0.23}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1], fd0))] = [{b: hips, w: 0.45}, {b: spine, w: 0.36}, {b: spine1, w: 0.19}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1,1], fd0))] = [{b: hips, w: 0.45}, {b: spine, w: 0.36}, {b: spine1, w: 0.19}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: hips, w: 0.37}, {b: spine, w: 0.40}, {b: spine1, w: 0.23}]

	/// spine1
	const spine1Position = skeleton.getWorldTransform(spine1).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(8);
	boneScaffold[spine1] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = spine1Position.clone()
		.addScaledVector(X, 10).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = spine1Position.clone()
		.addScaledVector(X, 3).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = spine1Position.clone()
		.addScaledVector(X, -3).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1], fd0))] = spine1Position.clone()
		.addScaledVector(X, -10).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1], fd0))] = spine1Position.clone()
		.addScaledVector(X, -10).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1], fd0))] = spine1Position.clone()
		.addScaledVector(X, -3).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1,1], fd0))] = spine1Position.clone()
		.addScaledVector(X, 3).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = spine1Position.clone()
		.addScaledVector(X, 10).addScaledVector(Z, -5);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: hips, w: 0.01}, {b: spine, w: 0.33}, {b: spine1, w: 0.54}, {b: spine2, w: 0.12}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: hips, w: 0.03}, {b: spine, w: 0.37}, {b: spine1, w: 0.48}, {b: spine2, w: 0.12}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: hips, w: 0.03}, {b: spine, w: 0.37}, {b: spine1, w: 0.48}, {b: spine2, w: 0.12}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1], fd0))] = [{b: hips, w: 0.01}, {b: spine, w: 0.33}, {b: spine1, w: 0.54}, {b: spine2, w: 0.12}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1], fd0))] = [{b: hips, w: 0.0}, {b: spine, w: 0.22}, {b: spine1, w: 0.65}, {b: spine2, w: 0.13}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1], fd0))] = [{b: hips, w: 0.0}, {b: spine, w: 0.22}, {b: spine1, w: 0.64}, {b: spine2, w: 0.14}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1,1], fd0))] = [{b: hips, w: 0.0}, {b: spine, w: 0.22}, {b: spine1, w: 0.64}, {b: spine2, w: 0.14}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: hips, w: 0.0}, {b: spine, w: 0.22}, {b: spine1, w: 0.65}, {b: spine2, w: 0.13}]


	/// spine2
	const spine2Position = skeleton.getWorldTransform(spine2).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(8);
	boneScaffold[spine2] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = spine2Position.clone()
		.addScaledVector(X, 14).addScaledVector(Y, 3).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = spine2Position.clone()
		.addScaledVector(X, 5).addScaledVector(Y, 3).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = spine2Position.clone()
		.addScaledVector(X, -5).addScaledVector(Y, 3).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1], fd0))] = spine2Position.clone()
		.addScaledVector(X, -14).addScaledVector(Y, 3).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1], fd0))] = spine2Position.clone()
		.addScaledVector(X, -14).addScaledVector(Y, 3).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1], fd0))] = spine2Position.clone()
		.addScaledVector(X, -5).addScaledVector(Y, 3).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1,1], fd0))] = spine2Position.clone()
		.addScaledVector(X, 5).addScaledVector(Y, 3).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = spine2Position.clone()
		.addScaledVector(X, 14).addScaledVector(Y, 3).addScaledVector(Z, -5);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: leftShoulder, w: 0.11}, {b: spine2, w: 0.83}, {b: spine1, w: 0.06}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: spine2, w: 1}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: spine2, w: 1}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1], fd0))] = [{b: rightShoulder, w: 0.11}, {b: spine2, w: 0.83}, {b: spine1, w: 0.06}]
	
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1], fd0))] = [{b: spine2, w: 0.64}, {b: rightShoulder, w: 0.36}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1], fd0))] = [{b: spine2, w: 0.37}, {b: spine1, w: 0.4}, {b: leftShoulder, w: 0.49}, {b: leftArm, w: 0.10}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1,1,1,1,1], fd0))] = [{b: spine2, w: 0.37}, {b: spine1, w: 0.4}, {b: rightShoulder, w: 0.49}, {b: rightArm, w: 0.10}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: spine2, w: 0.64}, {b: leftShoulder, w: 0.36}]




	/// rightArm
	const rightArmPosition = skeleton.getWorldTransform(rightArm).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[rightArm] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = spine2Position.clone()
		.addScaledVector(X, -14).addScaledVector(Y, 3).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = rightArmPosition.clone()
		.addScaledVector(X, 1).addScaledVector(Y, 3).addScaledVector(Z, 3);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = rightArmPosition.clone()
		.addScaledVector(X, 1).addScaledVector(Y, 3).addScaledVector(Z, -3);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = spine2Position.clone()
		.addScaledVector(X, -14).addScaledVector(Y, 3).addScaledVector(Z, -5);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: rightShoulder, w: 0.11}, {b: spine2, w: 0.83}, {b: spine1, w: 0.06}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: spine2, w: 0.64}, {b: rightShoulder, w: 0.36}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: rightArm, w: 0.59},{b: rightShoulder, w: 0.38},{b: spine2, w: 0.03}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] =[{b: spine2, w: 0.64}, {b: rightShoulder, w: 0.36}]
	

	/// leftArm
	const leftArmPosition = skeleton.getWorldTransform(leftArm).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[leftArm] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = spine2Position.clone()
		.addScaledVector(X, 14).addScaledVector(Y, 3).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = leftArmPosition.clone()
		.addScaledVector(X, 1).addScaledVector(Y, 3).addScaledVector(Z, 3);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = leftArmPosition.clone()
		.addScaledVector(X, 1).addScaledVector(Y, 3).addScaledVector(Z, -3);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = spine2Position.clone()
		.addScaledVector(X, 14).addScaledVector(Y, 3).addScaledVector(Z, -5);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: leftShoulder, w: 0.11}, {b: spine2, w: 0.83}, {b: spine1, w: 0.06}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: spine2, w: 0.64}, {b: leftShoulder, w: 0.36}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: leftArm, w: 0.59},{b: leftShoulder, w: 0.38},{b: spine2, w: 0.03}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: leftArm, w: 0.46},{b: leftShoulder, w: 0.45},{b: spine2, w: 0.8}]
		

	/// neck
	const neckPosition = skeleton.getWorldTransform(neck).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[neck] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = neckPosition.clone()
		.addScaledVector(X, 3.5).addScaledVector(Z, 3.5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = neckPosition.clone()
		.addScaledVector(X, -3.5).addScaledVector(Z, 3.5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = neckPosition.clone()
		.addScaledVector(X, -3.5).addScaledVector(Z, -3.5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = neckPosition.clone()
		.addScaledVector(X, 3.5).addScaledVector(Z, -3.5);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: head, w: 0.02},{b: neck, w: 0.07}, {b: spine2, w: 0.91}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: head, w: 0.02},{b: neck, w: 0.07}, {b: spine2, w: 0.91}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: rightShoulder, w: 0.10}, {b: spine2, w: 0.90}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: leftShoulder, w: 0.10}, {b: spine2, w: 0.90}]
	


	/// head
	const headPosition = skeleton.getWorldTransform(head).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[head] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = headPosition.clone()
		.addScaledVector(X, 3.5).addScaledVector(Z, 3.5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = headPosition.clone()
		.addScaledVector(X, -3.5).addScaledVector(Z, 3.5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = headPosition.clone()
		.addScaledVector(X, -3.5).addScaledVector(Z, -3.5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = headPosition.clone()
		.addScaledVector(X, 3.5).addScaledVector(Z, -3.5);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: head, w: 1}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: head, w: 1}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: head, w: 1}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: head, w: 1}]
	


	/// rightUpLeg
	const rightUpLegPosition = skeleton.getWorldTransform(rightUpLeg).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[rightUpLeg] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = rightUpLegPosition.clone()
		.addScaledVector(X, 5).addScaledVector(Y, -13).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = rightUpLegPosition.clone()
		.addScaledVector(X, -5).addScaledVector(Y, -13).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = rightUpLegPosition.clone()
		.addScaledVector(X, -5).addScaledVector(Y, -13).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = rightUpLegPosition.clone()
		.addScaledVector(X, 5).addScaledVector(Y, -13).addScaledVector(Z, -5);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: hips, w: 0.07}, {b: rightUpLeg, w: 0.93}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: hips, w: 0.06}, {b: rightUpLeg, w: 0.94}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: hips, w: 0.06}, {b: rightUpLeg, w: 0.94}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: hips, w: 0.07}, {b: rightUpLeg, w: 0.86}, {b: leftUpLeg, w: 0.07}]
	

	/// rightLeg
	const rightLegPosition = skeleton.getWorldTransform(rightLeg).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[rightLeg] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = rightLegPosition.clone()
		.addScaledVector(X, 3.5).addScaledVector(Z, 3.5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = rightLegPosition.clone()
		.addScaledVector(X, -3.5).addScaledVector(Z, 3.5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = rightLegPosition.clone()
		.addScaledVector(X, -3.5).addScaledVector(Z, -3.5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = rightLegPosition.clone()
		.addScaledVector(X, 3.5).addScaledVector(Z, -3.5);


	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: rightUpLeg, w: 0.75}, {b: rightLeg, w: 0.25}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: rightUpLeg, w: 0.62}, {b: rightLeg, w: 0.38}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: rightUpLeg, w: 0.62}, {b: rightLeg, w: 0.38}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: rightUpLeg, w: 0.65}, {b: rightLeg, w: 0.35}]
	

	/// rightFoot
	const rightFootPosition = skeleton.getWorldTransform(rightFoot).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[rightFoot] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = rightFootPosition.clone()
		.addScaledVector(X, 2).addScaledVector(Z, 2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = rightFootPosition.clone()
		.addScaledVector(X, -2).addScaledVector(Z, 2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = rightFootPosition.clone()
		.addScaledVector(X, -2).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = rightFootPosition.clone()
		.addScaledVector(X, 2).addScaledVector(Z, -2);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: rightFoot, w: 0.39}, {b: rightLeg, w: 0.61}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: rightFoot, w: 0.37}, {b: rightLeg, w: 0.63}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: rightFoot, w: 0.37}, {b: rightLeg, w: 0.63}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: rightFoot, w: 0.39}, {b: rightLeg, w: 0.59}]
	

	/// rightToeBase
	const rightToeBasePosition = skeleton.getWorldTransform(rightToeBase).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[rightToeBase] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = rightToeBasePosition.clone()
		.addScaledVector(X, 2).addScaledVector(Y, 1);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = rightToeBasePosition.clone()
		.addScaledVector(X, -5).addScaledVector(Y, 1);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = rightToeBasePosition.clone()
		.addScaledVector(X, -5).addScaledVector(Y, -1);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = rightToeBasePosition.clone()
		.addScaledVector(X, 2).addScaledVector(Y, -1);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: rightFoot, w: 0.38}, {b: rightToeBase, w: 0.62}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: rightFoot, w: 0.36}, {b: rightToeBase, w: 0.64}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: rightFoot, w: 0.31}, {b: rightToeBase, w: 0.69}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: rightFoot, w: 0.29}, {b: rightToeBase, w: 0.71}]
	

	/// rightToe_End
	const rightToe_EndPosition = skeleton.getWorldTransform(rightToe_End).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[rightToe_End] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = rightToe_EndPosition.clone()
		.addScaledVector(X, 2).addScaledVector(Y, 1).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = rightToe_EndPosition.clone()
		.addScaledVector(X, -3).addScaledVector(Y, 1).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = rightToe_EndPosition.clone()
		.addScaledVector(X, -3).addScaledVector(Y, -1).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = rightToe_EndPosition.clone()
		.addScaledVector(X, 2).addScaledVector(Y, -1).addScaledVector(Z, -2);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: rightToeBase, w: 0.82}, {b: rightFoot, w: 0.18}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: rightToeBase, w: 0.82}, {b: rightFoot, w: 0.18}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: rightToeBase, w: 0.82}, {b: rightFoot, w: 0.18}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: rightToeBase, w: 0.82}, {b: rightFoot, w: 0.18}]
	

	/// rightForeArm
	const rightForeArmPosition = skeleton.getWorldTransform(rightForeArm).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[rightForeArm] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = rightForeArmPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, -3).addScaledVector(Z, 2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = rightForeArmPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, 3).addScaledVector(Z, 2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = rightForeArmPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, 3).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = rightForeArmPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, -3).addScaledVector(Z, -2);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: rightArm, w: 0.69}, {b: rightForeArm, w: 0.31}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] =[{b: rightArm, w: 0.76}, {b: rightForeArm, w: 0.24}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] =[{b: rightArm, w: 0.79}, {b: rightForeArm, w: 0.21}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] =[{b: rightArm, w: 0.80}, {b: rightForeArm, w: 0.20}]
	

	/// rightHand
	const rightHandPosition = skeleton.getWorldTransform(rightHand).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[rightHand] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = rightHandPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, -2).addScaledVector(Z, 2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = rightHandPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, 2).addScaledVector(Z, 2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = rightHandPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, 2).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = rightHandPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, -2).addScaledVector(Z, -2);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: rightHand, w: 0.65}, {b: rightForeArm, w: 0.35}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] =[{b: rightHand, w: 0.65}, {b: rightForeArm, w: 0.35}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] =[{b: rightHand, w: 0.65}, {b: rightForeArm, w: 0.35}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] =[{b: rightHand, w: 0.65}, {b: rightForeArm, w: 0.35}]

	/// leftUpLeg
	const leftUpLegPosition = skeleton.getWorldTransform(leftUpLeg).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[leftUpLeg] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = leftUpLegPosition.clone()
		.addScaledVector(X, 5).addScaledVector(Y, -13).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = leftUpLegPosition.clone()
		.addScaledVector(X, -5).addScaledVector(Y, -13).addScaledVector(Z, 5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = leftUpLegPosition.clone()
		.addScaledVector(X, -5).addScaledVector(Y, -13).addScaledVector(Z, -5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = leftUpLegPosition.clone()
		.addScaledVector(X, 5).addScaledVector(Y, -13).addScaledVector(Z, -5);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: hips, w: 0.06}, {b: leftUpLeg, w: 0.94}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: hips, w: 0.07}, {b: leftUpLeg, w: 0.93}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: hips, w: 0.07}, {b: leftUpLeg, w: 0.86}, {b: rightUpLeg, w: 0.07}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: hips, w: 0.06}, {b: leftUpLeg, w: 0.94}]

	

	/// leftLeg
	const leftLegPosition = skeleton.getWorldTransform(leftLeg).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[leftLeg] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = leftLegPosition.clone()
		.addScaledVector(X, 3.5).addScaledVector(Z, 3.5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = leftLegPosition.clone()
		.addScaledVector(X, -3.5).addScaledVector(Z, 3.5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = leftLegPosition.clone()
		.addScaledVector(X, -3.5).addScaledVector(Z, -3.5);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = leftLegPosition.clone()
		.addScaledVector(X, 3.5).addScaledVector(Z, -3.5);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: leftUpLeg, w: 0.62}, {b: leftLeg, w: 0.38}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: leftUpLeg, w: 0.75}, {b: leftLeg, w: 0.25}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: leftUpLeg, w: 0.65}, {b: leftLeg, w: 0.35}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: leftUpLeg, w: 0.62}, {b: leftLeg, w: 0.38}]
	

	/// leftFoot
	const leftFootPosition = skeleton.getWorldTransform(leftFoot).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[leftFoot] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = leftFootPosition.clone()
		.addScaledVector(X, 2).addScaledVector(Z, 2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = leftFootPosition.clone()
		.addScaledVector(X, -2).addScaledVector(Z, 2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = leftFootPosition.clone()
		.addScaledVector(X, -2).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = leftFootPosition.clone()
		.addScaledVector(X, 2).addScaledVector(Z, -2);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: leftFoot, w: 0.37}, {b: leftLeg, w: 0.63}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: leftFoot, w: 0.39}, {b: leftLeg, w: 0.61}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: leftFoot, w: 0.39}, {b: leftLeg, w: 0.59}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: leftFoot, w: 0.37}, {b: leftLeg, w: 0.63}]
	
	/// leftToeBase
	const leftToeBasePosition = skeleton.getWorldTransform(leftToeBase).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[leftToeBase] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = leftToeBasePosition.clone()
		.addScaledVector(X, 5).addScaledVector(Y, 1);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = leftToeBasePosition.clone()
		.addScaledVector(X, -2).addScaledVector(Y, 1);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = leftToeBasePosition.clone()
		.addScaledVector(X, -2).addScaledVector(Y, -1);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = leftToeBasePosition.clone()
		.addScaledVector(X, 5).addScaledVector(Y, -1);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: leftFoot, w: 0.36}, {b: leftToeBase, w: 0.64}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: leftFoot, w: 0.38}, {b: leftToeBase, w: 0.62}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: leftFoot, w: 0.29}, {b: leftToeBase, w: 0.71}] 
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] =[{b: leftFoot, w: 0.31}, {b: leftToeBase, w: 0.69}]
	

		
	/// leftToe_End
	const leftToe_EndPosition = skeleton.getWorldTransform(leftToe_End).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[leftToe_End] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = leftToe_EndPosition.clone()
		.addScaledVector(X, 3).addScaledVector(Y, 1).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = leftToe_EndPosition.clone()
		.addScaledVector(X, -2).addScaledVector(Y, 1).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = leftToe_EndPosition.clone()
		.addScaledVector(X, -2).addScaledVector(Y, -1).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = leftToe_EndPosition.clone()
		.addScaledVector(X, 3).addScaledVector(Y, -1).addScaledVector(Z, -2);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: leftToeBase, w: 0.82}, {b: leftFoot, w: 0.18}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = [{b: leftToeBase, w: 0.82}, {b: leftFoot, w: 0.18}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = [{b: leftToeBase, w: 0.82}, {b: leftFoot, w: 0.18}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = [{b: leftToeBase, w: 0.82}, {b: leftFoot, w: 0.18}]
	

	/// leftForeArm
	const leftForeArmPosition = skeleton.getWorldTransform(leftForeArm).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[leftForeArm] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = leftForeArmPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, -3).addScaledVector(Z, 2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = leftForeArmPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, -3).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = leftForeArmPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, 3).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = leftForeArmPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, 3).addScaledVector(Z, 2);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: leftArm, w: 0.69}, {b: leftForeArm, w: 0.31}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] =[{b: leftArm, w: 0.76}, {b: leftForeArm, w: 0.24}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] =[{b: leftArm, w: 0.79}, {b: leftForeArm, w: 0.21}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] =[{b: leftArm, w: 0.80}, {b: leftForeArm, w: 0.20}]
	

	/// leftHand
	const leftHandPosition = skeleton.getWorldTransform(leftHand).transform(new THREE.Vector3);
	fd0 = scaffold.addFace(4);
	boneScaffold[leftHand] = fd0;
	scaffoldPosition[scaffold.cell(scaffold.vertex, fd0)] = leftHandPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, -2).addScaledVector(Z, 2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] = leftHandPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, -2).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] = leftHandPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, 2).addScaledVector(Z, -2);
	scaffoldPosition[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] = leftHandPosition.clone()
		.addScaledVector(X, 0).addScaledVector(Y, 2).addScaledVector(Z, 2);

	scaffoldWeight[scaffold.cell(scaffold.vertex, fd0)] = [{b: leftHand, w: 0.65}, {b: leftForeArm, w: 0.35}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi1[fd0])] =[{b: leftHand, w: 0.65}, {b: leftForeArm, w: 0.35}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi([1,1], fd0))] =[{b: leftHand, w: 0.65}, {b: leftForeArm, w: 0.35}]
	scaffoldWeight[scaffold.cell(scaffold.vertex, scaffold.phi_1[fd0])] =[{b: leftHand, w: 0.65}, {b: leftForeArm, w: 0.35}]
	


	scaffold.foreach(scaffold.vertex, vd => {
		const vid = scaffold.cell(scaffold.vertex, vd);
		scaffoldBind[vid] = scaffoldPosition[vid].clone();
	})


	console.log(boneScaffold)


	scaffoldRenderer.vertices.create({size: 0.5, color: new THREE.Color(0x00FF00)}).addTo(scene);
	scaffoldRenderer.edges.create({size: 80, color: new THREE.Color(0x008800)}).addTo(scene);
	// scaffoldRenderer.faces.create().addTo(scene);


}

function sewVolumes(cmap3, wd0, wd1) {
	const nbEdges = cmap3.codegree(cmap3.face, wd0);
	if(nbEdges != cmap3.codegree(cmap3.face, wd1))
		return;

	if(wd0 != cmap3.phi3[wd0] || wd1 != cmap3.phi3[wd1])
		return;

	let fd0 = wd0;
	let fd1 = wd1;
	for(let i = 0; i < nbEdges; ++i) {
		cmap3.sewPhi3(fd0, fd1);
		fd0 = cmap3.phi1[fd0];
		fd1 = cmap3.phi_1[fd1];
	}
	
	return wd0;
}

function create3Chunk(cmap3) {
	const wd0 = cmap3.addPrism(4, false);
	const wd1 = cmap3.addPrism(4, false);
	const wd2 = cmap3.addPrism(4, false);

	sewVolumes(cmap3, cmap3.phi([1, 2], wd0), cmap3.phi([-1, 2], wd1));
	sewVolumes(cmap3, cmap3.phi([1, 2], wd1), cmap3.phi([-1, 2], wd2));

	return wd0;
};

function create1Chunk(cmap3) {
	const wd0 = cmap3.addPrism(4, false);

	return wd0;
};

function insertTorsoChunk(cmap3, boneLabel0, boneLabel1) {
	const boneScaffold = skeleton.getBoneAttribute("scaffold");

	const bone0 = skeleton.getBone(boneLabel0);
	const bone1 = skeleton.getBone(boneLabel1);

	const wd0 = create3Chunk(cmap3);
	const wd1 = cmap3.phi([1, 2, 3, 2, 1], wd0);
	const wd2 = cmap3.phi([1, 2, 3, 2, 1], wd1);

	const wd0_ = cmap3.phi([-1, -1], wd0)
	const wd1_ = cmap3.phi([-1, -1], wd1)
	const wd2_ = cmap3.phi([-1, -1], wd2)

	///		4 <-- 5 <-- 6 <-- 7
	///		|	  		 	  |
	///		3 --> 2 --> 1 --> 0
	///				    phi2[sd1]

	///		4 --> 5 --> 6 --> 7		4 <-- 5 <-- 6 <-- 7
	///		|	  		 	  |		|	  		 	  |
	///		3 <-- 2 <-- 1 <-- 0		3 --> 2 --> 1 --> 0
	///					  sd0					phi2[sd1]

	let sd0 = boneScaffold[bone0];
	let sd1 = boneScaffold[bone1]; // edge 0-1
	scaffoldHDart[sd0] = cmap3.phi2[wd0];
	sd0 = scaffold.phi1[sd0]; // edge 1-2
	scaffoldHDart[sd0] = cmap3.phi2[wd1];
	sd0 = scaffold.phi1[sd0]; // edge 2-3
	scaffoldHDart[sd0] = cmap3.phi2[wd2];
	sd0 = scaffold.phi1[sd0]; // edge 3-4
	scaffoldHDart[sd0] = cmap3.phi([2,-1], wd2);
	sd0 = scaffold.phi1[sd0]; // edge 4-5
	scaffoldHDart[sd0] = cmap3.phi([2,1,1], wd2);
	sd0 = scaffold.phi1[sd0]; // edge 5-6
	scaffoldHDart[sd0] = cmap3.phi([2,1,1], wd1);
	sd0 = scaffold.phi1[sd0]; // edge 6-7
	scaffoldHDart[sd0] = cmap3.phi([2,1,1], wd0);
	sd0 = scaffold.phi1[sd0]; // edge 7-0
	scaffoldHDart[sd0] = cmap3.phi([2,1], wd0);
	sd0 = scaffold.phi1[sd0];

	sd1 = scaffold.phi2[sd1]; // edge 1-0
	scaffoldHDart[sd1] = cmap3.phi2[wd0_];
	sd1 = scaffold.phi1[sd1]; // edge 0-7
	scaffoldHDart[sd1] = cmap3.phi([2,-1], wd0_);
	sd1 = scaffold.phi1[sd1]; // edge 7-6
	scaffoldHDart[sd1] = cmap3.phi([2,1,1], wd0_);
	sd1 = scaffold.phi1[sd1]; // edge 6-5
	scaffoldHDart[sd1] = cmap3.phi([2,1,1], wd1_);
	sd1 = scaffold.phi1[sd1]; // edge 5-4
	scaffoldHDart[sd1] = cmap3.phi([2,1,1], wd2_);
	sd1 = scaffold.phi1[sd1]; // edge 4-3
	scaffoldHDart[sd1] = cmap3.phi([2,1], wd2_);
	sd1 = scaffold.phi1[sd1]; // edge 3-2
	scaffoldHDart[sd1] = cmap3.phi2[wd2_];
	sd1 = scaffold.phi1[sd1]; // edge 2-1
	scaffoldHDart[sd1] = cmap3.phi2[wd1_];
	sd1 = scaffold.phi1[sd1]; 

	return wd0;

}

function insertHipsChunk(cmap3, leftLegLabel, rightLegLabel, hipsLabel) {
	const boneScaffold = skeleton.getBoneAttribute("scaffold");

	const leftLeg = skeleton.getBone(leftLegLabel);
	const rightLeg = skeleton.getBone(rightLegLabel);
	const hips = skeleton.getBone(hipsLabel);

	const wd0 = create3Chunk(cmap3);
	const wd1 = cmap3.phi([1, 2, 3, 2, 1], wd0);
	const wd2 = cmap3.phi([1, 2, 3, 2, 1], wd1);

	const wd0_ = cmap3.phi([-1, -1], wd0)
	const wd1_ = cmap3.phi([-1, -1], wd1)
	const wd2_ = cmap3.phi([-1, -1], wd2)

	///		4 <-- 5 <-- 6 <-- 7
	///		|	  		 	  |
	///		3 --> 2 --> 1 --> 0
	///				    phi2[sd2]

	///		2 --> 3     2 --> 3	
	///		|	  |		| 	  |	
	///		1 <-- 0     1 <-- 0	
	///		  sd1		  sd0	


	let sd0 = boneScaffold[leftLeg];
	let sd1 = boneScaffold[rightLeg]; 
	let sd2 = boneScaffold[hips]; 

	scaffoldHDart[sd0] = cmap3.phi2[wd0];
	sd0 = scaffold.phi1[sd0]; // edge 1-2
	scaffoldHDart[sd0] = cmap3.phi([2,-1], wd0);
	sd0 = scaffold.phi1[sd0]; // edge 2-3
	scaffoldHDart[sd0] = cmap3.phi([2,1,1], wd0);
	sd0 = scaffold.phi1[sd0]; // edge 3-0
	scaffoldHDart[sd0] = cmap3.phi([2,1], wd0);
	sd0 = scaffold.phi1[sd0];

	scaffoldHDart[sd1] = cmap3.phi2[wd2];
	sd1 = scaffold.phi1[sd1]; // edge 1-2
	scaffoldHDart[sd1] = cmap3.phi([2,-1], wd2);
	sd1 = scaffold.phi1[sd1]; // edge 2-3
	scaffoldHDart[sd1] = cmap3.phi([2,1,1], wd2);
	sd1 = scaffold.phi1[sd1]; // edge 3-0
	scaffoldHDart[sd1] = cmap3.phi([2,1], wd2);
	sd1 = scaffold.phi1[sd1];

	sd2 = scaffold.phi2[sd2]; // edge 1-0
	scaffoldHDart[sd2] = cmap3.phi2[wd0_];
	sd2 = scaffold.phi1[sd2]; // edge 0-7
	scaffoldHDart[sd2] = cmap3.phi([2,-1], wd0_);
	sd2 = scaffold.phi1[sd2]; // edge 7-6
	scaffoldHDart[sd2] = cmap3.phi([2,1,1], wd0_);
	sd2 = scaffold.phi1[sd2]; // edge 6-5
	scaffoldHDart[sd2] = cmap3.phi([2,1,1], wd1_);
	sd2 = scaffold.phi1[sd2]; // edge 5-4
	scaffoldHDart[sd2] = cmap3.phi([2,1,1], wd2_);
	sd2 = scaffold.phi1[sd2]; // edge 4-3
	scaffoldHDart[sd2] = cmap3.phi([2,1], wd2_);
	sd2 = scaffold.phi1[sd2]; // edge 3-2
	scaffoldHDart[sd2] = cmap3.phi2[wd2_];
	sd2 = scaffold.phi1[sd2]; // edge 2-1
	scaffoldHDart[sd2] = cmap3.phi2[wd1_];
	sd2 = scaffold.phi1[sd2]; 




	return wd0;

}

function insertShouldersChunk(cmap3, spineLabel, leftArmLabel, rightArmLabel, neckLabel) {
	const boneScaffold = skeleton.getBoneAttribute("scaffold");

	const spine = skeleton.getBone(spineLabel);
	const leftArm = skeleton.getBone(leftArmLabel);
	const rightArm = skeleton.getBone(rightArmLabel);
	const neck = skeleton.getBone(neckLabel);

	const wd0 = create3Chunk(cmap3);
	const wd1 = cmap3.phi([1, 2, 3, 2, 1], wd0);
	const wd2 = cmap3.phi([1, 2, 3, 2, 1], wd1);

	const wd0_ = cmap3.phi([-1, -1], wd0)
	const wd1_ = cmap3.phi([-1, -1], wd1)
	const wd2_ = cmap3.phi([-1, -1], wd2)

	///				      2 <-- 3 
	///					  |	    |	
	///					  1 --> 0 
	///					  phi2[sd3]	

	///		2 --> 3	 4 --> 5 --> 6 --> 7  1 --> 2
	///		|	  |	 |	  		 	   |  | sd2	|
	///		1 <-- 0  3 <-- 2 <-- 1 <-- 0  0 <-- 3
	///		  sd1		            sd0	


	let sd0 = boneScaffold[spine];
	let sd1 = boneScaffold[rightArm]; 
	let sd2 = boneScaffold[leftArm]; 
	let sd3 = boneScaffold[neck]; 

	scaffoldHDart[sd0] = cmap3.phi2[wd0];
	sd0 = scaffold.phi1[sd0]; // edge 1-2
	scaffoldHDart[sd0] = cmap3.phi2[wd1];
	sd0 = scaffold.phi1[sd0]; // edge 2-3
	scaffoldHDart[sd0] = cmap3.phi2[wd2];
	sd0 = scaffold.phi1[sd0]; // edge 3-4
	scaffoldHDart[sd0] = cmap3.phi([2,-1], wd2);
	sd0 = scaffold.phi1[sd0]; // edge 4-5
	scaffoldHDart[sd0] = cmap3.phi([2,1,1], wd2);
	sd0 = scaffold.phi1[sd0]; // edge 5-6
	scaffoldHDart[sd0] = cmap3.phi([2,1,1], wd1);
	sd0 = scaffold.phi1[sd0]; // edge 6-7
	scaffoldHDart[sd0] = cmap3.phi([2,1,1], wd0);
	sd0 = scaffold.phi1[sd0]; // edge 7-0
	scaffoldHDart[sd0] = cmap3.phi([2,1], wd0);
	sd0 = scaffold.phi1[sd0];

	scaffoldHDart[sd1] = cmap3.phi([1,2], wd2);
	sd1 = scaffold.phi1[sd1]; // edge 1-2
	scaffoldHDart[sd1] = cmap3.phi([1,2,-1], wd2);
	sd1 = scaffold.phi1[sd1]; // edge 2-3
	scaffoldHDart[sd1] = cmap3.phi([1,2,1,1], wd2);
	sd1 = scaffold.phi1[sd1]; // edge 3-0
	scaffoldHDart[sd1] = cmap3.phi([1,2,1], wd2);
	sd1 = scaffold.phi1[sd1];

	scaffoldHDart[sd2] = cmap3.phi([-1,2,-1], wd0);
	sd2 = scaffold.phi1[sd2]; // edge 1-2
	scaffoldHDart[sd2] = cmap3.phi([-1,2,-1,-1], wd0);
	sd2 = scaffold.phi1[sd2]; // edge 2-3
	scaffoldHDart[sd2] = cmap3.phi([-1,2,1], wd0);
	sd2 = scaffold.phi1[sd2]; // edge 3-0
	scaffoldHDart[sd2] = cmap3.phi([-1,2], wd0);
	sd2 = scaffold.phi1[sd2];

	sd3 = scaffold.phi2[sd3]; // edge 1-0
	scaffoldHDart[sd3] = cmap3.phi([1,1,2], wd1);
	sd3 = scaffold.phi1[sd3]; // edge 0-3
	scaffoldHDart[sd3] = cmap3.phi([1,1,2,-1], wd1);
	sd3 = scaffold.phi1[sd3]; // edge 3-2
	scaffoldHDart[sd3] = cmap3.phi([1,1,2,-1,-1], wd1);
	sd3 = scaffold.phi1[sd3]; // edge 2-1
	scaffoldHDart[sd3] = cmap3.phi([1,1,2,1], wd1);
	sd3 = scaffold.phi1[sd3];

	return wd0;

}

function insertLimb(cmap3, upperLimbLabel, lowerLimbLabel) {
	const boneScaffold = skeleton.getBoneAttribute("scaffold");
	const upperLimb = skeleton.getBone(upperLimbLabel);
	const lowerLimb = skeleton.getBone(lowerLimbLabel);

	const wd0 = create1Chunk(cmap3);

	let sd0 = boneScaffold[upperLimb];
	let sd1 = boneScaffold[lowerLimb]; // edge 0-1

	///		2 --> 3	 	1 --> 2
	///		|	  |	 	| 2sd0 |
	///		1 <-- 0  	0 <-- 3
	///		  sd1		

	sd0 = scaffold.phi2[sd0]; // edge 0-1
	scaffoldHDart[sd0] = cmap3.phi([-1,2], wd0);
	sd0 = scaffold.phi1[sd0]; // edge 1-2
	scaffoldHDart[sd0] = cmap3.phi([-1,2,-1], wd0);
	sd0 = scaffold.phi1[sd0]; // edge 2-3
	scaffoldHDart[sd0] = cmap3.phi([-1,2,1,1], wd0);
	sd0 = scaffold.phi1[sd0]; // edge 3-0
	scaffoldHDart[sd0] = cmap3.phi([-1,2,1], wd0);
	sd0 = scaffold.phi1[sd0];

	// sd1 = scaffold.phi2[sd1]; // edge 0-1
	scaffoldHDart[sd1] = cmap3.phi([1,2], wd0);
	sd1 = scaffold.phi1[sd1]; // edge 1-2
	scaffoldHDart[sd1] = cmap3.phi([1,2,-1], wd0);
	sd1 = scaffold.phi1[sd1]; // edge 2-3
	scaffoldHDart[sd1] = cmap3.phi([1,2,1,1], wd0);
	sd1 = scaffold.phi1[sd1]; // edge 3-0
	scaffoldHDart[sd1] = cmap3.phi([1,2,1], wd0);
	sd1 = scaffold.phi1[sd1];

	return wd0;
}

function testVolumes() {
	const boneScaffold = skeleton.getBoneAttribute("scaffold");

	console.log(boneScaffold)
	const hips = skeleton.getBone("Hips");
	const spine = skeleton.getBone("Spine");
	const spine1 = skeleton.getBone("Spine1");
	const spine2 = skeleton.getBone("Spine2");
	const neck = skeleton.getBone("Neck");
	const head = skeleton.getBone("Head");

	const rightUpLeg = skeleton.getBone("RightUpLeg");
	const rightLeg = skeleton.getBone("RightLeg");
	const rightFoot = skeleton.getBone("RightFoot");
	const rightToeBase = skeleton.getBone("RightToeBase");
	const rightToe_End = skeleton.getBone("RightToe_End");
	const rightArm = skeleton.getBone("RightArm");
	const rightForeArm = skeleton.getBone("RightForeArm");
	const rightHand = skeleton.getBone("RightHand");
	const rightShoulder = skeleton.getBone("RightShoulder");

	const leftUpLeg = skeleton.getBone("LeftUpLeg");
	const leftLeg = skeleton.getBone("LeftLeg");
	const leftFoot = skeleton.getBone("LeftFoot");
	const leftToeBase = skeleton.getBone("LeftToeBase");
	const leftToe_End = skeleton.getBone("LeftToe_End");
	const leftArm = skeleton.getBone("LeftArm");
	const leftForeArm = skeleton.getBone("LeftForeArm");
	const leftHand = skeleton.getBone("LeftHand");
	const leftShoulder = skeleton.getBone("LeftShoulder");


	const wdSpine = insertTorsoChunk(hexMesh, "Hips", "Spine");
	const wdSpine1 = insertTorsoChunk(hexMesh, "Spine", "Spine1");
	const wdSpine2 = insertTorsoChunk(hexMesh, "Spine1", "Spine2");
	const wdHips = insertHipsChunk(hexMesh, "LeftUpLeg", "RightUpLeg", "Hips");
	const wdShoulders = insertShouldersChunk(hexMesh, "Spine2", "LeftArm", "RightArm", "Neck")
	const wdRightForeArm = insertLimb(hexMesh, "RightForeArm", "RightHand")
	const wdRightArm = insertLimb(hexMesh, "RightArm", "RightForeArm")
	const wdLeftForeArm = insertLimb(hexMesh, "LeftForeArm", "LeftHand")
	const wdLeftArm = insertLimb(hexMesh, "LeftArm", "LeftForeArm")
	const wdRightUpLeg = insertLimb(hexMesh, "RightUpLeg", "RightLeg")
	const wdLeftUpLeg = insertLimb(hexMesh, "LeftUpLeg", "LeftLeg")
	const wdRightLeg = insertLimb(hexMesh, "RightLeg", "RightFoot")
	const wdLeftLeg = insertLimb(hexMesh, "LeftLeg", "LeftFoot")
	const wdNeck = insertLimb(hexMesh, "Head", "Neck")

	let sd0 = boneScaffold[hips]; // edge 0-1
	let sd1 = scaffold.phi2[boneScaffold[spine]];

	let sd2 = boneScaffold[spine]; // edge 0-1
	let sd3 = scaffold.phi2[boneScaffold[spine1]];

	let sd4 = boneScaffold[spine1]; // edge 0-1
	let sd5 = scaffold.phi2[boneScaffold[spine2]];


	let sd6 = boneScaffold[leftUpLeg]; // edge 0-1
	let sd7 = boneScaffold[rightUpLeg]; // edge 0-1


	let sd8 = boneScaffold[leftArm]; // edge 0-1
	let sd9 = boneScaffold[rightArm]; // edge 0-1
	let sd10 = scaffold.phi2[boneScaffold[neck]]; // edge 0-1

	let sd11 = boneScaffold[rightHand]
	let sd12 = scaffold.phi2[boneScaffold[rightForeArm]]

	let sd13 = boneScaffold[rightForeArm]
	let sd14 = scaffold.phi2[boneScaffold[rightArm]]


	let sd15 = boneScaffold[leftHand]
	let sd16 = scaffold.phi2[boneScaffold[leftForeArm]]

	let sd17 = boneScaffold[leftForeArm]
	let sd18 = scaffold.phi2[boneScaffold[leftArm]]


	let sd19 = boneScaffold[leftLeg]
	let sd20 = boneScaffold[leftFoot]
	// let sd20 = scaffold.phi2[boneScaffold[leftUpLeg]]

	let sd21 = boneScaffold[rightLeg]
	// let sd22 = scaffold.phi2[boneScaffold[rightUpLeg]]
	let sd22 = boneScaffold[rightFoot]

	let sd23 = scaffold.phi2[boneScaffold[head]]
	let sd24 = boneScaffold[neck]


	let sewingMarker = hexMesh.newMarker();
	/// replace with foreach volume
	const scaffoldSewing = [sd0, sd1, sd3,sd5,sd9,sd13,sd8,sd17,sd7,sd6,sd19,sd21,sd24]
	scaffoldSewing.forEach(sd0 => {
		scaffold.foreachDartPhi1(sd0, sd => {
			const wd0 = scaffoldHDart[sd];
			const wd1 = scaffoldHDart[scaffold.phi2[sd]];
	
			if(sewingMarker.markedCell(hexMesh.face2, wd0))
				return;
			sewVolumes(hexMesh, wd0, wd1);
	
			sewingMarker.markCell(hexMesh.face, wd0)
		})
	});

	hexMesh.close();
	hexMesh.setEmbeddings(hexMesh.vertex);
	const hexPosition = hexMesh.addAttribute(hexMesh.vertex, "position");
	const hexWeights = hexMesh.addAttribute(hexMesh.vertex, "weights");
	const hexBind = hexMesh.addAttribute(hexMesh.vertex, "bind");
	console.log(hexMesh.nbCells(hexMesh.volume), hexMesh.nbDarts())
	hexMesh.foreach(hexMesh.vertex, vd => {
		hexPosition[hexMesh.cell(hexMesh.vertex, vd)] = new THREE.Vector3;
	
	})

	const scaffoldPosCopy = [sd0, sd1, sd3, sd5, sd6, sd7, sd9, sd8, sd10, sd11, sd12,sd13,sd14,sd17,sd15,sd19,sd21,sd20,sd22,sd23]
	const scaffoldWeights = scaffold.getAttribute(scaffold.vertex, "weights");

	scaffoldPosCopy.forEach(sd0 => {
		scaffold.foreachDartPhi1(sd0, sd => {
			const vd = scaffoldHDart[sd];
			const hvid = hexMesh.cell(hexMesh.vertex, vd);
			hexPosition[hvid].copy(scaffoldPosition[scaffold.cell(scaffold.vertex,scaffold.phi2[sd])]);
			hexWeights[hvid] = scaffoldWeights[scaffold.cell(scaffold.vertex,scaffold.phi2[sd])]
		})
	})

	console.log(hexWeights)
	
	
	hexMesh.foreach(hexMesh.vertex, vd => {
		hexBind[hexMesh.cell(hexMesh.vertex, vd)] = hexPosition[hexMesh.cell(hexMesh.vertex, vd)].clone();
	
	})

	hexRenderer = new Renderer(hexMesh);
	hexRenderer.vertices.create({size:0.5}).addTo(scene);
	hexRenderer.edges.create({size: 100}).addTo(scene);


	// let hmd0 = wd0Spine;
	// let hmd1 = hexMesh.phi([],wd0Spine);
	// do {

	// } while(d0 != wd0Spine);



	// const 


}

function loadFileAsync(url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				// Successful request
				callback(null, xhr.responseText);
			} else {
				// Request failed
				callback(new Error('Failed to load file from ' + url));
			}
		}
	};

	xhr.open('GET', url, true);
	xhr.send();
}

loadFileAsync("./Files/Hip Hop Dancing.fbx", function(error, fileText) {
	if(error) {

	} else {
		fbxImporter = new FBXImporter(fileText);
		cmaps[0] = fbxImporter.cmaps[0]
		// cmaps[1] = fbxImporter.cmaps[1]
		cmapRenderers[0] = new Renderer(cmaps[0]);
		// cmapRenderers[1] = new Renderer(cmaps[1]);

		cmapRenderers[0].vertices.create({size: 0.25})//.addTo(scene)
		// cmapRenderers[1].edges.create({size: 20, color: 0x0000bb}).addTo(scene)

		// const weights = cmaps[0].getAttribute(cmaps[0].vertex, "weights");
		// console.log(weights)
		skeleton = fbxImporter.getSkeleton();
        // skeleton.setBindTransforms();
		skeleton.computeWorldTransforms(-1);
        // skeleton.computeOffsets();
		skeletonRenderer = new SkeletonRenderer(skeleton);
    	skeletonRenderer.computePositions(-1);
		skeletonRenderer.createEdges();
		// skeletonRenderer.createVertices();
		console.log(skeletonRenderer)
		// skeletonRenderer.vertices(scene)
		// scene.add(skeletonRenderer.vertices)
		scene.add(skeletonRenderer.edges)

		skeleton.debug()
		const timeRange = fbxImporter.timeRange;
		console.log(timeRange)
		guiParams.timeRange = fbxImporter.timeRange;

		gui.add(guiParams, "tPose")
		gui.add(guiParams, "loop")
		gui.add(guiParams, "speed", 0.01, 2).step(0.01);
		gui.add(guiParams, "currentTime", guiParams.timeRange.first, guiParams.timeRange.last).onChange(guiParams.update.bind(guiParams)).listen();
		console.log(guiParams)
		
		testScaffold()
		testVolumes()
		// console.log(cmap.getAttribute(cmap.vertex, "position"))
	}
})

window.update = function(t) {
    skeletonRenderer.computePositions(t);
	skeletonRenderer.updateEdges();
	skeletonRenderer.updateVertices();
}


const raycaster = new THREE.Raycaster;
const mouse = new THREE.Vector2;
function setMouse(event) {
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseDown(event) {
	const skin = cmapRenderers[0].vertices.mesh;
	if(event.button == 0){
		const weights = cmaps[0].getAttribute(cmaps[0].vertex, "weights");
		setMouse(event)
		raycaster.setFromCamera(mouse, camera);
		console.log(mouse.x, mouse.y)
		console.log(scaffoldRenderer.vertices)
		const hit = raycaster.intersectObject(skin)[0];
		if(hit) {
			console.log(hit, hit.instanceId, skin.vd[hit.instanceId])
			const vd = skin.vd[hit.instanceId];
			const w = weights[cmaps[0].cell(cmaps[0].vertex, vd)];
			console.log(vd, w)
			w.forEach(b => {
				console.log(b.b, skeleton.getLabel(b.b), b.w)
			})
		}
	}
}
window.addEventListener('pointerdown', onMouseDown )


const grid = new THREE.GridHelper(1000, 25)
// const grid2 = new THREE.GridHelper(100, 10)
// grid2.lookAt(worldY)
scene.add(grid)
// scene.add(grid2)


window.updateRenderer = function(t) {
}

let frameCount = 0;
function update (t)
{
	if(guiParams.loop) {
		guiParams.loopFunc();


	}
}

function render()
{
	renderer.render(scene, camera);
}

function mainloop(t)
{ 
    update(t);
    render();
	requestAnimationFrame(mainloop);
}

mainloop(0);