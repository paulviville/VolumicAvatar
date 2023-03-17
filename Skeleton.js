import AttributesContainer from './CMapJS/CMap/AttributeContainer.js';
import Graph from './CMapJS/CMap/Graph.js';
import { Matrix4, Vector3 } from './CMapJS/Libs/three.module.js';
import * as THREE from './CMapJS/Libs/three.module.js';

const root = null;

export function Key (t, mat) {
	this.t = t;
	this.mat = mat;
}

function Animation () {
	this.keys = [];

	this.addKey = function (key) {
		this.keys.push(key);

		this.keys.sort((key0, key1) => {
			if(key0.t < key1.t)
				return -1;
			else 
				return 1;
		});

		console.log(this.keys)
	}

	this.transformAt = function (t) {
		const transform = new Matrix4;
		if(this.keys.length == 0)
			return transform;
			
		console.log(this.keys.length)
		if(t < this.keys[this.keys.length - 1].t) /// invert < -> >=
			transform.copy(this.keys[this.keys.length - 1].mat);
		else {
			const trans0 = new Matrix4;
			const trans1 = new Matrix4;
			
			for(let i = 0; i < this.keys.length - 1; ++i){
				// if(t < )
			}
		}
		
		return transform; 
	}
}

export default function Skeleton () {
	const attributes = new AttributesContainer;
	const bones = attributes.createAttribute("bones");
	const labels = attributes.createAttribute("labels");
	const parents = attributes.createAttribute("parents");
	const bindTransforms = attributes.createAttribute("bindTransforms");
	const localTransforms = attributes.createAttribute("localTransforms");
	const worldTransforms = attributes.createAttribute("worldTransforms");
	const offsetTransforms = attributes.createAttribute("offsetTransforms");
	const keys = attributes.createAttribute("keys");

	// const

	this.foreachBone = function (func) {
		bones.forEach(bone => func(bone));
	}

	const labelDictionary = {};
	function getBoneFromLabel (label) {
		return labelDictionary[label];
	}

	this.newBone = function (label) {
	// this.newBone = function (label, parentLabel, localTransform) {
		const bone = attributes.newElement();
		bones[bone] = bone;
		labels[bone] = label ?? ("bone_" + bone);
		labelDictionary[labels[bone]] = bone;
		parents[bone] = root;
		bindTransforms[bone] = new Matrix4;
		localTransforms[bone] = new Matrix4;
		worldTransforms[bone] = new Matrix4;
		offsetTransforms[bone] = new Matrix4;
		keys[bone] = new Animation;
		return bone;
	}

	this.nbBones = function () {
		return attributes.nbElements();
	}

	this.setParent = function (bone, parent) {
		parents[bone] = parent;
	}

	this.getParent = function (bone) {
		return parents[bone];
	}

	this.getLocalTransform = function (bone) {
		return localTransforms[bone];
	}

	this.setLocalTransform = function (bone, mat) {
		localTransforms[bone].copy(mat);
	}

	this.addKey = function (bone, key) {
		keys[bone].addKey(key);
	}

	this.getWorldTransform = function (bone) {
		return worldTransforms[bone];
	}

	this.computeLocalTransforms = function (t = 0) {
		this.foreachBone(bone => {
			localTransforms[bone].copy(keys[bone].transformAt(t))
		});
	}

	let computedWorldTransforms = false;
	this.computeWorldTransforms = function (t = 0) {
		this.computeLocalTransforms(t);

		this.foreachBone(bone => {
			const localM = localTransforms[bone];
			const worldM = worldTransforms[bone];
			worldM.identity();

			const parent = parents[bone];
			if(parent != root)
				worldM.copy(worldTransforms[parent]);

			worldM.multiply(localM);
		});
	}

	this.setBindTransforms = function () {
		if(!computedWorldTransforms) {
			this.computeWorldTransforms(0);
			computedWorldTransforms = true;
		}

		this.foreachBone(bone => {
			const worldM = worldTransforms[bone];
			bindTransforms[bone].copy(worldM);
			bindTransforms[bone].invert();
		});
	}

	this.computeOffsets = function () {
		this.foreachBone(bone => {
			const bindM = bindTransforms[bone];
			const worldM = worldTransforms[bone];
			offsetTransforms[bone].multiplyMatrices(worldM, bindM);
		});
	}

	this.getOffset = function (bone) {
		return offsetTransforms[bone];
	}

	this.newBoneAttribute = function (name) {
		return attributes.createAttribute(name);
	}
}



export function SkeletonGraph (skeleton) {
	const graph = new Graph;
	const vertex = graph.vertex;
	graph.setEmbeddings(vertex);
	const position = graph.addAttribute(vertex, "position");

	const gvd = skeleton.newBoneAttribute("gvd");
	skeleton.computeWorldTransforms();
	skeleton.foreachBone(bone => {
		const v = graph.addVertex();
		gvd[bone] = v;

		const parent = skeleton.getParent(bone);
		if(parent != root) {
			graph.connectVertices(gvd[parent], v);
		}

		const transform = skeleton.getWorldTransform(bone);
		position[graph.cell(vertex, v)] = new Vector3().applyMatrix4(transform);
	});

	return graph;
}

export function SkeletonRenderer (skeleton) {
	const positions = skeleton.newBoneAttribute("position");

	this.computePositions = function() {
		skeleton.computeWorldTransforms();
		skeleton.foreachBone(bone => {
			const mat = skeleton.getWorldTransform(bone);
			positions[bone] = new THREE.Vector3().applyMatrix4(mat);
		})
	}

	this.createVertices = function () {
		const geometry = new THREE.SphereGeometry(1, 32, 32);
		const material = new THREE.MeshLambertMaterial();
		this.vertices =  new THREE.InstancedMesh(geometry, material, skeleton.nbBones());
		
		this.vertices.instanceId = skeleton.newBoneAttribute("vertexInstanceId");
		this.vertices.bones = [];

		const size = 0.009;
		const scale = new THREE.Vector3(size, size, size);

		let id = 0;
		skeleton.foreachBone(bone => {
			const matrix = new THREE.Matrix4;
			matrix.setPosition(positions[bone]);
			matrix.scale(scale);
			this.vertices.bones[id] = bone;
			this.vertices.instanceId[bone] = id;
			this.vertices.setColorAt(id, new THREE.Color(0xBB1111));
			this.vertices.setMatrixAt(id, matrix);
			++id;
		});
	}

	this.createEdges = function () {
		const geometry = new THREE.ConeGeometry(0.008, 1, 5, 1);
		const material = new THREE.MeshLambertMaterial();

		this.edges = new THREE.InstancedMesh(geometry, material, skeleton.nbBones());
		this.edges.instanceId = skeleton.newBoneAttribute("edgeInstanceId");
		this.edges.bones = [];

		let id = 0;
		const pos = new THREE.Vector3;
		const quat = new THREE.Quaternion;
		const scale = new THREE.Vector3;
		const p = [undefined, undefined];
		skeleton.foreachBone(bone => {
			const parent = skeleton.getParent(bone);
			if(parent != null) {
				p[0] = positions[bone]
				p[1] = positions[parent];

				let dir = new THREE.Vector3().subVectors(p[0], p[1]);
				let len = dir.length();
				let dirx = new THREE.Vector3().crossVectors(dir.normalize(), new THREE.Vector3(0.0001,0,1));
				let dirz = new THREE.Vector3().crossVectors(dirx, dir);
				const matrix = new THREE.Matrix4().fromArray([
					dirx.x, dir.x, dirz.x, 0,
					dirx.y, dir.y, dirz.y, 0,
					dirx.z, dir.z, dirz.z, 0,
					0, 0, 0, 1]).transpose();

				matrix.decompose(pos, quat, scale);
				scale.set(1, len, 1);
				pos.addVectors(p[0], p[1]).divideScalar(2);
				matrix.compose(pos, quat, scale);

				this.edges.setMatrixAt(id, matrix);
				this.edges.setColorAt(id, new THREE.Color(0x777777));
				this.edges.instanceId[bone] = id;
				this.edges.bones[id] = bone;
				++id;
			}
		});
	}

	this.computePositions();
}