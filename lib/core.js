const os = require("os");
const fs = require("fs");
const spawn = require("child_process").spawn;
const GitHub  = require("github-api");
const GhiUi = require("./ui");

class GhiCore
{
	constructor(config) {
		this._repo = config.repo;
		this._issueCount = 0;
		this._currentIssue = null;
		this._commentFp = `${os.tmpdir()}/ghi-cli-comment.md`;

		this._gh = new GitHub({token: config.oAuthToken});
		this._issues = this._gh.getIssues(config.repo.user, config.repo.name);
		this._ui = new GhiUi(this.getState.bind(this), this.getComment.bind(this));
	}

	getState() {
		return {
			repo: this._repo,
			issueCount: this._issueCount,
			currentIssue: this._currentIssue
		}
	}

	async getComment() {
		//this._currentIssue
		return new Promise((resolve, reject) => {
			// Remove the old file if it's still there.
			// Write the issue body.
			try {
				fs.unlinkSync(this._commentFp);
			} catch (e) {;}

			const child = spawn( "nvim", [this._commentFp], {
			//const child = spawn(process.env.EDITOR || "vim", ["/tmp/comment.md"], {
				stdio: "inherit"
			});

			child.on("exit", () => {
				try {
					const buffer = fs.readFileSync(this._commentFp, {
						encoding: "utf8"
					});

					resolve(buffer);
				} catch (e) {
					reject();
				}
			});
		});
	}

	async fetchIssues() {
		return this._issues.listIssues({
			state: "open",
			sort: "created"
		});
	}

	async fetchComments(issueNumber) {
		return this._issues.listIssueComments(issueNumber);
	}

	async main() {
		try {
			const issues = await this.fetchIssues();

			let count = 0;
			for (let issue of issues.data) {
				this._ui.insertIssue(issue, async () => {
					const comments = await this.fetchComments(issue.number);
					issue.comments = (comments.data ? comments.data : []);

					this._currentIssue = issue;
					this._ui.setCurrentIssue(issue);
				});
				++count;
			}

			this._issueCount = count;
		} catch (e) {
			//console.log(e);
		}

	}
}

module.exports = GhiCore;
