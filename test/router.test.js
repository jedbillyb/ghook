const test = require("node:test");
const assert = require("node:assert/strict");

function freshShouldRoute(env = {}) {
  for (const key of ["IGNORED_EVENTS", "BRANCH_FILTER", "NOTIFY_PRIVATE_REPOS"]) {
    delete process.env[key];
  }
  Object.assign(process.env, env);
  delete require.cache[require.resolve("../src/router")];
  return require("../src/router").shouldRoute;
}

const publicRepo = { full_name: "a/b", private: false };
const privateRepo = { full_name: "a/b", private: true };

test("allows known events by default", () => {
  const shouldRoute = freshShouldRoute();
  assert.equal(shouldRoute("push", { repository: publicRepo, ref: "refs/heads/main" }).allow, true);
  assert.equal(shouldRoute("issues", { repository: publicRepo, action: "opened" }).allow, true);
});

test("IGNORED_EVENTS drops listed events", () => {
  const shouldRoute = freshShouldRoute({ IGNORED_EVENTS: "watch,fork" });
  assert.equal(shouldRoute("watch", { repository: publicRepo }).allow, false);
  assert.equal(shouldRoute("fork", { repository: publicRepo }).allow, false);
  assert.equal(shouldRoute("push", { repository: publicRepo, ref: "refs/heads/main" }).allow, true);
});

test("IGNORED_EVENTS tolerates whitespace and empty entries", () => {
  const shouldRoute = freshShouldRoute({ IGNORED_EVENTS: " watch , , fork " });
  assert.equal(shouldRoute("watch", { repository: publicRepo }).allow, false);
  assert.equal(shouldRoute("fork", { repository: publicRepo }).allow, false);
});

test("BRANCH_FILTER restricts push to matching branches", () => {
  const shouldRoute = freshShouldRoute({ BRANCH_FILTER: "main,develop" });
  assert.equal(shouldRoute("push", { repository: publicRepo, ref: "refs/heads/main" }).allow, true);
  assert.equal(shouldRoute("push", { repository: publicRepo, ref: "refs/heads/develop" }).allow, true);
  assert.equal(shouldRoute("push", { repository: publicRepo, ref: "refs/heads/feature/x" }).allow, false);
});

test("BRANCH_FILTER supports a single segment wildcard", () => {
  const shouldRoute = freshShouldRoute({ BRANCH_FILTER: "release/*" });
  assert.equal(shouldRoute("push", { repository: publicRepo, ref: "refs/heads/release/v1" }).allow, true);
  assert.equal(shouldRoute("push", { repository: publicRepo, ref: "refs/heads/release/v1/hotfix" }).allow, false);
  assert.equal(shouldRoute("push", { repository: publicRepo, ref: "refs/heads/main" }).allow, false);
});

test("BRANCH_FILTER does not affect tag pushes", () => {
  const shouldRoute = freshShouldRoute({ BRANCH_FILTER: "main" });
  assert.equal(shouldRoute("push", { repository: publicRepo, ref: "refs/tags/v1.0" }).allow, true);
});

test("BRANCH_FILTER applies to create/delete only for ref_type=branch", () => {
  const shouldRoute = freshShouldRoute({ BRANCH_FILTER: "main" });
  assert.equal(shouldRoute("create", { repository: publicRepo, ref: "feature/x", ref_type: "branch" }).allow, false);
  assert.equal(shouldRoute("create", { repository: publicRepo, ref: "main", ref_type: "branch" }).allow, true);
  assert.equal(shouldRoute("create", { repository: publicRepo, ref: "v1.0", ref_type: "tag" }).allow, true);
  assert.equal(shouldRoute("delete", { repository: publicRepo, ref: "feature/x", ref_type: "branch" }).allow, false);
  assert.equal(shouldRoute("delete", { repository: publicRepo, ref: "v1.0", ref_type: "tag" }).allow, true);
});

test("BRANCH_FILTER does not affect non-branch-scoped events", () => {
  const shouldRoute = freshShouldRoute({ BRANCH_FILTER: "main" });
  assert.equal(shouldRoute("issues", { repository: publicRepo, action: "opened" }).allow, true);
  assert.equal(shouldRoute("pull_request", { repository: publicRepo, action: "opened" }).allow, true);
  assert.equal(shouldRoute("watch", { repository: publicRepo }).allow, true);
});

test("private repos still blocked by default even when filters allow", () => {
  const shouldRoute = freshShouldRoute({ BRANCH_FILTER: "main" });
  assert.equal(shouldRoute("push", { repository: privateRepo, ref: "refs/heads/main" }).allow, false);
});

test("NOTIFY_PRIVATE_REPOS=true bypasses the private check", () => {
  const shouldRoute = freshShouldRoute({ NOTIFY_PRIVATE_REPOS: "true" });
  assert.equal(shouldRoute("push", { repository: privateRepo, ref: "refs/heads/main" }).allow, true);
});

test("IGNORED_EVENTS takes precedence over BRANCH_FILTER", () => {
  const shouldRoute = freshShouldRoute({ IGNORED_EVENTS: "push", BRANCH_FILTER: "main" });
  const decision = shouldRoute("push", { repository: publicRepo, ref: "refs/heads/main" });
  assert.equal(decision.allow, false);
  assert.match(decision.reason, /IGNORED_EVENTS/);
});

test("decision.reason is set when blocked", () => {
  const shouldRoute = freshShouldRoute({ BRANCH_FILTER: "main" });
  const decision = shouldRoute("push", { repository: publicRepo, ref: "refs/heads/feature/x" });
  assert.equal(decision.allow, false);
  assert.match(decision.reason, /feature\/x/);
});
