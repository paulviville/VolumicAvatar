import  CMap2  from "./CMapJS/CMap/CMap2.js";
import { mapFromGeometry } from "./CMapJS/IO/SurfaceFormats/CMap2IO.js";
import { Quaternion } from "./CMapJS/Libs/three.module.js";
import Skeleton, { Key } from "./Skeleton.js";
import * as THREE from './CMapJS/Libs/three.module.js';
import { DualQuaternion } from "./DualQuaternion.js";

export default class FBXImporter {
	#fbxString;
	#lines;
	#objects = {};
	#connections = {};
	#cmaps = [];
	#geometriesById = {};
	#skeleton;
	#boneById;
	#deformersById = {};
	#skinDeformersById = {};
	#boneNode;
	#boneInitTransform;
	cmaps;

	constructor(fbxString) {
		this.#fbxString = fbxString;
		this.#clean();
		this.#readObjects();
		this.#readConnections();
		
		this.#objects.geometries.forEach(geometry => {
			this.#cmaps.push(this.#processGeometry(geometry));
		})

		this.#processSkeleton();
		this.#processAnimation();
		this.#skinSkeleton();

		console.log(this.#cmaps)
		console.log(this.#skeleton)
		this.cmaps = this.#cmaps;
	}

	#clean() {
		const lines = this.#fbxString.split("\n");

		const cleanLines = [];
		lines.forEach(line => {
			line = line.replace(/\s\s+/g, '').trim();

			if(line[0] == undefined)	return;
			if(line[0] == ";")	return;

			cleanLines.push(line);
		})

		this.#lines = cleanLines;
	}

	#findLine(incl) {
		let i = 0;
		while(!this.#lines[i].includes(incl))
			++i;
		return i;
	}

	/// does nothing for now
	#readNodeAttribute(firstLine, nodeAttribute) {
		let i = firstLine;
		let nbBrackets = 0;
		do {

			nbBrackets += Number(this.#lines[i].includes('{'))
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	#readVertices(firstLine, vertices) {
		let i = firstLine + 1;
		let verticesStr = "";
		while(!this.#lines[i].includes('}')) {
			verticesStr += this.#lines[i++];
		}

		verticesStr = verticesStr.split(": ")[1];
		verticesStr = verticesStr.split(",");

		verticesStr = verticesStr.map(vStr => {
			return parseFloat(vStr);
		})

		for(let i = 0; i < verticesStr.length; i += 3) {
			vertices.push([verticesStr[i], verticesStr[i+1], verticesStr[i+2]]);
		}

		console.log(this.#lines[firstLine], " -> ", this.#lines[i]);

		return i;
	}

	#readPolygons(firstLine, polygons) {
		let i = firstLine + 1;

		let polygonsStr = "";
		while(!this.#lines[i].includes('}')) {
			polygonsStr += this.#lines[i++];
		}

		polygonsStr = polygonsStr.split(": ")[1];
		polygonsStr = polygonsStr.split(",");

		polygonsStr = polygonsStr.map(pStr => {
			return parseInt(pStr);
		})

		polygons.push([]);
		for(let i = 0; i < polygonsStr.length; ++i) {
			let p = polygons.length - 1;
			let id = polygonsStr[i];
			if(id < 0) {
				id = -1* (id+1);
				polygons.push([]); 
			}
			polygons[p].push(id);
		}
		polygons.pop()

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i]);
		
		return i;
	}

	#readEdges(firstLine, edges) {
		let i = firstLine + 1;

		let edgesStr = "";
		while(!this.#lines[i].includes('}')) {
			edgesStr += this.#lines[i++];
		}

		edgesStr = edgesStr.split(": ")[1];
		edgesStr = edgesStr.split(",");

		edgesStr.forEach(eStr => {
			edges.push(parseFloat(eStr))
		})

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i]);

		return i;
	}

	/// does nothing for now
	#readLayerElementNormal(firstLine, layerElementNormal) {
		let i = firstLine;
		let nbBrackets = 0;
		do {
			if(this.#lines[i].includes('Normals:')){}
			if(this.#lines[i].includes('NormalsW:')){}

			nbBrackets += Number(this.#lines[i].includes('{'))
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	/// does nothing for now
	#readLayerElementUV(firstLine, layerElementUV) {
		let i = firstLine;
		let nbBrackets = 0;
		do {
			if(this.#lines[i].includes('UV:')){}
			if(this.#lines[i].includes('UVIndex:')){}

			nbBrackets += Number(this.#lines[i].includes('{'))
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	/// does nothing for now
	#readLayerElementMaterial(firstLine, layerElementMaterial) {
		let i = firstLine;
		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	/// does nothing for now
	#readLayer(firstLine, layer) {
		let i = firstLine;
		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	#readGeometry(firstLine, geometry) {
		let i = firstLine;
		const id = this.#lines[firstLine].split(",")[0].split(": ")[1];
		geometry.id = id;

		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))

			if(this.#lines[i].includes('Vertices:')){
				geometry.vertices = [];
				i = this.#readVertices(i, geometry.vertices);
			}

			if(this.#lines[i].includes('PolygonVertexIndex:')){
				geometry.polygons = [];
				i = this.#readPolygons(i, geometry.polygons);
			}
			
			if(this.#lines[i].includes('Edges:')){
				geometry.edges = [];
				i = this.#readEdges(i, geometry.edges);
			}

			/// does nothing for now
			if(this.#lines[i].includes('LayerElementNormal:')){
				geometry.layerElementNormal = {};
				i = this.#readLayerElementNormal(i, geometry.layerElementNormal);
			}

			/// does nothing for now
			if(this.#lines[i].includes('LayerElementUV:')){
				geometry.LayerElementUV = {};
				i = this.#readLayerElementUV(i, geometry.layerElementUV);
			}

			/// does nothing for now
			if(this.#lines[i].includes('LayerElementMaterial:')){
				geometry.layerElementMaterial = {};
				i = this.#readLayerElementMaterial(i, geometry.layerElementUV);
			}

			/// does nothing for now
			if(this.#lines[i].includes('Layer:')){
				geometry.layer = {};
				i = this.#readLayer(i, geometry.layer);
			}

			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}
	
	#readModelProperties(firstLine, properties) {
		let i = firstLine;
		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))

			if(this.#lines[i].includes('P:')){
				let property = this.#lines[i].replace(/"/g, "");
				property = property.replace("P:", "");
				property = property.split(",");
				const propertyName = property.shift().trim()

				switch(propertyName) {
					case "PreRotation":
						properties[propertyName] = [];
						properties[propertyName].unshift(parseFloat(property.pop()));
						properties[propertyName].unshift(parseFloat(property.pop()));
						properties[propertyName].unshift(parseFloat(property.pop()));
						break;
					case "RotationActive":
						properties[propertyName] = !!(parseInt(property.pop()));
						break;
					case "InheritType":
						properties[propertyName] = parseInt(property.pop());
						break;
					case "ScalingMax":
						properties[propertyName] = [];
						properties[propertyName].unshift(parseFloat(property.pop()));
						properties[propertyName].unshift(parseFloat(property.pop()));
						properties[propertyName].unshift(parseFloat(property.pop()));
						break;
					case "Lcl Translation":
						properties[propertyName] = [];
						properties[propertyName].unshift(parseFloat(property.pop()));
						properties[propertyName].unshift(parseFloat(property.pop()));
						properties[propertyName].unshift(parseFloat(property.pop()));
						break;
					case "Lcl Rotation":
						properties[propertyName] = [];
						properties[propertyName].unshift(parseFloat(property.pop()));
						properties[propertyName].unshift(parseFloat(property.pop()));
						properties[propertyName].unshift(parseFloat(property.pop()));
						break;
					case "Lcl Scaling":
						properties[propertyName] = [];
						properties[propertyName].unshift(parseFloat(property.pop()));
						properties[propertyName].unshift(parseFloat(property.pop()));
						properties[propertyName].unshift(parseFloat(property.pop()));
						break;
					default:
						break;
				}

			}



			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	#readModel(firstLine, model) {
		let i = firstLine;
		let nbBrackets = 0;

		let modelInfo = this.#lines[i].replace(/"/g, "");
		modelInfo = modelInfo.replace("{", "");
		modelInfo = modelInfo.split(",");

		model.id = parseInt(modelInfo[0].split(":")[1]);
		model.name = modelInfo[1].split(":").pop();
		model.type = modelInfo.pop().trim();

		do {
			nbBrackets += Number(this.#lines[i].includes('{'))

			if (this.#lines[i].includes("Properties")) {
				model.properties = {};
				i = this.#readModelProperties(i, model.properties);
			}

			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	/// does nothing for now
	#readConstraint(firstLine, constraint) {
		let i = firstLine;
		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	/// does nothing for now
	#readPoseNode(firstLine, poseNode) {
		let i = firstLine;
		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	/// does nothing for now
	#readPose(firstLine, pose) {
		let i = firstLine;
		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	/// does nothing for now
	#readMaterial(firstLine, material) {
		let i = firstLine;
		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}
	
	#readSkinDeformer(firstLine, deformer) {
		let i = firstLine;
		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))

			if (this.#lines[i].includes("Link_DeformAcuracy:")) {
				const acuracy = parseInt(this.#lines[i].split(":")[1]);
				deformer["Link_DeformAcuracy"] = acuracy;
			}

			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	#readClusterDeformer(firstLine, deformer) {
		let i = firstLine;
		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))

			const property = this.#lines[i].split(":")[0];
			switch(property) {
				case "Indexes":
					++i;
					let indices = "";
					while (!this.#lines[i].includes('}')) {
						indices += this.#lines[i];
						++i;
					}
					deformer["Indexes"] = indices.split(":")[1].split(",");
					deformer["Indexes"] = deformer["Indexes"].map(x => parseInt(x));
				break;
				case "Weights":
					++i;
					let weights = "";
					while (!this.#lines[i].includes('}')) {
						weights += this.#lines[i];
						++i;
					}
					deformer["Weights"] = weights.split(":")[1].split(",");
					deformer["Weights"] = deformer["Weights"].map(x => parseFloat(x));
				break;
				case "Transform":
					deformer["Transform"] = this.#lines[++i].split(":")[1].split(",");
					deformer["Transform"] = deformer["Transform"].map(x => parseFloat(x));
					deformer["Transform"] = new THREE.Matrix4().fromArray(deformer["Transform"]);
				break;
				case "TransformLink":
					deformer["TransformLink"] = this.#lines[++i].split(":")[1].split(",");
					deformer["TransformLink"] = deformer["TransformLink"].map(x => parseFloat(x));
					deformer["TransformLink"] = new THREE.Matrix4().fromArray(deformer["TransformLink"]);
				break;
				default:
			}

			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	#readDeformer(firstLine, deformer) {
		let i = firstLine;

		let deformerInfo = this.#lines[i].replace(/"/g, "");
		deformerInfo = deformerInfo.replace("{", "");
		deformerInfo = deformerInfo.split(",");

		deformer.id = parseInt(deformerInfo[0].split(":")[1]);
		deformer.name = deformerInfo[1].split(":").pop();
		deformer.type = deformerInfo.pop().trim();


		if(deformer.type == "Skin") {
			i = this.#readSkinDeformer(firstLine, deformer);
			this.#skinDeformersById[deformer.id] = deformer;
		}

		if(deformer.type == "Cluster") {
			i = this.#readClusterDeformer(firstLine, deformer);
			this.#deformersById[deformer.id] = deformer;
		}

		return i;
	}

	/// does nothing for now
	#readAnimationStack(firstLine, animationStack) {
		let i = firstLine;
		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	#readAnimationCurve(firstLine, animationCurve) {
		let i = firstLine;

		let curveInfo = this.#lines[i].replace(/"/g, "");
		curveInfo = curveInfo.replace("{", "");
		curveInfo = curveInfo.split(",");

		animationCurve.id = parseInt(curveInfo[0].split(":")[1]);

		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))

			const header = this.#lines[i].split(":")[0];

			switch(header) {
				case "Default": 
					animationCurve.Default = parseFloat(this.#lines[i].split(":")[1])
					break;
				case "KeyTime":
					++i;
					animationCurve.KeyTime = this.#lines[i].split(":")[1];
					animationCurve.KeyTime = animationCurve.KeyTime.split(",");
					animationCurve.KeyTime = animationCurve.KeyTime.map(kt => parseInt(kt));
					break;
				case "KeyValueFloat":
					++i;
					animationCurve.KeyValueFloat = this.#lines[i].split(":")[1];
					animationCurve.KeyValueFloat = animationCurve.KeyValueFloat.split(",");
					animationCurve.KeyValueFloat = animationCurve.KeyValueFloat.map(kf => parseFloat(kf));
					break;
				case "KeyAttrFlags":
					++i;
					animationCurve.KeyAttrFlags = this.#lines[i].split(":")[1];
					animationCurve.KeyAttrFlags = animationCurve.KeyAttrFlags.split(",");
					animationCurve.KeyAttrFlags = animationCurve.KeyAttrFlags.map(kt => parseInt(kt));
					break;
				case "KeyAttrDataFloat":
					++i;
					animationCurve.KeyAttrDataFloat = this.#lines[i].split(":")[1];
					animationCurve.KeyAttrDataFloat = animationCurve.KeyAttrDataFloat.split(",");
					animationCurve.KeyAttrDataFloat = animationCurve.KeyAttrDataFloat.map(kf => parseFloat(kf));
					break;
				case "KeyAttrRefCount":
					++i;
					animationCurve.KeyAttrRefCount = this.#lines[i].split(":")[1];
					animationCurve.KeyAttrRefCount = animationCurve.KeyAttrRefCount.split(",");
					animationCurve.KeyAttrRefCount = animationCurve.KeyAttrRefCount.map(kt => parseInt(kt));
					break;
				default:

			}

			
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	#readAnimationCurveNode(firstLine, animationCurveNode) {
		let i = firstLine;

		let curveInfo = this.#lines[i].replace(/"/g, "");
		curveInfo = curveInfo.replace("{", "");
		curveInfo = curveInfo.split(",");

		animationCurveNode.id = parseInt(curveInfo[0].split(":")[1]);
		animationCurveNode.type = curveInfo[1].split(":").pop();


		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))
			
			if (this.#lines[i].includes("P:")) {
				let line = this.#lines[i].split(":")[1].split(",");
				let axis = line.shift().trim()[3];
				let value = parseFloat(line.pop())
				animationCurveNode[axis] = value;
			}
			
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	#readObjects() {
		this.#objects.nodeAttributes = [];
		this.#objects.geometries = [];
		this.#objects.models = [];
		this.#objects.constraint = [];
		this.#objects.pose = [];
		this.#objects.materials = [];
		this.#objects.deformers = [];
		this.#objects.animationStacks = [];
		this.#objects.animationCurves = [];
		this.#objects.animationCurveNodes = [];


		let objectsStart = this.#findLine('Objects:');
		let i = objectsStart;

		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))

			if (this.#lines[i].includes("NodeAttribute:")) {
				let nodeAttribute = {};
				i = this.#readNodeAttribute(i, nodeAttribute);
				this.#objects.nodeAttributes.push(nodeAttribute);
			}

			if(this.#lines[i].includes('Geometry:')){
				let geometry = {};
				i = this.#readGeometry(i, geometry);
				this.#objects.geometries.push(geometry);
			}

			if(this.#lines[i].includes('Model:') && !this.#lines[i].includes('ShadingModel:')){
				let model = {};
				i = this.#readModel(i, model);
				this.#objects.models.push(model);
			}

			if(this.#lines[i].includes('Constraint:') && !this.#lines[i].includes('ShadingModel:')){
				let constraint = {};
				i = this.#readConstraint(i, constraint);
				this.#objects.constraint.push(constraint);
			}

			if(this.#lines[i].includes('Pose:') && !this.#lines[i].includes('ShadingModel:')){
				let pose = {};
				i = this.#readPose(i, pose);
				this.#objects.pose.push(pose);
			}

			if(this.#lines[i].includes('Material:') && !this.#lines[i].includes('ShadingModel:')){
				let material = {};
				i = this.#readMaterial(i, material);
				this.#objects.materials.push(material);
			}

			if(this.#lines[i].includes('Deformer:') && !this.#lines[i].includes('ShadingModel:')){
				let deformer = {};
				i = this.#readDeformer(i, deformer);
				this.#objects.deformers.push(deformer);
			}

			if(this.#lines[i].includes('AnimationStack:') && !this.#lines[i].includes('ShadingModel:')){
				let animationStack = {};
				i = this.#readAnimationStack(i, animationStack);
				this.#objects.animationStacks.push(animationStack);
			}

			if(this.#lines[i].includes('AnimationCurve:') && !this.#lines[i].includes('ShadingModel:')){
				let animationCurve = {};
				i = this.#readAnimationCurve(i, animationCurve);
				this.#objects.animationCurves.push(animationCurve);
			}

			if(this.#lines[i].includes('AnimationCurveNode:') && !this.#lines[i].includes('ShadingModel:')){
				let animationCurveNode = {};
				i = this.#readAnimationCurveNode(i, animationCurveNode);
				this.#objects.animationCurveNodes.push(animationCurveNode);
			}


			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[objectsStart], " -> ", this.#lines[i - 1]);
	}

	#readConnectionOO(i, connectionOO) {
		let line = this.#lines[i].split(",");
		connectionOO.childId = parseInt(line[1]);
		connectionOO.parentId = parseInt(line[2]);
		return i;
	}

	#readConnectionOP(i, connectionOP) {
		let line = this.#lines[i].split(",");
		connectionOP.childId = parseInt(line[1]);
		connectionOP.parentId = parseInt(line[2]);
		connectionOP.propertyName = line[3];
		return i;
	}

	#readConnections() {
		this.#connections = {
			OO: [],
			OP: [],
		}

		let firstLine = this.#findLine('Connections:');
		let i = firstLine;



		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))

			let connection = {};
			if (this.#lines[i].includes("OO")) {
				this.#readConnectionOO(i, connection);
				this.#connections.OO.push(connection)
			}
			if (this.#lines[i].includes("OP")) {
				this.#readConnectionOP(i, connection);
				this.#connections.OP.push(connection)
			}
			
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		// console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

	}

	#processGeometry(geometry) {
		const cmap2 = mapFromGeometry({v: geometry.vertices, f: geometry.polygons});
		this.#geometriesById[geometry.id] = cmap2;	
		return cmap2;
	}

	#processSkeleton() {
		this.#skeleton = new Skeleton;
		this.#boneInitTransform = this.#skeleton.newBoneAttribute("initTransform");
		this.#boneById = {};
		// const meshes = {};

		// TODO : pre sort models by type
		this.#objects.models.forEach(model => {
			if(model.type != "LimbNode")
				return;

			/// creating bones
			const bone = this.#skeleton.newBone(model.name);
			this.#boneById[model.id] = bone; 

			/// setting bone local transform
			const rotation = new Quaternion;
			if(model.properties["PreRotation"]) {
				const eulerRotation = new THREE.Euler().fromArray([...(model.properties["PreRotation"].map(angle => angle*Math.PI/180)), 'ZYX']);
				rotation.setFromEuler(eulerRotation);
				rotation.normalize();
			}
			
			const vTranslation = new THREE.Vector3();
			if(model.properties["Lcl Translation"]) {
				vTranslation.fromArray(model.properties["Lcl Translation"])
			}
			const translation = new Quaternion(vTranslation.x, vTranslation.y, vTranslation.z, 0);

			if(model.properties["Lcl Rotation"]) {
				console.log("Lcl Rotation")
			}

			
			
			// this.#skeleton.setLocalTransform(bone, transform);

			this.#boneInitTransform[bone] = {R: rotation, T: translation};

			// tpose keyframe
			const transform = DualQuaternion.setFromTranslationRotation(rotation, translation);
			// this.#skeleton.addKey(bone, new Key(-1, transform));
		});


		this.#connections.OO.forEach(connection => {
			if(connection.parentId == 0)
				return;

			let childBone = this.#boneById[connection.childId];
			let parentBone = this.#boneById[connection.parentId];
			/// skip node attributes, materials, etc...
			if(childBone == undefined || parentBone == undefined) 
				return;

			this.#skeleton.setParent(childBone, parentBone);
		});

	}

	#processAnimation() {
		const connections = this.#connections.OP;
		const animationCurves = {};
		const animationCurveNodes = {};

		this.#objects.animationCurves.forEach(animationCurve => {
			animationCurves[animationCurve.id] = animationCurve;
		});
		this.#objects.animationCurveNodes.forEach(animationCurveNode => {
			animationCurveNodes[animationCurveNode.id] = animationCurveNode;
		});

		console.log(animationCurves)
		console.log(this.#objects.animationCurveNodes)

		// find node curves for each axis
		connections.forEach(connection => {
			if(animationCurves[connection.childId] && animationCurveNodes[connection.parentId]) {
				const axis = connection.propertyName[4]; /// not great
				const animationCurveNode = animationCurveNodes[connection.parentId];
				animationCurveNode[axis] = animationCurves[connection.childId];
			}
		});

		// attach node to bone
		this.#boneNode = this.#skeleton.newBoneAttribute("boneNode");
		const visitedBones = [];
		connections.forEach(connection => {
			visitedBones[ this.#boneById[connection.parentId]] ??= 1;
			if(animationCurveNodes[connection.childId] && this.#boneById[connection.parentId] != undefined) {
				const animationCurveNode = animationCurveNodes[connection.childId];
				const bone = this.#boneById[connection.parentId];
				console.log(bone, animationCurveNode)

				this.#boneNode[bone] ??= {};
				this.#boneNode[bone][animationCurveNode.type] = animationCurveNode;
			}
		});

		/// create keyframes
		this.#skeleton.foreachBone(bone => {
			const node = this.#boneNode[bone];
			console.log(node, bone)

			/// set T-Pose key
			const initTransform = this.#boneInitTransform[bone];
			this.#skeleton.addKey(bone, new Key(-1, DualQuaternion.setFromTranslationRotation(initTransform.R, initTransform.T)));

			if(node == undefined) 
				return;



			const nbFrames = node.R?.X.KeyTime.length ?? node.T?.X.KeyTime.length;
			
			// console.log(nbFrames, initTransform, bone)

			for(let i = 0; i < nbFrames; ++i) {
				const rotation = new Quaternion();
				if(node.R != undefined) {
					console.log(node.R.X.KeyValueFloat[i], node.R.Y.KeyValueFloat[i], node.R.Z.KeyValueFloat[i])
					const eulerRotation = new THREE.Euler(node.R.X.KeyValueFloat[i]*(Math.PI/180), node.R.Y.KeyValueFloat[i]*(Math.PI/180), node.R.Z.KeyValueFloat[i]*(Math.PI/180), 'ZYX');
					rotation.setFromEuler(eulerRotation);
					rotation.normalize();
					rotation.premultiply(initTransform.R)
				} 
				else {
					rotation.copy(initTransform.R);
				}

				const translation = new Quaternion();
				if(node.T != undefined) {
					translation.x = node.T.X.KeyValueFloat[i];
					translation.y = node.T.Y.KeyValueFloat[i];
					translation.z = node.T.Z.KeyValueFloat[i];
					translation.w = 0;
				} 
				else {
					translation.copy(initTransform.T);
				}

				const transform = DualQuaternion.setFromTranslationRotation(rotation, translation);
				const timeStamp =  node.R?.X.KeyTime[i] ?? node.T?.X.KeyTime[i];
				this.#skeleton.addKey(bone, new Key(timeStamp, transform));
				
			}
		});

		console.log(this.#boneNode)
		console.log(visitedBones)
		console.log(connections)
	}

	#skinSkeleton() {
		this.#cmaps.forEach(cmap => {
			const weights = cmap.addAttribute(cmap.vertex, "weights");
			cmap.foreach(cmap.vertex, vd => {
				weights[cmap.cell(cmap.vertex, vd)] = [];
			});
		})

		const skinsToGeometry = {};
		const subdeformerToSkin = {};

		this.#connections.OO.forEach(connection => {
			if(this.#skinDeformersById[connection.childId]) {
				skinsToGeometry[connection.childId] = this.#geometriesById[connection.parentId];
				return;
			}

			if(this.#deformersById[connection.childId] && this.#skinDeformersById[connection.parentId]) {
				subdeformerToSkin[connection.childId] = connection.parentId;
				if(connection.childId == 66207584) {
					console.log(this.#deformersById[connection.childId])
				}

				return;
			}

			if(this.#boneById[connection.childId] != undefined && this.#deformersById[connection.parentId] != undefined) {
				const bone = this.#boneById[connection.childId];
				const subdeformer = this.#deformersById[connection.parentId];

				const cmap = skinsToGeometry[subdeformerToSkin[connection.parentId]];
				const weights = cmap.getAttribute(cmap.vertex, "weights");
				for(let i = 0; i < (subdeformer.Indexes?.length || 0); ++i) {
					weights[subdeformer.Indexes[i]].push({b: bone, w: subdeformer.Weights[i]});
				}
				return;
			}
		});
	}

	getSkeleton() {
		return this.#skeleton;		
	}

	// static async readFile(filePath) {
	// 	const xhttp = new XMLHttpRequest();
	// 	xhttp.onreadystatechange = function () {
	// 		if(this.status == 200)
	// 			return new FBXImporter(this.responseText);
	// 	}
	// 	xhttp.open("GET", filePath, false);
	// 	xhttp.send();
	// }
}