import  CMap2  from "./CMapJS/CMap/CMap2.js";
import { mapFromGeometry } from "./CMapJS/IO/SurfaceFormats/CMap2IO.js";

export default class FBXImporter {
	#fbxString;
	#lines;
	#objects = {};
	#connections = {};
	#cmaps = [];
	cmaps;
	constructor(fbxString) {
		this.#fbxString = fbxString;
		this.#clean();
		console.log(this.#lines.length)
		this.#readObjects();
		// this.#readConnections();
		
		this.#objects.geometries.forEach(geometry => {
			this.#cmaps.push(this.#processGeometry(geometry));
		})

		console.log(this.#cmaps)
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
		console.log(this.#lines[i])
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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i]);
		
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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i]);

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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}


	#readGeometry(firstLine, geometry) {
		let i = firstLine;

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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

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
				console.log(property)
				const propertyName = property.shift().trim()
				// properties[propertyName] = [];

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

		console.log(properties)
		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

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
					deformer["indexes"] = deformer["indexes"].map(x => {return parseInt(x)});
				break;
				case "Weights":
					deformer["weights"] = this.#lines[++i].split(":")[1].split(",");
					deformer["weights"] = deformer["weights"].map(x => {return parseFloat(x)});
				break;
				case "Transform":
					deformer["transform"] = this.#lines[++i].split(":")[1].split(",");
					deformer["transform"] = deformer["transform"].map(x => {return parseFloat(x)});
				break;
				case "TransformLink":
					deformer["transformLink"] = this.#lines[++i].split(":")[1].split(",");
					deformer["transformLink"] = deformer["transformLink"].map(x => {return parseFloat(x)});
				break;
				default:
			}

			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	#readDeformer(firstLine, deformer) {
		let i = firstLine;
		// let nbBrackets = 0;

		let deformerInfo = this.#lines[i].replace(/"/g, "");
		deformerInfo = deformerInfo.replace("{", "");
		deformerInfo = deformerInfo.split(",");

		deformer.id = parseInt(deformerInfo[0].split(":")[1]);
		deformer.name = deformerInfo[1].split(":").pop();
		deformer.type = deformerInfo.pop().trim();

		if(deformer.type == "Skin")
			i = this.#readSkinDeformer(firstLine, deformer);

		if(deformer.type == "Cluster")
			i = this.#readClusterDeformer(firstLine, deformer);

		console.log(this.#lines[firstLine], " -> ", this.#lines[i]);
		console.log(deformer)
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

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		return i - 1;
	}

	#readAnimationCurve(firstLine, animationCurve) {
		let i = firstLine;
		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

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


			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		console.log(this.#lines[objectsStart], " -> ", this.#lines[i - 1]);
	}

	#readConnections() {
		let firstLine = this.#findLine('Connections:');
		let i = firstLine;

		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))

			// if (this.#lines[i].includes("NodeAttribute:")) {
			// 	let nodeAttribute = {};
			// 	i = this.#readNodeAttribute(i, nodeAttribute);
			// 	this.#objects.nodeAttributes.push(nodeAttribute);
			// }
			
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)

		console.log(this.#lines[firstLine], " -> ", this.#lines[i - 1]);

		console.log(this.#connections)
		console.log(this.#lines.length, i)
	}

	#processGeometry(geometry) {
		const cmap2 = mapFromGeometry({v: geometry.vertices, f: geometry.polygons});
		return cmap2;
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