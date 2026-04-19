<div align="center">

<img src="assets/android-chrome-512x512-g.png" width="128" alt="ghook" />

# ghook

**GitHub → Discord webhook bridge. One setup, every repo, forever.**

[![Live](https://img.shields.io/badge/deployed-live-brightgreen?style=flat-square)](https://github.com/jedbillyb/ghook)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-4-000000?style=flat-square&logo=express)](https://expressjs.com)

</div>

---

A production-ready Node.js app that delivers rich, color-coded Discord embeds for every GitHub event. Uses GitHub Apps for account-level installation — one setup covers all current and future repositories automatically.

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Supported Events](#supported-events)
- [Prerequisites](#prerequisites)
- [GitHub App Setup](#github-app-setup)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Global repository coverage** — Install once, cover all repos including future ones
- **Rich Discord embeds** — Color-coded notifications with avatars, links, and context
- **HMAC-SHA256 verification** — Every webhook payload is verified before processing
- **Event-driven handlers** — Dedicated, modular handler per event type
- **Minimal dependencies** — Express.js and Node.js stdlib only
- **Production ready** — systemd service, env config, and deployment scripts included
- **Comprehensive logging** — Detailed output for monitoring and debugging

---

## How It Works

### Webhook Flow

1. **GitHub Event** — An event occurs (push, issue, star, etc.) in any monitored repo
2. **Webhook Delivery** — GitHub POSTs the payload to your configured webhook URL
3. **Signature Verification** — Server checks the HMAC-SHA256 signature against your secret
4. **Event Routing** — Payload is dispatched to the correct handler via `X-GitHub-Event`
5. **Discord Notification** — Handler formats the event into an embed and sends it to Discord

### GitHub Apps vs Repository Webhooks

GitHub Apps give you account-level installation — unlike per-repo webhooks, they:

- Cover all repositories from a single installation
- Automatically include new repos without extra configuration
- Offer fine-grained, auditable permissions
- Use webhook secrets for authentication (no private key download needed)

---

## Architecture

### Project Structure

```
ghook/
├── src/
│   ├── server.js           # Express server and webhook endpoint
│   ├── verify.js           # HMAC-SHA256 signature verification
│   ├── discord.js          # Discord webhook HTTP client
│   ├── router.js           # Event routing logic
│   └── handlers/
│       ├── push.js         # Git push events
│       ├── create.js       # Branch/tag creation
│       ├── delete.js       # Branch/tag deletion
│       ├── star.js         # Repository starring
│       ├── fork.js         # Repository forking
│       ├── pullRequest.js  # Pull request lifecycle
│       ├── issues.js       # Issue events
│       ├── issueComment.js # Issue comment events
│       └── release.js      # Release events
├── github-discord-bot.service  # systemd unit file
├── package.json
├── .env.example
└── README.md
```

### Core Components

**`server.js`** — Express app on configurable port (default `3000`). Raw body parsing for signature validation, health check at `/`, webhook endpoint at `/webhook`.

**`verify.js`** — HMAC-SHA256 verification using Node.js crypto. Timing-safe comparison prevents timing attacks.

**`discord.js`** — HTTPS client for the Discord webhook API. Sends rich embed payloads as JSON with error handling.

**`router.js`** — Maps `X-GitHub-Event` headers to handler functions. Logs unhandled events for visibility.

**Event Handlers** — Each handler extracts payload data and produces a Discord embed with author avatar, color coding, repo context, links, and timestamps.

---

## Supported Events

| Event | Handler | Description | Color |
|---|---|---|---|
| `push` | `handlePush` | Commits pushed to a branch | Green `#238636` |
| `create` | `handleCreate` | Branch or tag created | Blue `#1f6feb` |
| `delete` | `handleDelete` | Branch or tag deleted | Red `#f85149` |
| `watch` | `handleStar` | Repository starred | Yellow `#e3b341` |
| `fork` | `handleFork` | Repository forked | Purple `#a371f7` |
| `pull_request` | `handlePullRequest` | PR opened, closed, merged | Blue `#58a6ff` |
| `issues` | `handleIssues` | Issue opened, closed, reopened | Green/Red/Orange |
| `issue_comment` | `handleIssueComment` | Comment on an issue | Blue `#58a6ff` |
| `release` | `handleRelease` | Release published or prereleased | Green `#238636` |

### Example Embed Formats

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
<summary><strong>Delete event</strong></summary>

```
[User Avatar] User Name
Deleted branch `feature-x`

Repository: owner/repo
Type: Branch

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

## Prerequisites

### System Requirements

- **Node.js** 16+ (tested on 20.x)
- **OS** Linux (Ubuntu 20.04+ recommended), macOS, or Windows
- **RAM** 128 MB minimum, 256 MB recommended
- **Disk** ~50 MB for install + logs

### Accounts & Permissions

- GitHub account with repository creation permissions
- Discord server with "Manage Webhooks" permission in the target channel
- VPS or server for production deployment (optional for local dev)

### Network

- Inbound on port `3000` (configurable) for webhook delivery
- Outbound HTTPS to `discord.com`
- Optional: TLS certificate for a secure webhook URL

---

## GitHub App Setup

### Creating the App

1. Go to [GitHub Settings → Developer settings → GitHub Apps](https://github.com/settings/apps) and click **New GitHub App**

2. Fill in basic info:
   - **Name**: `ghook` (or your preference)
   - **Homepage URL**: your repo or personal site

3. Set **Repository permissions**:
   - `Contents` → Read-only
   - `Issues` → Read-only
   - `Metadata` → Read-only *(required)*
   - `Pull requests` → Read-only

4. Subscribe to **events**:
   - ✅ Push, Create, Delete, Fork, Issues, Issue comment, Pull request, Release, Watch

5. Configure the **webhook**:
   - **URL**: `https://yourdomain.com/webhook`
   - **Secret**: a strong random string — this becomes `GITHUB_WEBHOOK_SECRET` in `.env`
   - **SSL verification**: enabled

6. After creating, go to **Install App** → install on your account → select repositories or **All repositories**

### Required Permissions Summary

| Permission | Access | Required For |
|---|---|---|
| `Contents` | Read | Release events, repo metadata |
| `Issues` | Read | Issue and comment events |
| `Metadata` | Read | Repository info *(always required)* |
| `Pull requests` | Read | Pull request events |

> No private key download needed — authentication is handled via webhook secrets.

---

## Installation & Setup

### Local Development

```bash
git clone https://github.com/jedbillyb/ghook.git
cd ghook
npm install
cp .env.example .env
# Edit .env with your values
npm run dev   # Auto-restarts on file changes
```

Verify it's running:

```bash
curl http://localhost:3000
# → "GitHub → Discord bot is running."
```

### Production Setup (Ubuntu/Debian)

**Automated:**

```bash
wget https://raw.githubusercontent.com/jedbillyb/ghook/main/setup.sh
chmod +x setup.sh
sudo ./setup.sh
```

**Manual:**

```bash
# 1. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# 2. Create app directory
sudo mkdir -p /opt/ghook
sudo chown $USER:$USER /opt/ghook

# 3. Upload and install
scp -r ./ghook root@YOUR_VPS_IP:/opt/
cd /opt/ghook
npm install --production

# 4. Configure
cp .env.example .env
nano .env
```

---

## Configuration

Create a `.env` file in the project root:

```env
# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN

# GitHub
GITHUB_WEBHOOK_SECRET=your_strong_random_secret_here

# Server
PORT=3000
```

**Discord webhook URL** — Discord → Server Settings → Integrations → Webhooks → create or copy.

**Webhook secret** — 32+ character random string. Must match exactly in GitHub App settings.

**Port** — Default `3000`. Change if occupied, and ensure your firewall allows inbound connections.

---

## Deployment

### systemd Service

```bash
sudo cp /opt/ghook/github-discord-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable github-discord-bot
sudo systemctl start github-discord-bot

# Monitor
sudo systemctl status github-discord-bot
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

### Reverse Proxy

<details>
<summary><strong>Caddy (recommended — auto HTTPS)</strong></summary>

```bash
sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:
```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl restart caddy
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

### Health & Webhook Endpoints

```bash
# Health check
curl http://localhost:3000

# Simulate a webhook (signature will fail — expected)
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: sha256=fake_signature" \
  -d '{"repository":{"full_name":"test/repo"},"commits":[]}'
```

### Local Tunnel (for real GitHub events)

```bash
npm install -g ngrok
ngrok http 3000
# Use the ngrok URL as your GitHub App webhook URL
```

### Discord Webhook

```bash
curl -H "Content-Type: application/json" \
  -d '{"content": "Test notification from ghook"}' \
  YOUR_DISCORD_WEBHOOK_URL
```

---

## Troubleshooting

### Common Issues

**`Invalid signature - rejected`**
- `GITHUB_WEBHOOK_SECRET` in `.env` doesn't match GitHub App settings
- Check for leading/trailing spaces — must be an exact match

**`Discord API error: 401`**
- Discord webhook URL is invalid or was deleted
- Regenerate in Discord → Server Settings → Integrations → Webhooks

**`Address already in use`**
- Port `3000` is taken by another process
- Change `PORT` in `.env` or find the conflict: `sudo lsof -i :3000`

**Service won't start**
```bash
sudo systemctl status github-discord-bot
sudo journalctl -u github-discord-bot -n 50
```

**No Discord notifications**
1. Check service is running: `sudo systemctl status github-discord-bot`
2. Tail logs: `sudo journalctl -u github-discord-bot -f`
3. Test Discord webhook manually with curl
4. Check GitHub App → webhook delivery history for errors

### Firewall

```bash
sudo ufw allow 3000
sudo ufw status
```

### Log Commands

```bash
sudo journalctl -u github-discord-bot -n 100        # Recent logs
sudo journalctl -u github-discord-bot -f            # Live tail
sudo journalctl -u github-discord-bot --since "1 hour ago"
```

### Debug Logging

In `server.js`, add verbose output for incoming events:

```javascript
console.log(`📥 Received event: ${event}`, JSON.stringify(req.body, null, 2));
```

---

## Security

### Webhook Verification

- HMAC-SHA256 signatures prevent spoofed deliveries
- Timing-safe comparison eliminates timing oracle attacks
- Raw body verification ensures payload integrity before parsing

### Best Practices

- Use a strong, unique webhook secret (32+ characters)
- Never commit `.env` to version control — it's in `.gitignore`
- Use HTTPS in production (Caddy handles this automatically)
- Rotate webhook secrets periodically
- Restrict `.env` permissions: `chmod 600 .env`
- Monitor logs for unexpected event patterns

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-handler`
3. Implement changes following existing code patterns
4. Test with sample webhook payloads
5. Submit a pull request with a description and screenshots

### Adding a New Event Handler

1. Create `src/handlers/newEvent.js`
2. Implement the handler following existing patterns
3. Register it in `router.js`
4. Update GitHub App permissions if the new event requires them
5. Test with a real or simulated payload

### Code Standards

- ES6+ syntax throughout
- Follow existing naming conventions
- JSDoc comments on all exported functions
- Graceful error handling — never crash on a bad payload
- Keep dependencies minimal

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
<sub>MIT © <a href="https://github.com/jedbillyb">jedbillyb</a> · Made with ❤️</sub>
</div>
