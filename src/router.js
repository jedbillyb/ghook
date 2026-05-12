const { handlePush } = require("./handlers/push");
const { handleCreate } = require("./handlers/create");
const { handleDelete } = require("./handlers/delete");
const { handleStar } = require("./handlers/star");
const { handleFork } = require("./handlers/fork");
const { handlePullRequest } = require("./handlers/pullRequest");
const { handleIssues } = require("./handlers/issues");
const { handleIssueComment } = require("./handlers/issueComment");
const { handleRelease } = require("./handlers/release");

const handlers = {
  push: handlePush,
  create: handleCreate,
  delete: handleDelete,
  watch: handleStar,        // "star" events use the "watch" event type
  fork: handleFork,
  pull_request: handlePullRequest,
  issues: handleIssues,
  issue_comment: handleIssueComment,
  release: handleRelease,
};

// Skip notifications for private repositories unless explicitly enabled.
// Set NOTIFY_PRIVATE_REPOS=true in the environment to opt in.
const NOTIFY_PRIVATE_REPOS = process.env.NOTIFY_PRIVATE_REPOS === "true";

function isPrivateRepoPayload(payload) {
  return Boolean(payload && payload.repository && payload.repository.private === true);
}

function routeEvent(event, payload) {
  if (!NOTIFY_PRIVATE_REPOS && isPrivateRepoPayload(payload)) {
    console.log(`Skipping ${event} event for private repository: ${payload.repository.full_name}`);
    return;
  }

  const handler = handlers[event];
  if (handler) {
    handler(payload);
  } else {
    console.log(`ℹ️  Unhandled event: ${event}`);
  }
}

module.exports = { routeEvent };
