const os = require("os");
const fs = require("fs");
const spawnSync = require("child_process").spawnSync;

class GhiInput
{
	constructor() {
		this._commentFp = `${os.tmpdir()}/ghi-cli-comment.md`;
		this._issueFp = `${os.tmpdir()}/ghi-cli-issue.md`;
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

	async getIssue() {
		return new Promise((resolve, reject) => {
			// Remove the old file if it's still there.
			// Write the issue body.
			try {
				fs.unlinkSync(this._issueFp);
			} catch (e) {;}

			const child = spawnSync(process.env.EDITOR || "vim", [this._issueFp], {
				stdio: "inherit"
			});

			try {
				const buffer = fs.readFileSync(this._issueFp, {
					encoding: "utf8"
				});

				const lines = buffer.split("\n");
				if (lines.length < 2) {
					reject("Two lines required. Line 1 should be the title.");
					return;
				}

				const title = lines[0];
				lines.splice(0, 1);

				resolve({
					title: title,
					body: lines.join("\n")
				});
			} catch (e) {
				reject(e);
			}
		});
	}
}

module.exports = GhiInput;
