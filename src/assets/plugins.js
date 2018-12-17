const rq = require("electron-require");
const dialog = rq.electron("dialog");
const Tabletop = rq("tabletop");
const os = rq("os");
const unzip = rq("unzip");
const fs = rq("fs-extra");
const path = rq("path");
const winDir = "C:\\Program Files (x86)\\Steam\\steamapps\\common";
const linuxDir = "~/.local/share/Steam/steamapps/common";
let plugs;

function showInfo(data, tt) {
	const plugins = tt.sheets("List").elements.slice(1);
	plugs = plugins;
	for (let i = 0; i < plugins.length; i++) {
		const containerDiv = document.createElement("div");
		containerDiv.id = `plugin${i}-div`;
		const input = document.createElement("input");
		input.type = "checkbox";
		input.id = `plugin-${i}`;
		input.name = `plugin${i}`;
		input.classList.add("plugin");
		input.value = plugins[i].Name;
		const label = document.createElement("label");
		label.htmlFor = `plugin-${i}`;
		label.title = plugins[i].Description;
		label.appendChild(document.createTextNode(plugins[i].Name));
		containerDiv.appendChild(input);
		containerDiv.appendChild(label);
		containerDiv.appendChild(document.createElement("br"));
		const list = document.getElementById("pluginList");
		list.appendChild(containerDiv);
	}
	document.getElementById("loading").style.display = "none";
}

window.onload = () => {
	const locBrowse = document.getElementById("locBrowseBtn");
	const submitBtn = document.getElementById("submit");

	locBrowse.addEventListener("click", () => {
		dialog.showOpenDialog({
			defaultPath: os.platform() === "win32" ? winDir : os.platform() === "linux" ? linuxDir : "",
			properties: ["openDirectory"]
		}, paths => {
			if (paths[0]) {
				const distLocInput = document.getElementById("distLocation");
				distLocInput.value = paths[0];
			}
		});
	});

	function extractZip(specLoc, distLoc) {
		console.log(specLoc, distLoc);
		const infoP = document.getElementById("failP") || document.getElementById("successP") || document.getElementById("infoP");
		infoP.innerText = "Extracting...";
		fs.createReadStream(specLoc).pipe(unzip.Extract({
			path: `${path.resolve(__dirname)}/tmp/`
		}).on("close", () => {
			console.log("Extracted");
			if (path.resolve(specLoc) === path.resolve(`${__dirname}/Spectrum.zip`)) {
				fs.remove(path.resolve(`${__dirname}/Spectrum.zip`));
				console.log("Deleted downloaded Spectrum zip");
			}
			// TODO: move contents into plugins folder
			//installSpectrum(distLoc);
		}));
	}

	async function downloadLatest(githubPage, distLoc) {
		const repo = ""; //TODO: find user/repo names from githubPage url
		const latestRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
			method: "GET",
			headers: {
				"Cache-Control": "no-cache",
				Accept: "application/vnd.github.v3+json"
			}
		});
		const latestjson = await latestRes.json();
		console.log("Found latest release");


		const currentRes = await fetch(latestjson.assets[0].browser_download_url);
		const dest = fs.createWriteStream(`${path.resolve(__dirname)}/Spectrum.zip`);
		currentRes.body.pipe(dest);
		dest.on("close", () => {
			console.log("Downloaded to", path.resolve(__dirname));
			extractZip(`${path.resolve(__dirname)}/Spectrum.zip`, distLoc);
		});
	}

	submitBtn.addEventListener("click", () => {
		// const infoP = document.getElementById("failP") || document.getElementById("successP") || document.getElementById("infoP") || document.createElement("P");
		// infoP.setAttribute("id", "infoP");
		// infoP.innerText = "Checking...";
		// document.body.appendChild(infoP);
		const distLocInput = document.getElementById("distLocation");
		const plugins = document.getElementsByClassName("plugin");
		const checked = [];
		const wantedPlugins = [];
		for (const plugin of plugins) {
			if (plugin.checked) {
				const reg = /plugin-(\d+)/gi;
				const index = reg.exec(plugin.id)[1];
				checked.push(index);
			}
		}
		for (const index of checked) {
			wantedPlugins.push(plugs[index]);
		}
		if (!wantedPlugins[0]) {
			console.log("No plugins selected");
		}
		console.log(wantedPlugins);
		// const specLocInput = document.getElementById("specLocation");
		// if (!specLocInput.value) {
		// 	infoP.innerText = "Downloading...";
		// 	console.log("Downloading latest Spectrum...");
		// 	downloadLatest(distLocInput.value);
		// } else if (distLocInput.value && specLocInput.value) {
		// 	extractZip(specLocInput.value, distLocInput.value);
		// }
	});


	Tabletop.init({
		key: "https://docs.google.com/spreadsheets/d/1vMQFPP3VzR9KN3SEWljszxyuGZCQ-GvFa_5sp87SlnQ/pubhtml",
		callback: showInfo
	});
};
