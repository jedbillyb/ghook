const { handlePush } = require("./handlers/push");
const { handleCreate } = require("./handlers/create");
const { handleStar } = require("./handlers/star");
const { handleFork } = require("./handlers/fork");
const { handlePullRequest } = require("./handlers/pullRequest");
const { handleIssues } = require("./handlers/issues");
const { handleIssueComment } = require("./handlers/issueComment");

const handlers = {
  push: handlePush,
  create: handleCreate,
  watch: handleStar,        // "star" events use the "watch" event type
  fork: handleFork,
  pull_request: handlePullRequest,
  issues: handleIssues,
  issue_comment: handleIssueComment,
};

function routeEvent(event, payload) {
  const handler = handlers[event];
  if (handler) {
    handler(payload);
  } else {
    console.log(`ℹ️  Unhandled event: ${event}`);
  }
}

module.exports = { routeEvent };
