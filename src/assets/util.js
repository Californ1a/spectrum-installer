const rq = require("electron-require");
const fs = rq("fs-extra");
const path = rq("path");
const fetch = rq("node-fetch");
const unzip = rq("unzip");

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

	const reg1 = /(?=\.zip$)/img;
	const arr1 = reg1.exec(latestjson.assets[0].name);
	if (arr1 && arr1[0] === "") {
		const currentRes = await fetch(latestjson.assets[0].browser_download_url);
		const dest = fs.createWriteStream(path.resolve(`${__dirname}/${latestjson.assets[0].name}`));
		currentRes.body.pipe(dest);
		return new Promise(resolve => {
			dest.on("close", () => {
				console.log("Downloaded to", path.resolve(`${__dirname}/${latestjson.assets[0].name}`));
				resolve({
					repoName: repo,
					path: path.resolve(`${__dirname}/${latestjson.assets[0].name}`)
				});
			});
		});
	} else {
		return -2;
	}
}

function getEntries(zipLoc) {
	return new Promise(resolve => {
		const uniqueEntries = [];
		const stream = fs.createReadStream(zipLoc).pipe(unzip.Parse());
		stream.on("entry", entry => {
			console.log(entry);
			const reg = /^([^/\s]+)/img;
			const match = reg.exec(entry.path)[1];
			if (!uniqueEntries.includes(match)) {
				uniqueEntries.push(match);
			}
			entry.autodrain();
		});
		stream.on("close", () => {
			resolve(uniqueEntries.length);
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
			fs.createReadStream(zipLoc).pipe(unzip.Extract({
				path: path.resolve(destLoc)
			}).on("close", () => {
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
			}));
		});
	});
}

module.exports = {
	downloadZipFromGithub,
	extractZip
};
