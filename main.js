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



const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeeeee);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.001, 1000.0);
camera.position.set(0, 200, 250);
// camera.position.set(10, 10.5, 11.5);
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

let ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
let pointLight0 = new THREE.PointLight(0xffffff, 1);
pointLight0.position.set(10,8,5);
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
let fbxImporter;


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

loadFileAsync("./Files/T-Pose.fbx", function(error, fileText) {
	if(error) {

	} else {
		fbxImporter = new FBXImporter(fileText);
		cmaps[0] = fbxImporter.cmaps[0]
		cmaps[1] = fbxImporter.cmaps[1]
		cmapRenderers[0] = new Renderer(cmaps[0]);
		cmapRenderers[1] = new Renderer(cmaps[1]);

		cmapRenderers[0].edges.create({size: 30, color: 0x0000EE}).addTo(scene)
		cmapRenderers[1].edges.create({size: 20, color: 0x0000bb}).addTo(scene)

		// console.log(cmap.getAttribute(cmap.vertex, "position"))
	}
})





const worldUp = new THREE.Vector3(0, 0, 1);
const worldY = new THREE.Vector3(0, 1, 0);


const translation = new THREE.Quaternion(0, 0.1, 0, 0);
const translation1 = new THREE.Quaternion(0, 0.1, 0, 0);


const rotation = new THREE.Quaternion().setFromAxisAngle(worldY, Math.PI / 3);
const transform = DualQuaternion.setFromRotationTranslation(rotation.clone(), translation.clone());
transform.normalize();
const key0 = new Key(0, transform);


// const rotation1 = new THREE.Quaternion().setFromAxisAngle(worldUp, Math.PI / 3);
const rotation1 = new THREE.Quaternion().setFromAxisAngle(worldUp, 0);
const transform1 = DualQuaternion.setFromRotationTranslation(rotation1.clone(), translation1.clone());
transform1.normalize();
const key1 = new Key(100, transform1);


const translationroot = new THREE.Quaternion(0, 0, 0, 0);
const transformRoot = DualQuaternion.setFromRotationTranslation(new THREE.Quaternion, translationroot)
const keyroot = new Key(100, transformRoot);




const skeleton = new Skeleton;
const root = skeleton.newBone("root");
skeleton.addKey(root, keyroot);
const bone0 = skeleton.newBone();
skeleton.setParent(bone0, root);
skeleton.addKey(bone0, key0);
const bone1 = skeleton.newBone();
skeleton.setParent(bone1, bone0);
skeleton.addKey(bone1, key0);
const bone2 = skeleton.newBone();
skeleton.setParent(bone2, bone1);
skeleton.addKey(bone2, key0);
skeleton.addKey(bone2, key1);
const bone3 = skeleton.newBone();
skeleton.setParent(bone3, bone2);
skeleton.addKey(bone3, key0);

skeleton.addKey(bone0, key1);
skeleton.addKey(bone1, key1);
skeleton.addKey(bone3, key1);


skeleton.setBindTransforms();
skeleton.computeWorldTransforms(0);
skeleton.computeOffsets();

const sRenderer = new SkeletonRenderer(skeleton);
sRenderer.createVertices();
sRenderer.createEdges();
scene.add(sRenderer.vertices)
scene.add(sRenderer.edges)




const skin = new IncidenceGraph;
skin.createEmbedding(skin.vertex);
const skinPos = skin.addAttribute(skin.vertex, "position");
const skinBind = skin.addAttribute(skin.vertex, "bind");
const skinWeights = skin.addAttribute(skin.vertex, "weights");


// const weights = [
// 	[{b: 0, w: 0.5}, {b: 1, w: 0.5}],
// 	[{b: 0, w: 0.25}, {b: 1, w: 0.5}, {b: 2, w: 0.25}],
// 	[{b: 1, w: 0.5}, {b: 2, w: 0.5}],
// 	[{b: 1, w: 0.25}, {b: 2, w: 0.5}, {b: 3, w: 0.25}],
// 	[{b: 2, w: 0.5}, {b: 3, w: 0.5}],
// 	[{b: 2, w: 0.25}, {b: 3, w: 0.5}, {b: 4, w: 0.25}],
// 	[{b: 3, w: 0.5}, {b: 4, w: 0.5}],
// 	[{b: 3, w: 0.25}, {b: 4, w: 0.75}],
// 	[{b: 4, w: 1}]
// ]

const weights = [
	[{b: 0, w: 0.5}, {b: 1, w: 0.5}],
	[{b: 1, w: 0.5}, {b: 2, w: 0.5}],
	[{b: 2, w: 0.5}, {b: 3, w: 0.5}],
	[{b: 3, w: 0.5}, {b: 4, w: 0.5}],
	[{b: 4, w: 1}]
]

const upVector = new THREE.Vector3(0, 0.1, 0);
const radiusVector = new THREE.Vector3(0.05, 0, 0.05);

const nbVerts = 4;
const angle = 2*Math.PI/nbVerts;

for(let w = 0; w < weights.length; ++w) {
	const tempVector = radiusVector.clone();
	tempVector.addScaledVector(upVector, w);

	for(let i = 0; i < nbVerts; ++i){
		let id = skin.addVertex();
		if(i != 0) skin.addEdge(id, id - 1);
		if(i == nbVerts - 1) skin.addEdge(id, id - i);
		if(w > 0) skin.addEdge(id, id - nbVerts);
		
		skinPos[id] = tempVector.clone();
		skinBind[id] = skinPos[id].clone();
		skinWeights[id] = weights[w];
		
		tempVector.applyAxisAngle(worldY, angle);
	}
}

const skinRenderer = new Renderer(skin);
skinRenderer.vertices.create();
skinRenderer.vertices.addTo(scene)
skinRenderer.edges.create({color: new THREE.Color(0x550000)});
skinRenderer.edges.addTo(scene)






const hexMesh = new CMap3;
const dh0 = hexMesh.addPrism(4, false);
const dh1 = hexMesh.addPrism(4, false);
const dh2 = hexMesh.addPrism(4, false);
const dh3 = hexMesh.addPrism(4, false);

const dh0_ = hexMesh.phi([2,1,1,2], dh0);
const dh1_ = hexMesh.phi([2,1,1,2], dh1);
const dh2_ = hexMesh.phi([2,1,1,2], dh2);
const dh3_ = hexMesh.phi([2,1,1,2], dh3);

let d0 = dh0; let d0_ = dh0_;
let d1 = dh1; let d1_ = dh1_;
let d2 = dh2; let d2_ = dh2_;
let d3 = dh3; let d3_ = dh3_;

for(let i = 0; i < 4; ++i) {
	hexMesh.sewPhi3(d0_, d1);
	hexMesh.sewPhi3(d1_, d2);
	hexMesh.sewPhi3(d2_, d3);

	d0_ = hexMesh.phi1[d0_];
	d1_ = hexMesh.phi1[d1_];
	d2_ = hexMesh.phi1[d2_];
	d1 = hexMesh.phi_1[d1];
	d2 = hexMesh.phi_1[d2];
	d3 = hexMesh.phi_1[d3];
}

hexMesh.close();
hexMesh.setEmbeddings(hexMesh.vertex);
// hexMesh.setEmbeddings(hexMesh.volume);

// hexMesh.foreach(hexMesh.volume, wd => {
// 	console.log(hexMesh.cell(hexMesh.volume, wd))
// })

const hexPos = hexMesh.addAttribute(hexMesh.vertex, "position");
const hexBind = hexMesh.addAttribute(hexMesh.vertex, "bind");
const hexWeight =  hexMesh.addAttribute(hexMesh.vertex, "weight");

d0 = dh0; d1 = dh1; d2 = dh2; d3 = dh3; d3_ = hexMesh.phi1[dh3_];
hexPos[hexMesh.cell(hexMesh.vertex, d0)] = new THREE.Vector3(-0.05, 0, -0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d1)] = new THREE.Vector3(-0.05, 0.1, -0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d2)] = new THREE.Vector3(-0.05, 0.2, -0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d3)] = new THREE.Vector3(-0.05, 0.3, -0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d3_)] = new THREE.Vector3(-0.05, 0.4, -0.05)

hexWeight[hexMesh.cell(hexMesh.vertex, d0)] = [{b: 0, w: 0.5}, {b: 1, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d1)] = [{b: 1, w: 0.5}, {b: 2, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d2)] = [{b: 2, w: 0.5}, {b: 3, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d3)] = [{b: 3, w: 0.5}, {b: 4, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d3_)] = [{b: 4, w: 1}];


d0 = hexMesh.phi1[d0]; d1 = hexMesh.phi1[d1]; d2 = hexMesh.phi1[d2];
d3 = hexMesh.phi1[d3]; d3_ = hexMesh.phi_1[d3_];
hexPos[hexMesh.cell(hexMesh.vertex, d0)] = new THREE.Vector3(0.05, 0, -0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d1)] = new THREE.Vector3(0.05, 0.1, -0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d2)] = new THREE.Vector3(0.05, 0.2, -0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d3)] = new THREE.Vector3(0.05, 0.3, -0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d3_)] = new THREE.Vector3(0.05, 0.4, -0.05)

hexWeight[hexMesh.cell(hexMesh.vertex, d0)] = [{b: 0, w: 0.5}, {b: 1, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d1)] = [{b: 1, w: 0.5}, {b: 2, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d2)] = [{b: 2, w: 0.5}, {b: 3, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d3)] = [{b: 3, w: 0.5}, {b: 4, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d3_)] = [{b: 4, w: 1}];


d0 = hexMesh.phi1[d0]; d1 = hexMesh.phi1[d1]; d2 = hexMesh.phi1[d2];
d3 = hexMesh.phi1[d3]; d3_ = hexMesh.phi_1[d3_];
hexPos[hexMesh.cell(hexMesh.vertex, d0)] = new THREE.Vector3(0.05, 0, 0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d1)] = new THREE.Vector3(0.05, 0.1, 0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d2)] = new THREE.Vector3(0.05, 0.2, 0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d3)] = new THREE.Vector3(0.05, 0.3, 0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d3_)] = new THREE.Vector3(0.05, 0.4, 0.05)

hexWeight[hexMesh.cell(hexMesh.vertex, d0)] = [{b: 0, w: 0.5}, {b: 1, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d1)] = [{b: 1, w: 0.5}, {b: 2, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d2)] = [{b: 2, w: 0.5}, {b: 3, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d3)] = [{b: 3, w: 0.5}, {b: 4, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d3_)] = [{b: 4, w: 1}];


d0 = hexMesh.phi1[d0]; d1 = hexMesh.phi1[d1]; d2 = hexMesh.phi1[d2];
d3 = hexMesh.phi1[d3]; d3_ = hexMesh.phi_1[d3_];
hexPos[hexMesh.cell(hexMesh.vertex, d0)] = new THREE.Vector3(-0.05, 0, 0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d1)] = new THREE.Vector3(-0.05, 0.1, 0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d2)] = new THREE.Vector3(-0.05, 0.2, 0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d3)] = new THREE.Vector3(-0.05, 0.3, 0.05)
hexPos[hexMesh.cell(hexMesh.vertex, d3_)] = new THREE.Vector3(-0.05, 0.4, 0.05)

hexWeight[hexMesh.cell(hexMesh.vertex, d0)] = [{b: 0, w: 0.5}, {b: 1, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d1)] = [{b: 1, w: 0.5}, {b: 2, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d2)] = [{b: 2, w: 0.5}, {b: 3, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d3)] = [{b: 3, w: 0.5}, {b: 4, w: 0.5}];
hexWeight[hexMesh.cell(hexMesh.vertex, d3_)] = [{b: 4, w: 1}];







// hexMesh.foreachDart(d => {
// 	console.log(d, hexMesh.phi1[d], hexMesh.phi2[d], hexMesh.phi3[d])
// })

hexMesh.foreach(hexMesh.vertex, vd => {
	const vid = hexMesh.cell(hexMesh.vertex, vd)
	hexBind[vid] = hexPos[vid].clone();	
})

console.log(hexMesh.nbCells(hexMesh.vertex))
console.log(hexMesh.nbCells(hexMesh.volume))
console.log(hexMesh.nbCells(hexMesh.edge))


// function divideHex()

let hexMesh2 = new CMap3();
const hexPos2 = hexMesh2.addAttribute(hexMesh2.vertex, "position");
let dh20 = hexMesh2.addPrism(4, false);
hexMesh2.close();
hexMesh2.setEmbeddings(hexMesh2.vertex);
// hexMesh2.setEmbeddings(hexMesh2.volume);



hexPos2[hexMesh2.cell(hexMesh2.vertex, dh20)] = new THREE.Vector3(-0.05, 0, -0.05)
dh20 = hexMesh2.phi1[dh20];
hexPos2[hexMesh2.cell(hexMesh2.vertex, dh20)] = new THREE.Vector3(0.05, 0, -0.05)
dh20 = hexMesh2.phi1[dh20];
hexPos2[hexMesh2.cell(hexMesh2.vertex, dh20)] = new THREE.Vector3(0.05, 0, 0.05)
dh20 = hexMesh2.phi1[dh20];
hexPos2[hexMesh2.cell(hexMesh2.vertex, dh20)] = new THREE.Vector3(-0.05, 0, 0.05)

dh20 = hexMesh2.phi([2, 1, 1, 2], dh20);
hexPos2[hexMesh2.cell(hexMesh2.vertex, dh20)] = new THREE.Vector3(-0.05, 0.1, -0.05)
dh20 = hexMesh2.phi1[dh20];
hexPos2[hexMesh2.cell(hexMesh2.vertex, dh20)] = new THREE.Vector3(-0.05, 0.1, 0.05)
dh20 = hexMesh2.phi1[dh20];
hexPos2[hexMesh2.cell(hexMesh2.vertex, dh20)] = new THREE.Vector3(0.05, 0.1, 0.05)
dh20 = hexMesh2.phi1[dh20];
hexPos2[hexMesh2.cell(hexMesh2.vertex, dh20)] = new THREE.Vector3(0.05, 0.1, -0.05)




// const hexRenderer2 = new RendererDarts(hexMesh2);
// hexRenderer2.volumes.create({color: 0x7777BB}).rescale(0.9);
// hexRenderer2.volumes.addTo(scene)
// hexRenderer2.vertices.create();
// hexRenderer2.vertices.addTo(scene)


const hexRenderer = new Renderer(hexMesh);
hexRenderer.vertices.create({size: 0.00125});
hexRenderer.vertices.addTo(scene)
hexRenderer.edges.create({size: 0.125});
hexRenderer.edges.addTo(scene)
// hexRenderer.volumes.create({color: 0x7777BB}).rescale(0.9);
// hexRenderer.volumes.addTo(scene)



const grid = new THREE.GridHelper(1, 10)
const grid2 = new THREE.GridHelper(1, 10)
grid2.lookAt(worldY)
scene.add(grid)
scene.add(grid2)


window.updateRenderer = function(t) {
	sRenderer.computePositions(t);
	sRenderer.updateVertices();
}

let frameCount = 0;
function update (t)
{
	let s = 100 * (Math.sin(t / 1000) / 2 + 0.5);
	sRenderer.computePositions(s);
	skeleton.computeOffsets()
	sRenderer.updateVertices();
	sRenderer.updateEdges();

	skin.foreach(skin.vertex, v => {
		let pb = skinBind[v].clone();
		let dqBlend = new DualQuaternion(new THREE.Quaternion(0,0,0,0), new THREE.Quaternion(0,0,0,0));
		for(let w = 0; w < skinWeights[v].length; ++w) {
			let b = skinWeights[v][w];
			let off = skeleton.getOffset(b.b);
			dqBlend.addScaledDualQuaternion(off, b.w);
		}
		dqBlend.normalize();
		let pdq = DualQuaternion.setFromTranslation(pb);
		pdq.multiplyDualQuaternions(dqBlend, pdq)

		skinPos[v].copy(pdq.transform(new THREE.Vector3));

	});
	skinRenderer.vertices.update();
	skinRenderer.edges.update();

	hexMesh.foreach(hexMesh.vertex, vd => {
		const vid = hexMesh.cell(hexMesh.vertex, vd);

		const dqBlend = new DualQuaternion(new THREE.Quaternion(0,0,0,0), new THREE.Quaternion(0,0,0,0));
		for(let w = 0; w < hexWeight[vid].length; ++w) {
			let b = hexWeight[vid][w];
			let off = skeleton.getOffset(b.b);
			dqBlend.addScaledDualQuaternion(off, b.w);
		}
		dqBlend.normalize();
		const pdq = DualQuaternion.setFromTranslation(hexBind[vid]);
		pdq.multiplyDualQuaternions(dqBlend, pdq)
		
		hexPos[vid].copy(pdq.transform(new THREE.Vector3))
	});

	hexRenderer.vertices.update()
	hexRenderer.edges.update()
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
	// console.log((1)/((t - prevT)/1000))
	// prevT = t
}

mainloop(0);