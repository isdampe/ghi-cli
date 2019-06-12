const fs = require("fs");
const os = require("os");
const exec = require("child_process").exec;
const prompt = require("password-prompt");

const getGitRepo = async() => {

	return new Promise((resolve, reject) => {

		if (process.argv.length > 2) {

			let buffer = process.argv[process.argv.length -1];
			if (buffer.lastIndexOf(".git") > -1)
				buffer = buffer.substr(0, buffer.lastIndexOf(".git"));

			let s = buffer.split("/");
			const repo = {
				url: buffer,
				user: s[s.length -2],
				name: s[s.length -1]
			};

			resolve(repo);


		} else {
			exec("git config --get remote.origin.url", (error, stdout) => {
				if (error) {
					reject(error);
					return;
				}

				let buffer = stdout.replace(/\n/g, "");
				if (buffer.lastIndexOf(".git") > -1)
					buffer = buffer.substr(0, buffer.lastIndexOf(".git"));

				let s = buffer.split("/");
				const repo = {
					url: buffer,
					user: s[s.length -2],
					name: s[s.length -1]
				};

				resolve(repo);
			});
		}
	});
};

const getOAuthToken = async () => {
	const fp = `${os.homedir()}/.ghi-token`;

	if (fs.existsSync(fp)) {
		let token = fs.readFileSync(fp, {encoding: "utf8"});
		if (token)
			return token.replace(/\s/g, "");
	}

	const token = await prompt("GitHub account oAuth token: ");
	fs.writeFileSync(fp, token, {encoding: "utf8"});

	return token;
};

const autoload = async () => {

	const config = {
		repo: await getGitRepo(),
		oAuthToken: await getOAuthToken()
	};

	if (typeof config.repo.user === "undefined" || ! config.repo.user ||
		typeof config.repo.url === "undefined" || ! config.repo.url ||
		typeof config.repo.name === "undefined" || ! config.repo.name)
		throw("Invalid repository information supplied. Missing either username or repository name.");

	return config;
};

module.exports = { autoload };
