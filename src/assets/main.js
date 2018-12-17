const rq = require("electron-require");
const dialog = rq.electron("dialog");
const os = rq("os");
const fs = rq("fs-extra");
const path = rq("path");
const unzip = rq("unzip");
const isDev = rq("electron-is-dev");
const fetch = rq("node-fetch");
// const shell = rq.electron("shell");
// const {
// 	spawn
// } = rq("child_process");
const shelljs = rq("shelljs");
const winDir = "C:\\Program Files (x86)\\Steam\\steamapps\\common";
const linuxDir = "~/.local/share/Steam/steamapps/common";
const winInstall = "install_windows.bat";
const linuxInstall = "install_linux.sh";

window.onload = () => {
	if (isDev) {
		const specLoc = document.getElementById("specLocation");
		specLoc.value = "E:\\User Profile\\Downloads\\Spectrum.zip";
	}
	const locBrowse = document.getElementById("locBrowseBtn");
	const specBrowse = document.getElementById("specBrowseBtn");
	const submitBtn = document.getElementById("submit");
	//const location = document.getElementById("location");
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
	specBrowse.addEventListener("click", () => {
		dialog.showOpenDialog({
			defaultPath: os.platform() === "win32" ? winDir : os.platform() === "linux" ? linuxDir : "",
			filters: [{
				name: "Spectrum Zip",
				extensions: ["zip"]
			}],
			properties: ["openFile"]
		}, paths => {
			if (paths[0]) {
				const specLocInput = document.getElementById("specLocation");
				specLocInput.value = paths[0];
			}
		});
	});
	submitBtn.addEventListener("click", () => {
		const infoP = document.getElementById("failP") || document.getElementById("successP") || document.getElementById("infoP") || document.createElement("P");
		infoP.setAttribute("id", "infoP");
		infoP.innerText = "Checking...";
		document.body.appendChild(infoP);
		const distLocInput = document.getElementById("distLocation");
		const specLocInput = document.getElementById("specLocation");
		if (!specLocInput.value) {
			infoP.innerText = "Downloading...";
			console.log("Downloading latest Spectrum...");
			downloadLatest(distLocInput.value);
		} else if (distLocInput.value && specLocInput.value) {
			extractZip(specLocInput.value, distLocInput.value);
		}
	});
};

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
		installSpectrum(distLoc);
	}));
}

async function downloadLatest(distLoc) {
	const repo = "Ciastex/Spectrum";
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

async function installSpectrum(distLoc) {
	const infoP = document.getElementById("failP") || document.getElementById("successP") || document.getElementById("infoP");
	infoP.innerText = "Installing...";
	try {
		await fs.copy(`${path.resolve(__dirname)}/tmp/`, `${distLoc}/Distance_Data/`);
		console.log("Copied");
		await fs.remove(`${path.resolve(__dirname)}/tmp/`);
		console.log("Deleted tmp");
		const file = os.platform() === "win32" ? winInstall : os.platform() === "linux" ? linuxInstall : "";
		if (file === "") {
			throw new Error("Wrong platform");
		}
		let fail = 0;
		const lines = [];
		const failIndex = [];
		const child = shelljs.exec(`"${distLoc}/Distance_Data/Managed/${file}"`, {
			async: true,
			cwd: `${distLoc}/Distance_Data/Managed/`
		});
		child.stdout.on("data", data => {
			console.log(data);
			lines.push(data);
			if (data.includes("Press any key to continue")) {
				if (fail > 0) {
					let str = "";
					for (const i of failIndex) {
						str += lines[i] + "\r\n";
					}
					const failP = document.getElementById("failP") || document.getElementById("successP") || document.getElementById("infoP");
					failP.setAttribute("id", "failP");
					failP.innerText = str;
					//document.body.appendChild(failP);
				} else {
					const successP = document.getElementById("failP") || document.getElementById("successP") || document.getElementById("infoP");
					successP.setAttribute("id", "successP");
					successP.innerText = "Successfully installed Spectrum!";
					//document.body.appendChild(successP);
				}
				child.kill("SIGINT");
				console.log("killed");
			} else {
				console.log(data.search(/failed/gi));
				if (data.search(/failed/gi) > 0) {
					fail++;
					failIndex.push(lines.length - 1);
				}
			}
		});
	} catch (e) {
		console.error(e);
	}
}
