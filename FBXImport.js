import  CMap2  from "./CMapJS/CMap/CMap2.js";
import { mapFromGeometry } from "./CMapJS/IO/SurfaceFormats/CMap2IO.js";

export default class FBXImporter {
	#fbxString;
	#lines;
	#objects = {};
	#cmaps = [];
	cmap;
	constructor(fbxString) {
		this.#fbxString = fbxString;
		this.#clean();
		console.log(this.#lines.length)
		this.#readObjects();

		this.#cmaps.push(this.#processGeometry(this.#objects.geometries[0]));
		console.log(this.#cmaps)
		this.cmap = this.#cmaps[0];
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
		return i;
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

		return i;
	}

	#readGeometry(firstLine, geometry) {
		let i = firstLine;
		console.log(this.#lines[i])

		let nbBrackets = 0;
		do {
			nbBrackets += Number(this.#lines[i].includes('{'))

			if(this.#lines[i].includes('Vertices')){
				geometry.vertices = [];
				i = this.#readVertices(i, geometry.vertices);
			}
			if(this.#lines[i].includes('PolygonVertexIndex')){
				geometry.polygons = [];
				i = this.#readPolygons(i, geometry.polygons);
			}
			if(this.#lines[i].includes('Edges')){
				geometry.edges = [];
				i = this.#readEdges(i, geometry.edges);
			}
			nbBrackets -= Number(this.#lines[i].includes('}'))
			++i;
		} while(nbBrackets != 0)
		return i;
	}

	#readObjects() {
		let objectsStart = this.#findLine('Objects');
		console.log(objectsStart)

		this.#objects.nodeAttributes = [];
		let i = objectsStart + 1;
		let nbBrackets = 0;

		while(this.#lines[i].includes("NodeAttribute")) {
			let nodeAttribute = {};
			i = this.#readNodeAttribute(i, nodeAttribute);
			this.#objects.nodeAttributes.push(nodeAttribute);
		}

		this.#objects.geometries = [];
		while(this.#lines[i].includes("Geometry")) {
			let geometry = {};
			i = this.#readGeometry(i, geometry);
			this.#objects.geometries.push(geometry)
		}

		console.log(this.#objects)
	}

	#processGeometry(geometry) {
		const cmap2 = mapFromGeometry({v: geometry.vertices, f: geometry.polygons});
		return cmap2;
	}

	static async readFile(filePath) {
		const xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function () {
			if(this.status == 200)
				return new FBXImporter(this.responseText);
		}
		xhttp.open("GET", filePath, false);
		xhttp.send();
	}
}