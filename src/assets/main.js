const rq = require("electron-require");
const dialog = rq.electron("dialog");
const os = rq("os");
const fs = rq("fs-extra");
const path = rq("path");
const unzip = rq("unzip");
const isDev = rq("electron-is-dev");
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
		const distLocInput = document.getElementById("distLocation");
		const specLocInput = document.getElementById("specLocation");
		if (distLocInput.value && specLocInput.value) {
			fs.createReadStream(specLocInput.value).pipe(unzip.Extract({
				path: `${path.resolve(__dirname)}/tmp/`
			}).on("close", () => {
				console.log("Written");
				installSpectrum(distLocInput.value);
			}));
		}
	});
};

async function installSpectrum(distLoc) {
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
					const failP = document.createElement("P");
					failP.setAttribute("id", "failP");
					failP.appendChild(document.createTextNode(str));
					document.body.appendChild(failP);
				} else {
					const successP = document.createElement("P");
					successP.setAttribute("id", "successP");
					successP.appendChild(document.createTextNode("Successfully installed Spectrum!"));
					document.body.appendChild(successP);
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

		// shell.openExternal(`${distLoc}\\Distance_Data\\Managed\\${file}`, {
		// 	cwd: `${distLoc}\\Distance_Data\\Managed`
		// });

		// const uh = spawn("cmd.exe", ["/c", "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Distance\\Distance_Data\\Managed\\install_windows.bat"], {
		// 	cwd: "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Distance\\Distance_Data\\Managed"
		// });
		// uh.on("error", (err) => {
		// 	console.error(err);
		// });
		// uh.on("data", (data) => {
		// 	console.log(data);
		// });
		// uh.on("close", (code) => {
		// 	console.log(code);
		// });

		//shell.openItem(`"${distLoc}\\Distance_Data\\Managed\\${file}"`);

		// exec(`cd "${distLoc}\\Distance_Data\\Managed" & pause`, {
		// 	shell: true
		// });
	} catch (e) {
		console.error(e);
	}
}
