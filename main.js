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
	update: function() {
		this.updateSkeleton();
		this.updateSkin();
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

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const scaffold = new CMap2();
scaffold.createEmbedding(scaffold.vertex);
const scaffoldPosition = scaffold.addAttribute(scaffold.vertex, "position");
const scaffoldRenderer = new Renderer(scaffold);

window.testScaffold = function() {

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

	const leftUpLeg = skeleton.getBone("LeftUpLeg");
	const leftLeg = skeleton.getBone("LeftLeg");
	const leftFoot = skeleton.getBone("LeftFoot");
	const leftToeBase = skeleton.getBone("LeftToeBase");
	const leftToe_End = skeleton.getBone("LeftToe_End");
	const leftArm = skeleton.getBone("LeftArm");
	const leftForeArm = skeleton.getBone("LeftForeArm");
	const leftHand = skeleton.getBone("LeftHand");

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






	console.log(boneScaffold)


	scaffoldRenderer.vertices.create({size: 0.5, color: new THREE.Color(0x00FF00)}).addTo(scene);
	scaffoldRenderer.edges.create({size: 80, color: new THREE.Color(0x008800)}).addTo(scene);
	// scaffoldRenderer.faces.create().addTo(scene);


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

		cmapRenderers[0].vertices.create({size: 0.125}).addTo(scene)
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
		
		window.testScaffold()

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
		setMouse(event)
		raycaster.setFromCamera(mouse, camera);
		console.log(mouse.x, mouse.y)
		console.log(scaffoldRenderer.vertices)
		const hit = raycaster.intersectObject(skin)[0];
		if(hit) {
			console.log(hit, hit.instanceId, skin.vd[hit.instanceId])

		}
	}
}
window.addEventListener( 'pointerdown', onMouseDown )


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