const rq = require("electron-require");
const fs = rq("fs-extra");
const path = rq("path");
const url = rq("url");
const fetch = rq("node-fetch");
//const unzip = rq("unzip");
const sevenBin = require("7zip-bin");
const Seven = require("node-7z");
const pathTo7zip = sevenBin.path7za;

async function downloadZipFromGithub(githubPage) {
	console.log("githubPage", githubPage);
	const reg = /https?:\/\/github\.com\/(.+)\/([^/\s]+)/gi;
	const arr = reg.exec(githubPage);
	if (!arr) {
		return -1;
	}
	const name = arr[1];
	const repo = arr[2];
	console.log("name", name, "repo", repo);
	const latestRes = await fetch(`https://api.github.com/repos/${name}/${repo}/releases/latest`, {
		method: "GET",
		headers: {
			"Cache-Control": "no-cache",
			Accept: "application/vnd.github.v3+json"
		}
	});
	console.log("latestRes", latestRes);
	const latestjson = await latestRes.json();
	console.log("latestjson", latestjson);
	if (!latestjson.assets) {
		return -3;
	}
	console.log("Found latest release", latestjson.assets[0].browser_download_url);

	const testType = path.parse(latestjson.assets[0].name);
	if (testType.ext === ".zip" || testType.ext === ".7z") {
		const zipPath = await directDownloadZip(latestjson.assets[0].browser_download_url, repo);
		console.log("zipPath", zipPath);
		return zipPath;
	} else {
		return -4;
	}
}

async function directDownloadZip(fullUrl, repo) {
	const testType = path.parse(url.parse(fullUrl).pathname);
	console.log("testType", testType);
	if (testType.ext === ".zip" || testType.ext === ".7z") {
		const filename = testType.base;
		const currentRes = await fetch(fullUrl);
		const dest = fs.createWriteStream(path.resolve(`${__dirname}/${filename}`));
		currentRes.body.pipe(dest);
		return new Promise(resolve => {
			dest.on("close", () => {
				console.log("Downloaded to", path.resolve(`${__dirname}/${filename}`));
				resolve({
					repoName: repo,
					path: path.resolve(`${__dirname}/${filename}`)
				});
			});
		});
	} else {
		return -2;
	}
}

function getEntries(zipLoc) {
	return new Promise((resolve, reject) => {
		const uniqueEntries = [];
		const myStream = Seven.list(zipLoc, {
			$bin: pathTo7zip
		});
		myStream.on("data", data => {
			console.log("data", data);
			const reg = /^([^/\s]+)/img;
			const match = reg.exec(data.file);
			if (!uniqueEntries.includes(match)) {
				uniqueEntries.push(match);
			}
		});
		myStream.on("end", () => {
			console.log("myStream.info", myStream.info);
			resolve(uniqueEntries.length);
		});
		myStream.on("error", err => {
			reject(err);
		});

	});
}

function checkPluginZipFileStructure(zipLoc, destLoc, plugin) {
	return new Promise((resolve, reject) => {
		if (plugin) {
			getEntries(zipLoc).then(entryCount => {
				console.log("entryCount", entryCount);
				if (entryCount > 1) {
					fs.ensureDir(`${destLoc}/${plugin}`, err => {
						if (err) {
							reject(err);
						} else {
							console.log("Made directory");
							resolve(path.resolve(`${destLoc}/${plugin}`));
						}
					});
				} else {
					resolve(destLoc);
				}
			});
		} else {
			resolve(destLoc);
		}
	});
}

function extractZip(zipLoc, olddestLoc, deleteZip, plugin) {
	return new Promise((resolve, reject) => {
		console.log("zipLoc", zipLoc, "olddestLoc", olddestLoc);
		checkPluginZipFileStructure(zipLoc, olddestLoc, plugin).then(destLoc => {
			console.log("destLoc", destLoc);
			const myStream = Seven.extract(zipLoc, destLoc, {
				$bin: pathTo7zip
			});
			myStream.on("end", () => {
				console.log("Extracted");
				if (deleteZip) {
					fs.remove(path.resolve(zipLoc), err => {
						if (err) {
							reject(err);
						} else {
							console.log("Deleted downloaded zip");
							resolve();
						}
					});
				} else {
					resolve();
				}
			});
			myStream.on("error", err => {
				reject(err);
			});
		});
	});
}

module.exports = {
	downloadZipFromGithub,
	extractZip,
	directDownloadZip
};
