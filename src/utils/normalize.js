const TYPE_MAP = {
  PushEvent:         "push",
  CreateEvent:       "create",
  DeleteEvent:       "delete",
  WatchEvent:        "watch",
  ForkEvent:         "fork",
  PullRequestEvent:  "pull_request",
  IssuesEvent:       "issues",
  IssueCommentEvent: "issue_comment",
  ReleaseEvent:      "release",
  WorkflowRunEvent:  "workflow_run",
};

function normalizeEvent(apiEvent, repoCache = {}) {
  const eventName = TYPE_MAP[apiEvent.type];
  if (!eventName) return null;

  const [owner, name] = (apiEvent.repo.name || "").split("/");
  const fullName = apiEvent.repo.name || "";
  const htmlUrl = `https://github.com/${fullName}`;

  const cached = repoCache[fullName] || {};
  const repository = {
    full_name: fullName,
    name,
    owner: { login: owner },
    html_url: htmlUrl,
    private: typeof cached.private === "boolean" ? cached.private : true,
    description: cached.description || null,
    stargazers_count: cached.stargazers_count,
    forks_count: cached.forks_count,
    language: cached.language || null,
  };

  const sender = {
    login: apiEvent.actor.login,
    avatar_url: apiEvent.actor.avatar_url,
    html_url: `https://github.com/${apiEvent.actor.login}`,
  };

  const payload = {
    ...apiEvent.payload,
    repository,
    sender,
  };

  return { event: eventName, payload };
}

module.exports = { normalizeEvent, TYPE_MAP };
