const blessed = require("blessed");

const GFX_ISSUE_LIST_WIDTH = "33%";
const GFX_ISSUE_BODY_WIDTH = "67%";
const GFX_ISSUE_BODY_HEIGHT = "80%";
const GFX_ISSUE_VIEWPORT_HEIGHT = "90%";
const GFX_ISSUE_INSTRUCTIONS_HEIGHT = 2;

const GFX_ISSUE_BODY_PLACEHOLDER = "Select an issue and press [ENTER]";

const GFX_LINE_SEP = "-----------------------------------------------------------------";

class GhiUi
{
	constructor(getState) {
		this._screen = null;
		this._title = "GitHub Issues";
		this._issueCallbackMap = {};
		this._activeElement = null;
		this._getState = getState;
		this._buildUi();
		this._render();
	}

	_quit() {
		process.exit(0);
	}

	_buildUi() {
		this._screen = blessed.screen({
			smartCSR: true,
			title: this._title
		});

		this._issueList = blessed.list({
			parent: this._screen,
			top: "top",
			left: 0,
			top: GFX_ISSUE_INSTRUCTIONS_HEIGHT,
			bottom: 0,
			width: GFX_ISSUE_LIST_WIDTH,
			align: "left",
			fg: "white",
			border: {
				type: "line"
			},
			style: {
				selected: {
					fg: "black",
					bg: "yellow"
				}
			},
			keys: true,
			vi: true
		});

		this._issueBody = blessed.box({
			parent: this._screen,
			top: "top",
			right: 0,
			top: GFX_ISSUE_INSTRUCTIONS_HEIGHT,
			bottom: 0,
			width: GFX_ISSUE_BODY_WIDTH,
			fg: "white",
			align: "left",
			scrollable: true,
			border: {
				type: "line"
			},
			content: GFX_ISSUE_BODY_PLACEHOLDER,
			scrollbar: {
				bg: "yellow"
			},
			padding: {
				left: 2,
				right: 2, 
				top: 0,
				bottom: 0
			},
			vi: true,
			keys: true,
			tags: true
		});

		this._stateBox = blessed.box({
			parent: this._screen,
			top: 0,
			left: 0,
			width: "100%",
			padding: {
				left: 1
			},
			height: GFX_ISSUE_INSTRUCTIONS_HEIGHT,
			fg: "white",
			align: "left",
			content: "Loading...",
			tags: true
		});

		this._issueList.on("select", this._selectIssue.bind(this));

		this._screen.key(["q"], () => {
			this._quit();
		});

		this._screen.key(["<"], () => {
			this._setFocus(this._issueList, "list");
		});

		this._screen.key(["tab"], () => {
			this._toggleFocus();
		})

		this._screen.key(["c"], () => {
			this._setFocus(this._issueBody, "issue");
		});

		this._setFocus(this._issueList, "list");

		this._render();
	}

	_toggleFocus() {
		if (this._activeElement == "issue")
			this._setFocus(this._issueList, "list");
		else
			this._setFocus(this._issueBody, "issue");
	}

	_setFocus(element, descriptor) {
		this._activeElement = descriptor;

		switch(descriptor) {
			case "issue":
				this._issueList.style.border.fg = "white";
				this._issueList.style.selected.bg = "";
				this._issueList.style.selected.fg =  "yellow";
				this._issueBody.style.border.fg = "yellow";
				break;
			case "list":
				this._issueBody.style.border.fg = "white";
				this._issueList.style.selected.bg = "yellow";
				this._issueList.style.selected.fg =  "black";
				this._issueList.style.border.fg = "yellow";
				break;
		}

		element.focus();

		this._render();
	}

	_selectIssue(node) {
		if (this._issueCallbackMap.hasOwnProperty(node.content))
			this._issueCallbackMap[node.content]();
	}

	insertIssue(issue, callback) {
		let text = `#${issue.number}: ${issue.title}`;
		this._issueCallbackMap[text] = callback;
		this._issueList.addItem(text);

		this._screen.render();
	}

	setCurrentIssue(issue) {

		let body = `{yellow-fg}Issue #${issue.number} - ${issue.title}{/yellow-fg}\n`;
		body += `{blue-fg}Created on ${issue.created_at}{/blue-fg} by {magenta-bg}{black-fg} ${issue.user.login} {/black-fg}{/magenta-bg}\n\n`;
		body += issue.body;

		body += `\n\n\n{blue-bg}{black-fg} Comments (${issue.comments.length}) {/black-fg}{/blue-bg}\n\n${GFX_LINE_SEP}\n\n`;

		for (let comment of issue.comments) {
			body += `{magenta-bg}{black-fg} ${comment.user.login} {/black-fg}{/magenta-bg} {blue-fg}Commented on ${comment.updated_at}{/blue-fg}\n\n`;
			body += `${comment.body}`;
			body += `\n\n${GFX_LINE_SEP}\n\n`;
		}

		this._issueBody.setContent(body);
		this._setFocus(this._issueBody, "issue")
		this._screen.render();
	}

	_render() {
		const state = this._getState();

		let stateLine = `{yellow-fg}${state.repo.user}/${state.repo.name}{/yellow-fg} {green-bg}{black-fg} ${state.issueCount} issues {/black-fg}{/green-bg}\n`;
		switch (this._activeElement) {
			case "list":
				stateLine += `{black-fg}{blue-bg} ↑↓ select {/blue-bg} {blue-bg} → open {/blue-bg}{/black-fg}`;
				break;
			case "issue":
				stateLine += `{black-fg}{blue-bg} ↑↓ scroll {/blue-bg} {blue-bg} < focus list {/blue-bg} {blue-bg} c add comment {/blue-bg}{/black-fg}`;
				break;
		}

		this._stateBox.setContent(stateLine);

		this._screen.render();
	}
}

module.exports = GhiUi;
