const rq = require("electron-require");
const dialog = rq.electron("dialog");
const Tabletop = rq("tabletop");
const os = rq("os");
const path = rq("path");
const util = require("./assets/util.js");
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
		if (wantedPlugins[0]) {
			console.log(wantedPlugins);
			const infoP = document.getElementById("infoP") || document.getElementById("successP") || document.getElementById("failP") || document.createElement("P");
			infoP.id = "infoP";
			document.body.appendChild(infoP);
			downloadPlugins(wantedPlugins, infoP, distLocInput.value).then(msg => {
				if (msg) {
					infoP.innerText = msg;
					infoP.id = "failP";
				} else {
					infoP.innerText = "Done!";
					infoP.id = "successP";
				}
			});
		}
	});

	async function downloadPlugins(wantedPlugins, infoP, distLoc) {
		for (let i = 0; i < wantedPlugins.length; i++) {
			infoP.innerText = `Downloading ${wantedPlugins[i].Name}...`;
			let zipLocation;
			const reg = /https?:\/\/github\.com\/(.+)\/([^/\s]+)/gi;
			const arr = reg.exec(wantedPlugins[i].Source);
			if (!arr) {
				const reg1 = /(?=\.zip$)/img;
				const arr1 = reg1.exec(wantedPlugins[i].Download);
				if (!arr1) {
					zipLocation = -2;
				} else {
					zipLocation = await util.directDownloadZip(wantedPlugins[i].Download);
				}
			} else {
				zipLocation = await util.downloadZipFromGithub(wantedPlugins[i].Source);
			}
			console.log("zipLocation", zipLocation);
			if (zipLocation !== -1 && zipLocation !== -2 && zipLocation !== -3) {
				infoP.innerText = `Extracting ${wantedPlugins[i].Name}...`;
				await util.extractZip(zipLocation.path, path.resolve(`${distLoc}/Distance_Data/Spectrum/Plugins/`), true, zipLocation.repoName);
			} else if (zipLocation === -1) {
				return `Failed downloading ${wantedPlugins[i].Name}. Remaining plugins skipped.`;
			} else if (zipLocation === -2) {
				return `${wantedPlugins[i].Name} is not in zip format. Remaining plugins skipped.`;
			} else if (zipLocation === -3) {
				return `${wantedPlugins[i].Name} either has no releases or is in a pre-release state. Remaining plugins skipped.`;
			}
		}
		return;
	}


	Tabletop.init({
		key: "https://docs.google.com/spreadsheets/d/1vMQFPP3VzR9KN3SEWljszxyuGZCQ-GvFa_5sp87SlnQ/pubhtml",
		callback: showInfo
	});
};
