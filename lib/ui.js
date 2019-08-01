const keymap = require("./keybindings");
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
	constructor(core) {
		this._screen = null;
		this._title = "GitHub Issues";
		this._issueCallbackMap = {};
		this._activeElement = null;
		this._core = core;
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

		this._statusBox = blessed.box({
			parent: this._screen,
			top: 1,
			right: 0,
			width: GFX_ISSUE_BODY_WIDTH,
			padding: {
				left: 1
			},
			height: 1,
			fg: "white",
			align: "left",
			content: "",
			tags: true
		});

		this._bindKeys();
		this._issueList.on("select", this._selectIssue.bind(this));
		this._setFocus(this._issueList, "list");

		this._render();
	}

	_bindKeys() {
		this._screen.key(keymap.global.quit, this._quit);
		this._screen.key(keymap.global.focusIssueList, () => { this._setFocus(this._issueList, "list"); });
		this._screen.key(keymap.global.focusIssue, () => { this._setFocus(this._issueList, "issue"); });
		this._screen.key(keymap.global.toggleFocus, () => { this._toggleFocus(); })
		this._screen.key(keymap.global.createNewIssue, () => { this._createNewIssue(); })

		this._screen.key(keymap.issue.addComment, () => { this._processComment(); });
		this._screen.key(keymap.issue.closeIssue, () => { this._closeIssue(); });
	}

	async _createNewIssue() {
		try {
			await this._core.createNewIssue();
			this._setStatusBar("success", "Your issue was created successfully.");
		} catch (e) {
			this._setStatusBar("error", e);
		}

		this._screen.program.emit("resize");
		this._render();
	}

	async _processComment() {
		try {
			await this._core.processComment();
			this._setStatusBar("success", "Your comment was added successfully.");
		} catch (e) {
			this._setStatusBar("error", e);
		}

		this._screen.program.emit("resize");
		this._render();
	}

	async _closeIssue() {
		let hasComment = true;
		let comment = null;

		try {
			comment = await this._core.getComment();
		} catch (e) {
			hasComment = false;
		}

		try {
			if (hasComment)
				await this._core.postComment(this._core._currentIssue.number, comment);
			this._core.closeIssue(this._core._currentIssue.number);
			this._setStatusBar("success", "Issue was closed.");
		} catch (e) {
			this._setStatusBar("error", "An error occurred closing the issue.");
		}

		this._core.renderComments(this._core._currentIssue);

		this._screen.program.emit("resize");
		this._render();
	}

	_setStatusBar(context, text) {
		let buffer = "";

		switch (context) {
			case "success":
				buffer = `{green-bg}{black-fg} ${text} {/black-fg}{/green-bg}`;
				break;
			case "error":
				buffer = `{red-bg}{white-fg} ${text} {/white-fg}{/red-bg}`;
				break;
		}

		this._statusBox.setContent(buffer);
		this._screen.render();
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
		const state = this._core.getState();

		let stateLine = `{yellow-fg}${state.repo.user}/${state.repo.name}{/yellow-fg} {green-bg}{black-fg} ${state.issueCount} issues {/black-fg}{/green-bg}\n`;
		switch (this._activeElement) {
			case "list":
				stateLine += `{black-fg}{blue-bg} ↑↓ select {/blue-bg} {blue-bg} → open {/blue-bg}{/black-fg}`;
				break;
			case "issue":
				stateLine += `{black-fg}{blue-bg} ↑↓ scroll {/blue-bg} {blue-bg} < focus list {/blue-bg} {blue-bg} R add comment {/blue-bg} {blue-bg} X close issue {/blue-bg}{/black-fg}`;
				break;
		}

		this._stateBox.setContent(stateLine);

		this._screen.render();
	}
}

module.exports = GhiUi;
