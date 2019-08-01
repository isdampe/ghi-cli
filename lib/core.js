const os = require("os");
const fs = require("fs");
const spawnSync = require("child_process").spawnSync;
const GitHub  = require("github-api");
const GhiUi = require("./ui");
const GhiInput = require("./input");

class GhiCore
{
	constructor(config) {
		this._repo = config.repo;
		this._issueCount = 0;
		this._currentIssue = null;

		this._gh = new GitHub({token: config.oAuthToken});
		this._issues = this._gh.getIssues(config.repo.user, config.repo.name);
		this._input = new GhiInput();
		this._ui = new GhiUi(this);
	}

	getState() {
		return {
			repo: this._repo,
			issueCount: this._issueCount,
			currentIssue: this._currentIssue
		}
	}

	async createNewIssue() {
		const issue = await this._input.getIssue();
		await this._issues.createIssue({
			title: issue.title,
			body: issue.body
		});
		await this.main();
	}

	async processComment(issue) {
		if (! this._currentIssue)
			throw("You must select an issue first.");

		const comment = await this._input.getComment();
		await this._issues.createIssueComment(this._currentIssue.number, comment);
		this.renderComments(this._currentIssue);
	}

	async closeIssue(issueNumber) {
		if (! issueNumber)
			throw("You need to select an issue first.");

		await this._issues.editIssue(issueNumber, {
			state: "closed"
		});
		await this.main();
		this._ui.deselectIssue();
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

	async renderComments(issue) {
		const comments = await this.fetchComments(issue.number);
		issue.comments = (comments.data ? comments.data : []);

		this._currentIssue = issue;
		this._ui.setCurrentIssue(issue);
	}

	async main() {
		try {
			this._ui.emptyIssues();
			const issues = await this.fetchIssues();

			let count = 0;
			for (let issue of issues.data) {
				this._ui.insertIssue(issue, async () => {
					this.renderComments(issue);			
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
