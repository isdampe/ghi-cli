#!/usr/bin/env node
const config = require("./config");
const GhiCore = require("./lib/core");

const usage = () => {
	console.log("Usage: ghi [options] [repository_url]");
};

const main = async () => {
	let sessionConfig = null;

	try {
		sessionConfig = await config.autoload();
	} catch (e) {
		console.log(e);
		console.error("Couldn't determine git repository. Try launching with ghi [repository_url].");
		return;
	}

	const core = new GhiCore(sessionConfig);
	core.main();
	//console.log(await core.fetchIssues());

};

main();
