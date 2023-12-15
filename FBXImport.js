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


	#readObjects() {
		let objectsStart = this.#findLine('Objects:');

		this.#objects.nodeAttributes = [];
		this.#objects.geometries = [];
		this.#objects.models = [];
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
				this.#objects.models.push(model)
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