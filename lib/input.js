const os = require("os");
const fs = require("fs");
const spawnSync = require("child_process").spawnSync;

class GhiInput
{
	constructor() {
		this._commentFp = `${os.tmpdir()}/ghi-cli-comment.md`;
	}

	async getComment() {
		return new Promise((resolve, reject) => {
			// Remove the old file if it's still there.
			// Write the issue body.
			try {
				fs.unlinkSync(this._commentFp);
			} catch (e) {;}

			const child = spawnSync(process.env.EDITOR || "vim", [this._commentFp], {
				stdio: "inherit"
			});

			try {
				const buffer = fs.readFileSync(this._commentFp, {
					encoding: "utf8"
				});

				resolve(buffer);
			} catch (e) {
				reject(e);
			}
		});
	}
}

module.exports = GhiInput;
