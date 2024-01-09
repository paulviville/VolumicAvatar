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
					deformer["indexes"] = this.#lines[++i].split(":")[1].split(",");
					deformer["indexes"] = deformer["indexes"].map(x => parseInt(x));
				break;
				case "Weights":
					deformer["weights"] = this.#lines[++i].split(":")[1].split(",");
					deformer["weights"] = deformer["weights"].map(x => parseFloat(x));
				break;
				case "Transform":
					deformer["transform"] = this.#lines[++i].split(":")[1].split(",");
					deformer["transform"] = deformer["transform"].map(x => parseFloat(x));
				break;
				case "TransformLink":
					deformer["transformLink"] = this.#lines[++i].split(":")[1].split(",");
					deformer["transformLink"] = deformer["transformLink"].map(x => parseFloat(x));
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
				this.#objects.animationCurves.push(animationCurveNode);
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

			const transform = DualQuaternion.setFromTranslationRotation(rotation, translation);
			
			
			// this.#skeleton.setLocalTransform(bone, transform);
			this.#skeleton.addKey(bone, new Key(0, transform));
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

	#skinSkeleton() {
		const deformers = this.#objects.deformers;
		// console.log(deformers)
		// console.log(this.#connections.OO)
		// console.log(this.#connections.OP)
		// console.log(this.#deformersById)
		const skinsToGeometry = {};
		const subdeformerToSkin = {};

		this.#connections.OO.forEach(connection => {
			// console.log(connection);
			// console.log(connection.childId, this.#deformersById[connection.childId], connection.parentId, this.#deformersById[connection.parentId])
			if(this.#skinDeformersById[connection.childId]) {
				skinsToGeometry[connection.childId] = this.#geometriesById[connection.parentId];
				// console.log(this.#skinDeformersById[connection.childId], this.#geometriesById[connection.parentId])
				return;
			}

			if(this.#deformersById[connection.childId] && this.#skinDeformersById[connection.parentId]) {
				console.log(this.#deformersById[connection.childId], this.#skinDeformersById[connection.parentId])
				subdeformerToSkin[connection.childId] = connection.parentId;
				return;
			}

			if(this.#boneById[connection.childId] && this.#deformersById[connection.parentId]) {
				console.log(this.#boneById[connection.childId], this.#deformersById[connection.parentId])

				return;
			}

		
		});

		console.log(skinsToGeometry)
		console.log(subdeformerToSkin)

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