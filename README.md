# ghook

> GitHub -> Discord webhook bridge. One setup, every repo, forever.

[![CI](https://github.com/jedbillyb/ghook/actions/workflows/ci.yml/badge.svg)](https://github.com/jedbillyb/ghook/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js)](https://nodejs.org)

A Node.js app that delivers rich, color-coded Discord embeds for every GitHub event. Install once via a GitHub App and it covers all your repos automatically — including future ones. Also polls public repos, orgs, and users you don't own.

---

## Features

- **Global repo coverage** - one GitHub App install covers all current and future repos
- **Public repo polling** - watch any public repo, org, or user without them installing anything
- **Rich Discord embeds** - color-coded notifications with avatars, links, and context
- **HMAC-SHA256 verification** - every webhook payload verified before processing
- **Rate-limit aware** - Discord 429 responses are retried using the delay Discord returns
- **Per-target event filters** - route different events to different Discord channels
- **Minimal dependencies** - Express.js and Node.js stdlib only

---

## How It Works

1. **GitHub Event** - an event occurs (push, issue, star, etc.) in any monitored repo
2. **Webhook Delivery** - GitHub POSTs the payload to your configured webhook URL
3. **Signature Verification** - server checks the HMAC-SHA256 signature against your secret
4. **Event Routing** - payload is dispatched to the correct handler via `X-GitHub-Event`
5. **Discord Notification** - handler formats the event into an embed and posts to Discord

For repos you don't control, ghook polls GitHub's Events API on a configurable interval instead. Repos you can read but not administer work the same way: give `GITHUB_TOKEN` an account with read access and set `NOTIFY_PRIVATE_REPOS=true`, since private repos are dropped by default.

### GitHub Apps vs repository webhooks

GitHub Apps give you account-level installation - unlike per-repo webhooks, a single install covers all repos, includes new ones automatically, and uses webhook secrets for auth (no private key needed).

---

## Supported Events

| Event | Description | Color |
|---|---|---|
| `push` | Commits pushed to a branch | Green `#238636` |
| `create` | Branch or tag created | Blue `#1f6feb` |
| `delete` | Branch or tag deleted | Red `#f85149` |
| `watch` | Repository starred | Yellow `#e3b341` |
| `fork` | Repository forked | Purple `#a371f7` |
| `pull_request` | PR opened, closed, merged | Blue `#58a6ff` |
| `issues` | Issue opened, closed, reopened | Green/Red/Orange |
| `issue_comment` | Comment on an issue | Blue `#58a6ff` |
| `release` | Release published or prereleased | Green `#238636` |
| `workflow_run` | GitHub Actions run completed | Green/Red/Grey/Orange |

### Example embed formats

<details>
<summary><strong>Push event</strong></summary>

```
[User Avatar] User Name
Pushed 3 commits to `main`

[`a1b2c3d`] Initial commit message
[`e4f5g6h`] Fix bug in authentication
[`i7j8k9l`] Update documentation

Repository: owner/repo
Branch: `main`

ghook • [timestamp]
```

</details>

<details>
<summary><strong>Release event</strong></summary>

```
[User Avatar] User Name
🚀 v1.0.0

Release notes or description here...

Repository: owner/repo
Tag: `v1.0.0`
Type: Release

ghook • [timestamp]
```

</details>

<details>
<summary><strong>Star event</strong></summary>

```
[User Avatar] User Name
⭐ owner/repo

Repository description here...

Stars: ⭐ 1,234
Forks: 🍴 567
Language: JavaScript

ghook • [timestamp]
```

</details>

---

## GitHub App Setup

1. Go to [GitHub Settings -> Developer settings -> GitHub Apps](https://github.com/settings/apps) and click **New GitHub App**
2. Set a name, homepage URL, and configure the webhook URL (`https://yourdomain.com/webhook`) and secret
3. Set repository permissions: `Actions` Read, `Contents` Read, `Issues` Read, `Metadata` Read, `Pull requests` Read
4. Subscribe to events: Push, Create, Delete, Fork, Issues, Issue comment, Pull request, Release, Watch, Workflow run
5. After creating: **Install App** -> install on your account -> **All repositories**

| Permission | Required for |
|---|---|
| `Metadata` | Always required |
| `Contents` | Release events, repo metadata |
| `Issues` | Issue and comment events |
| `Pull requests` | Pull request events |
| `Actions` | Workflow run events |

---

## Installation

```bash
git clone https://github.com/jedbillyb/ghook.git
cd ghook
npm install
cp .env.example .env
# Edit .env with your values
npm run dev   # auto-restarts on file changes
```

Verify it's running:

```bash
curl http://localhost:3000
# -> "GitHub -> Discord bot is running."
```

**Note:** keep your `.env` out of version control and restrict permissions with `chmod 600 .env`.

---

## Configuration

```env
# Required
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN
GITHUB_WEBHOOK_SECRET=your_strong_random_secret_here

# Optional
PORT=3000
NOTIFY_PRIVATE_REPOS=false
DISCORD_LEGACY_EMBEDS=false
WEBHOOK_FOOTER=github.com/jedbillyb/ghook
WEBHOOK_FOOTER_URL=https://github.com/jedbillyb/ghook
IGNORED_EVENTS=watch,fork
BRANCH_FILTER=main,develop,release/*
LOCALE=en

# Multi-webhook routing
DISCORD_WEBHOOK_RELEASES=https://discord.com/api/webhooks/.../...
DISCORD_WEBHOOK_CI=https://discord.com/api/webhooks/.../...
ROUTES=release:RELEASES,workflow_run:CI

# Polling - watch public repos/orgs/users (no install required on their side)
WATCH_REPOS=torvalds/linux:release,push;vercel/next.js
WATCH_ORGS=vercel:release
WATCH_USERS=gaearon
POLL_INTERVAL=60000
GITHUB_TOKEN=ghp_xxxx
```

| Variable | Default | Description |
|---|---|---|
| `DISCORD_WEBHOOK_URL` | - | Primary Discord webhook URL |
| `GITHUB_WEBHOOK_SECRET` | - | HMAC secret set in your GitHub App |
| `PORT` | `3000` | Port the server listens on |
| `NOTIFY_PRIVATE_REPOS` | `false` | Forward events from private repos |
| `DISCORD_LEGACY_EMBEDS` | `false` | Fall back to classic embeds instead of Components V2 |
| `WEBHOOK_FOOTER` | `github.com/jedbillyb/ghook` | Footer text on each message. Set empty to drop it and keep only the timestamp |
| `WEBHOOK_FOOTER_URL` | ghook repo URL | Footer link target (Components V2 only). Set empty to render the text unlinked |
| `IGNORED_EVENTS` | - | Comma-separated event names to drop (e.g. `watch,fork`) |
| `BRANCH_FILTER` | - | Comma-separated branch patterns for push/create/delete. `*` matches one segment |
| `ROUTES` | - | Map events to named webhooks: `release:RELEASES,workflow_run:CI` |
| `LOCALE` | `en` | Message language. Supported: `en`, `fr` |
| `WATCH_REPOS` | - | Repos to poll. `;` separates targets, `:events` filters by event type. Private repos need a `GITHUB_TOKEN` with read access and `NOTIFY_PRIVATE_REPOS=true` |
| `WATCH_ORGS` | - | Orgs to poll. Same syntax as `WATCH_REPOS` |
| `WATCH_USERS` | - | Users to poll. Same syntax as `WATCH_REPOS`. Public events only |
| `POLL_INTERVAL` | `60000` | Polling interval in ms |
| `GITHUB_TOKEN` | - | PAT for GitHub API auth - raises rate limit from 60 to 5000 req/hr. Without it, one target at the default interval already sits at the unauthenticated ceiling |

---

## Deployment

### systemd

```bash
sudo cp /opt/ghook/github-discord-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now github-discord-bot
sudo journalctl -u github-discord-bot -f
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t ghook .
docker run -p 3000:3000 --env-file .env ghook
```

### Reverse proxy

<details>
<summary><strong>Caddy (recommended - auto HTTPS)</strong></summary>

```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

</details>

<details>
<summary><strong>Nginx</strong></summary>

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

</details>

---

## Testing

```bash
npm test
```

93 unit tests covering signature verification, Components V2 and legacy embed builders, Discord routing, event filtering, push batching, and the polling pipeline. CI runs on Node 20 and 22 against every PR and push to main.

```bash
# Health check
curl http://localhost:3000

# Simulate a webhook (signature will fail - expected)
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: sha256=fake" \
  -d '{"repository":{"full_name":"test/repo"},"commits":[]}'
```

---

## Troubleshooting

**`Invalid signature - rejected`**
`GITHUB_WEBHOOK_SECRET` doesn't match what's set in your GitHub App. Check for leading/trailing spaces.

**`Discord API error: 401`**
Discord webhook URL is invalid or deleted. Regenerate it in Discord -> Server Settings -> Integrations -> Webhooks.

**`Address already in use`**
Port `3000` is taken. Change `PORT` in `.env` or find the conflict: `sudo lsof -i :3000`.

**No Discord notifications**
Check the service is running (`sudo systemctl status github-discord-bot`), tail logs (`sudo journalctl -u github-discord-bot -f`), and check GitHub App -> webhook delivery history for errors.

**Components V2 messages failing silently**
Discord's Components V2 is still server-gated. Set `DISCORD_LEGACY_EMBEDS=true` until your server has access.

---

## Contributing

Pull requests are welcome. Keep changes focused - one fix or feature per PR. If you're adding a new event handler, follow the pattern in `src/handlers/` and register it in `router.js`.

---

<div align="center">
<sub><a href="LICENSE">MIT</a> © <a href="https://github.com/jedbillyb">jedbillyb</a> · Made with ❤️</sub>
</div>
