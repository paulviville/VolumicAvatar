

export default class FBXImporter {
	#fbxString;
	#lines;
	#objects = {};

	constructor(fbxString) {
		this.#fbxString = fbxString;
		this.#clean();
		console.log(this.#lines)
		this.#readObjects();
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

	#readObjects() {
		let objectsStart = this.#findLine('Objects');
		console.log(objectsStart)

		this.#objects.nodeAttributes = [];
		let i = objectsStart + 1;
		let nbBrackets = 0;
		
		while(this.#lines[i].includes("NodeAttribute")) {
			nbBrackets = 0;
			do {
				nbBrackets += Number(this.#lines[i].includes('{'))
				nbBrackets -= Number(this.#lines[i].includes('}'))
				++i;
			} while(nbBrackets != 0)
		}
	}
 
	static async readFile(filePath) {
		const xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function () {
			if(this.status == 200)
				return new FBXImporter(this.responseText);
		}
		xhttp.open("GET", filePath, false);
		xhttp.send();
		console.log(filePath)
	}
}