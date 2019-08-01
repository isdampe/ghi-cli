const defaultKeyMap = {
	"global": {
		"quit": ["q"],
		"focusIssueList": ["<"],
		"focusIssue": [">"],
		"toggleFocus": ["tab"],
		"createNewIssue": ["C-n"]
	},
	"issue": {
		"addComment": ["C-r"],
		"closeIssue": ["C-x"]
	},
	"issueList": {
		"nextPage": ["+"],
		"prevPage": ["-"],
		"toggleOpenIssues": ["1"],
		"toggleClosedIssues": ["2"]
	}
};

const getKeyMap = () => {
	return defaultKeyMap;
};

module.exports = getKeyMap();
