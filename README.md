# GitHub → Discord Notification Bot

Receives GitHub webhook events **globally across all your repositories** via a GitHub App, and forwards colour-coded rich embeds to a Discord channel.

## Supported Events

| Event | Description |
|-------|-------------|
| `push` | Commits pushed (repo, branch, committer, messages, link) |
| `create` | New repo/branch/tag created |
| `watch` (star) | Someone stars a repo |
| `fork` | Someone forks a repo |
| `pull_request` | PR opened, closed, or merged |
| `issues` | Issue opened, closed, or reopened |
| `issue_comment` | New comment on an issue |

## How It Works

Instead of adding a webhook to each repo individually, you create a **GitHub App** on your personal account. The app is installed on **all your repositories** at once, so any new repo you create is automatically covered — no extra setup needed.

GitHub Apps send webhook events in the exact same format as repo webhooks, with the same `x-hub-signature-256` signature verification.

## Quick Start (local)

```bash
cp .env.example .env
# Edit .env with your Discord webhook URL and a random secret
npm install
npm start
```

## Deploy on Ubuntu VPS

```bash
# 1. Copy project to /opt
sudo cp -r . /opt/github-discord-bot
cd /opt/github-discord-bot
sudo cp .env.example .env
sudo nano .env          # fill in real values

# 2. Install deps
sudo npm install --production

# 3. Install systemd service
sudo cp github-discord-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now github-discord-bot

# 4. Check status
sudo systemctl status github-discord-bot
sudo journalctl -u github-discord-bot -f
```

## GitHub App Setup (Global Webhooks)

This is how you get **all repos** covered with a single setup:

### 1. Create a GitHub App

1. Go to **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**  
   Direct link: https://github.com/settings/apps/new
2. Fill in:
   - **GitHub App name:** e.g. `My Discord Notifier`
   - **Homepage URL:** your VPS IP or any URL
   - **Webhook URL:** `http://YOUR_VPS_IP:3000/webhook`
   - **Webhook secret:** a strong random string (save this for `.env`)
3. Under **Permissions**, set **Read-only** for:
   - Repository → Contents
   - Repository → Issues
   - Repository → Pull requests
   - Repository → Metadata (always on)
4. Under **Subscribe to events**, check:
   - ✅ Push
   - ✅ Create
   - ✅ Watch (stars)
   - ✅ Fork
   - ✅ Pull request
   - ✅ Issues
   - ✅ Issue comment
5. Set **Where can this GitHub App be installed?** → `Only on this account`
6. Click **Create GitHub App**

### 2. Install the App on Your Account

1. After creating, click **Install App** (left sidebar)
2. Choose your account
3. Select **All repositories** (or pick specific ones)
4. Click **Install**

That's it! Every repo (including future ones) will now send events to your bot.

### 3. Configure `.env`

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN
GITHUB_WEBHOOK_SECRET=the_secret_you_set_in_step_2
PORT=3000
```

> **HTTPS:** For production, put the bot behind **nginx** or **Caddy** with a TLS certificate. GitHub Apps strongly recommend HTTPS webhook URLs.

## Project Structure

```
src/
├── server.js          # Express server + webhook endpoint
├── verify.js          # HMAC-SHA256 signature verification
├── discord.js         # Discord webhook sender
├── router.js          # Routes events to handlers
└── handlers/
    ├── push.js
    ├── create.js
    ├── star.js
    ├── fork.js
    ├── pullRequest.js
    ├── issues.js
    └── issueComment.js
```
