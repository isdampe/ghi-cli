const keymap = require("./keybindings");
const blessed = require("blessed");

const GFX_ISSUE_LIST_WIDTH = "33%";
const GFX_ISSUE_BODY_WIDTH = "67%";
const GFX_ISSUE_BODY_HEIGHT = "80%";
const GFX_ISSUE_VIEWPORT_HEIGHT = "90%";
const GFX_ISSUE_INSTRUCTIONS_HEIGHT = 1;

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
		this._lastStatusChange = new Date().getTime();
		this._focusLock = false;
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
			top: 0,
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
	}

	_bindKeys() {
		this._screen.key(keymap.global.quit, this._quit);
		this._screen.key(keymap.global.focusIssueList, () => { this._setFocus(this._issueList, "list"); });
		this._screen.key(keymap.global.focusIssue, () => { this._setFocus(this._issueList, "issue"); });
		this._screen.key(keymap.global.toggleFocus, () => { this._toggleFocus(); })
		this._screen.key(keymap.global.createNewIssue, () => { this._createNewIssue(); })
		this._screen.key(keymap.global.help, () => { this._renderHelp(); })

		this._screen.key(keymap.issue.addComment, () => { this._processComment(); });
		this._screen.key(keymap.issue.closeIssue, () => { this._closeIssue(); });
	}

	_renderHelp() {
		//TODO.
	}

	confirm(message, onSuccess, onCancel) {
		const box = blessed.box({
			parent: this._screen,
			top: "center",
			left: "center",
			width: 72,
			height: 6,
			padding: {
				top: 1
			},
			content: `{bold}${message}{/bold}\n(Y/N)`,
			border: {
				type: "line"
			},		
			align: "center",
			tags: true,
			shadow: true,
			draggable: true
		});

		box.key(["Y", "y"], () => {
			this._focusLock = false;
			box.destroy();
			this._render();
			onSuccess();
		});

		box.key(["N", "n", "escape"], () => {
			this._focusLock = false;
			box.destroy();
			this._render();
			if (typeof onCancel === "function")
				onCancel();
		});

		box.focus();
		this._focusLock = true;
		this._render();
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
		this.confirm("Are you sure you want to close this issue?", async () => {
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
				this._setStatusBar("error", "An error occurred closing the issue. " + e);
			}

			this._core.renderComments(this._core._currentIssue);

			this._screen.program.emit("resize");
			this._render();
		});
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

		this._lastStatusChange = new Date().getTime();
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
		if (this._focusLock)
			return;
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

		if ((new Date().getTime() - this._lastStatusChange) > 2500)
			this._setStatusBar("", "");

		this._render();
	}

	_selectIssue(node) {
		if (this._issueCallbackMap.hasOwnProperty(node.content))
			this._issueCallbackMap[node.content]();
	}

	emptyIssues() {
		this._issueList.clearItems();
		this._issueCallbackMap = {};
		this._screen.render();
	}

	insertIssue(issue, callback) {
		let text = `#${issue.number}: ${issue.title}`;
		this._issueCallbackMap[text] = callback;
		this._issueList.addItem(text);

		this._screen.render();
	}

	deselectIssue() {
		this._issueBody.setContent("");
		this._setFocus(this._issueList, "list");
	}

	setCurrentIssue(issue) {

		let body = `{yellow-fg}Issue #${issue.number} - ${issue.title}{/yellow-fg}\n`;
		body += `{blue-fg}Created on ${issue.created_at}{/blue-fg} by {magenta-bg}{black-fg} ${issue.user.login} {/black-fg}{/magenta-bg}\n`;

		if (issue.labels.length > 0) {
			body += `Labels: `;
			for (let label of issue.labels) {
				body += ` {white-bg}{black-fg} ${label.name} {/black-fg}{/white-bg} `;
			}
			body += `\n\n`;
		} else {
			body += `\n`;
		}

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
		this._stateBox.setContent(stateLine);
		this._screen.render();
	}
}

module.exports = GhiUi;
