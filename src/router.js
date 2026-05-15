const { handlePush } = require("./handlers/push");
const { handleCreate } = require("./handlers/create");
const { handleDelete } = require("./handlers/delete");
const { handleStar } = require("./handlers/star");
const { handleFork } = require("./handlers/fork");
const { handlePullRequest } = require("./handlers/pullRequest");
const { handleIssues } = require("./handlers/issues");
const { handleIssueComment } = require("./handlers/issueComment");
const { handleRelease } = require("./handlers/release");
const { handleWorkflowRun } = require("./handlers/workflowRun");

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
  workflow_run: handleWorkflowRun,
};

const BRANCH_SCOPED_EVENTS = new Set(["push", "create", "delete"]);

const NOTIFY_PRIVATE_REPOS = process.env.NOTIFY_PRIVATE_REPOS === "true";
const IGNORED_EVENTS = parseList(process.env.IGNORED_EVENTS);
const BRANCH_FILTER = parseList(process.env.BRANCH_FILTER);
const BRANCH_FILTER_REGEXES = BRANCH_FILTER.map(toBranchRegex);

function parseList(raw) {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function toBranchRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
  return new RegExp(`^${escaped}$`);
}

function isPrivateRepoPayload(payload) {
  return Boolean(payload && payload.repository && payload.repository.private === true);
}

function extractBranch(event, payload) {
  if (!payload || typeof payload.ref !== "string") return null;
  if ((event === "create" || event === "delete") && payload.ref_type !== "branch") return null;
  if (event === "push" && payload.ref.startsWith("refs/tags/")) return null;
  return payload.ref.replace(/^refs\/heads\//, "");
}

function branchMatchesFilter(branch) {
  if (BRANCH_FILTER_REGEXES.length === 0) return true;
  return BRANCH_FILTER_REGEXES.some((re) => re.test(branch));
}

function shouldRoute(event, payload) {
  if (IGNORED_EVENTS.includes(event)) {
    return { allow: false, reason: `event "${event}" is in IGNORED_EVENTS` };
  }
  if (!NOTIFY_PRIVATE_REPOS && isPrivateRepoPayload(payload)) {
    return { allow: false, reason: `private repository: ${payload.repository.full_name}` };
  }
  if (BRANCH_SCOPED_EVENTS.has(event) && BRANCH_FILTER_REGEXES.length > 0) {
    const branch = extractBranch(event, payload);
    if (branch !== null && !branchMatchesFilter(branch)) {
      return { allow: false, reason: `branch "${branch}" not in BRANCH_FILTER` };
    }
  }
  return { allow: true };
}

function routeEvent(event, payload) {
  const decision = shouldRoute(event, payload);
  if (!decision.allow) {
    console.log(`Skipping ${event} event: ${decision.reason}`);
    return;
  }

  const handler = handlers[event];
  if (handler) {
    handler(payload, event);
  } else {
    console.log(`ℹ️  Unhandled event: ${event}`);
  }
}

module.exports = { routeEvent, shouldRoute };
