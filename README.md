# ghook - GitHub → Discord Bridge

A comprehensive, production-ready Node.js application that bridges GitHub webhook events to Discord notifications via rich embeds. This bot uses GitHub Apps for global repository coverage, eliminating the need to configure webhooks per repository.

## Table of Contents

- [Features](#-features)
- [How It Works](#-how-it-works)
- [Architecture](#-architecture)
- [Supported Events](#-supported-events)
- [Prerequisites](#-prerequisites)
- [GitHub App Setup](#-github-app-setup)
- [Installation & Setup](#-installation--setup)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)

## Features

- **Global Repository Coverage**: One-time setup covers all current and future repositories via GitHub Apps
- **Rich Discord Embeds**: Color-coded, informative notifications with repository details, user avatars, and direct links
- **Event-Driven Architecture**: Handles multiple GitHub webhook events with dedicated handlers
- **Signature Verification**: HMAC-SHA256 verification ensures webhook authenticity
- **Production Ready**: Includes systemd service file, environment configuration, and deployment scripts
- **Minimal Dependencies**: Built with Express.js and Node.js standard library
- **Comprehensive Logging**: Detailed console output for debugging and monitoring

## How It Works

### Webhook Flow

1. **GitHub Event Trigger**: When an event occurs in any monitored repository (push, issue, star, etc.)
2. **Webhook Delivery**: GitHub sends a POST request to your configured webhook URL with event payload
3. **Signature Verification**: Server verifies the HMAC-SHA256 signature using your secret key
4. **Event Routing**: Payload is routed to the appropriate handler based on the `X-GitHub-Event` header
5. **Discord Notification**: Handler formats the event data into a rich embed and sends it to Discord

### GitHub Apps vs Repository Webhooks

Unlike traditional repository webhooks that require setup per repo, GitHub Apps provide:
- **Account-level installation**: One app covers all repositories
- **Automatic future repo coverage**: New repositories are included without additional configuration
- **Granular permissions**: Fine-tuned access controls
- **Better security**: App-based authentication with private keys (though this implementation uses webhook secrets)

## Architecture

### Project Structure

```
ghook/
├── src/
│   ├── server.js          # Main Express server and webhook endpoint
│   ├── verify.js          # Webhook signature verification
│   ├── discord.js         # Discord webhook HTTP client
│   ├── router.js          # Event routing logic
│   └── handlers/          # Event-specific processing
│       ├── push.js        # Git push events
│       ├── create.js      # Repository/branch/tag creation
│       ├── delete.js      # Repository/branch/tag deletion
│       ├── star.js        # Repository starring
│       ├── fork.js        # Repository forking
│       ├── pullRequest.js # Pull request events
│       ├── issues.js      # Issue events
│       ├── issueComment.js# Issue comment events
│       ├── release.js     # Release events
├── github-discord-bot.service  # Systemd service configuration
├── package.json               # Node.js dependencies and scripts
├── .env.example               # Environment variables template
└── README.md                  # This file
```

### Core Components

#### Server (`server.js`)
- Express.js application listening on configurable port (default: 3000)
- Raw body parsing for signature verification
- Health check endpoint at `/`
- Webhook endpoint at `/webhook` with POST method
- Middleware for JSON parsing and signature validation

#### Verification (`verify.js`)
- HMAC-SHA256 signature verification using Node.js crypto module
- Timing-safe comparison to prevent timing attacks
- Uses `GITHUB_WEBHOOK_SECRET` environment variable

#### Discord Client (`discord.js`)
- HTTPS request client for Discord webhook API
- Sends rich embed payloads as JSON
- Error handling for failed deliveries
- Uses `DISCORD_WEBHOOK_URL` environment variable

#### Router (`router.js`)
- Maps GitHub event types to handler functions
- Supports extensible handler registration
- Logs unhandled events for debugging

#### Event Handlers
Each handler extracts relevant data from the GitHub webhook payload and formats it into a Discord embed with:
- Author information (user avatar, GitHub profile link)
- Event-specific title and description
- Repository context and links
- Color coding for different event types
- Timestamps and footer metadata

## Supported Events

| Event Type | Handler | Description | Discord Color |
|------------|---------|-------------|---------------|
| `push` | `handlePush` | Code commits pushed to repository | Green (#238636) |
| `create` | `handleCreate` | New repository, branch, or tag created | Blue (#1f6feb) |
| `delete` | `handleDelete` | Repository, branch, or tag deleted | Red (#f85149) |
| `watch` | `handleStar` | Repository starred by user | Yellow (#e3b341) |
| `fork` | `handleFork` | Repository forked | Purple (#a371f7) |
| `pull_request` | `handlePullRequest` | PR opened, closed, merged, etc. | Blue (#58a6ff) |
| `issues` | `handleIssues` | Issue opened, closed, reopened | Green/Red/Orange |
| `issue_comment` | `handleIssueComment` | New comment on issue | Blue (#58a6ff) |
| `release` | `handleRelease` | Release published, released, or prereleased | Green (#238636) |

### Example Embed Formats

#### Push Event
```
[User Avatar] User Name
Pushed 3 commits to `main`

[`a1b2c3d`] Initial commit message
[`e4f5g6h`] Fix bug in authentication
[`i7j8k9l`] Update documentation

Repository: [owner/repo](https://github.com/owner/repo)
Branch: `main`

ghook • [timestamp]
```

#### Delete Event
```
[User Avatar] User Name
Deleted branch `feature-x`

Repository: [owner/repo](https://github.com/owner/repo)
Type: Branch

ghook • [timestamp]
```

#### Release Event
```
[User Avatar] User Name
🚀 v1.0.0

Release notes or description here...

Repository: [owner/repo](https://github.com/owner/repo)
Tag: `v1.0.0`
Type: Release

ghook • [timestamp]
```

#### Star Event
```
[User Avatar] User Name
⭐ owner/repo

Repository description here...

Stars: ⭐ 1,234
Forks: 🍴 567
Language: JavaScript

ghook • [timestamp]
```

## Prerequisites

### System Requirements
- **Node.js**: Version 16+ (tested with 20.x)
- **Operating System**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows
- **Memory**: 128MB minimum, 256MB recommended
- **Storage**: 50MB for installation + logs

### Accounts & Permissions
- **GitHub Account**: With repository creation permissions
- **Discord Server**: With "Manage Webhooks" permission in target channel
- **VPS/Server**: For production deployment (optional for local development)

### Network Requirements
- **Inbound**: Port 3000 (configurable) for webhook delivery
- **Outbound**: HTTPS access to Discord API (`discord.com`)
- **Optional**: HTTPS certificate for secure webhook URLs

## GitHub App Setup

This bot uses GitHub Apps for webhook delivery. You need to create a GitHub App and configure it with the correct permissions and webhook URL.

### Creating a GitHub App

1. **Go to GitHub Settings**
   - Navigate to [GitHub Settings → Developer settings → GitHub Apps](https://github.com/settings/apps)
   - Click "New GitHub App"

2. **Basic Information**
   - **GitHub App name**: `ghook` (or your preferred name)
   - **Description**: Brief description of your Discord bot
   - **Homepage URL**: Your repository URL or personal website

3. **Permissions & Events**
   - **Repository permissions**:
     - `Contents`: Read-only (required for release events)
     - `Issues`: Read-only
     - `Metadata`: Read-only (required)
     - `Pull requests`: Read-only
   - **Subscribe to events**:
     - ✅ Push
     - ✅ Create
     - ✅ Delete
     - ✅ Fork
     - ✅ Issues
     - ✅ Issue comment
     - ✅ Pull request
     - ✅ Release
     - ✅ Watch (for star events)

4. **Webhook Configuration**
   - **Webhook URL**: `https://yourdomain.com/webhook` (your server URL)
   - **Webhook secret**: Generate a strong random string (same as `GITHUB_WEBHOOK_SECRET` in `.env`)
   - **SSL verification**: Enable (recommended)

5. **Install the App**
   - After creating, go to "Install App" in the left sidebar
   - Install on your account or organization
   - Select repositories or "All repositories"

### Required Permissions Summary

| Permission | Access | Required For |
|------------|--------|--------------|
| `Contents` | Read | Release events, repository metadata |
| `Issues` | Read | Issue and comment events |
| `Metadata` | Read | Repository information (required) |
| `Pull requests` | Read | Pull request events |

**Note**: The app uses webhook secrets for authentication, not private keys, so no key download is needed.

## Installation & Setup

### Local Development Setup

1. **Clone or Download the Repository**
   ```bash
   git clone https://github.com/yourusername/ghook.git
   cd ghook
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values (see Configuration section)
   ```

4. **Start Development Server**
   ```bash
   npm run dev  # Uses --watch for auto-restart
   ```

5. **Test Health Check**
   ```bash
   curl http://localhost:3000
   # Should return: "GitHub → Discord bot is running."
   ```

### Production VPS Setup (Ubuntu/Debian)

#### Automated Setup Script (Recommended)
```bash
# Download and run the setup script
wget https://raw.githubusercontent.com/yourusername/ghook/main/setup.sh
chmod +x setup.sh
sudo ./setup.sh
```

#### Manual Setup Steps

1. **Update System**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
   sudo apt-get install -y nodejs
   node --version  # Verify installation
   ```

3. **Install Unzip (for file uploads)**
   ```bash
   sudo apt-get install -y unzip
   ```

4. **Create Application Directory**
   ```bash
   sudo mkdir -p /opt/github-discord-bot
   sudo chown $USER:$USER /opt/github-discord-bot
   ```

5. **Upload Project Files**
   ```bash
   # From your local machine
   scp -r ./ghook root@YOUR_VPS_IP:/opt/
   ```

6. **Install Dependencies**
   ```bash
   cd /opt/ghook
   npm install --production
   ```

7. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env  # Add your configuration
   ```

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Discord Webhook Configuration
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# GitHub Webhook Security
GITHUB_WEBHOOK_SECRET=your_super_secret_random_string_here

# Server Configuration
PORT=3000
```

### Discord Webhook URL

1. Open Discord → Server Settings → Integrations → Webhooks
2. Create new webhook or copy existing URL
3. Format: `https://discord.com/api/webhooks/{webhook_id}/{webhook_token}`

### GitHub Webhook Secret

- Generate a strong, random string (32+ characters recommended)
- Use a password manager or generator
- Must match exactly in GitHub App settings
- Example: `GITHUB_WEBHOOK_SECRET=sk-abc123def456ghi789jkl012mno345pqr`

### Port Configuration

- Default: `3000`
- Change if port is already in use
- Ensure firewall allows inbound connections
- For production, consider reverse proxy (nginx/Caddy)

## Deployment

### Systemd Service (Linux)

1. **Install Service File**
   ```bash
   sudo cp /opt/ghook/github-discord-bot.service /etc/systemd/system/
   sudo systemctl daemon-reload
   ```

2. **Enable Auto-start**
   ```bash
   sudo systemctl enable github-discord-bot
   ```

3. **Start Service**
   ```bash
   sudo systemctl start github-discord-bot
   ```

4. **Check Status**
   ```bash
   sudo systemctl status github-discord-bot
   ```

5. **View Logs**
   ```bash
   sudo journalctl -u github-discord-bot -f
   ```

### Docker Deployment

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

### Reverse Proxy Setup (Recommended)

#### With Caddy (Simple HTTPS)
```bash
sudo apt install -y caddy
```

Create `/etc/caddy/Caddyfile`:
```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl restart caddy
```

#### With Nginx
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

## Testing

### Local Testing

1. **Start the Server**
   ```bash
   npm start
   ```

2. **Test Health Endpoint**
   ```bash
   curl http://localhost:3000
   ```

3. **Test Webhook Endpoint** (with sample payload)
   ```bash
   curl -X POST http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -H "X-GitHub-Event: push" \
     -H "X-Hub-Signature-256: sha256=fake_signature" \
     -d '{"repository":{"full_name":"test/repo"},"commits":[]}'
   ```

### GitHub Webhook Testing

1. **Use ngrok for Local Testing**
   ```bash
   npm install -g ngrok
   ngrok http 3000
   # Use the ngrok URL as webhook URL in GitHub
   ```

2. **Test with Real Events**
   - Push a commit to a test repository
   - Create/star/fork the repository
   - Open/close issues and PRs

### Discord Webhook Testing

```bash
curl -H "Content-Type: application/json" \
  -d '{"content": "Test notification from GitHub bot"}' \
  YOUR_DISCORD_WEBHOOK_URL
```

## Troubleshooting

### Common Issues

#### "Invalid signature - rejected"
- **Cause**: `GITHUB_WEBHOOK_SECRET` mismatch between `.env` and GitHub App
- **Fix**: Ensure exact string match, check for extra spaces
- **Verify**: Check GitHub App settings → Webhook secret

#### "Discord API error: 401"
- **Cause**: Invalid or expired Discord webhook URL
- **Fix**: Regenerate webhook URL in Discord server settings
- **Verify**: Test URL with curl command above

#### "Address already in use"
- **Cause**: Port 3000 occupied by another process
- **Fix**: Change `PORT` in `.env` or kill conflicting process
- **Check**: `sudo lsof -i :3000`

#### Service Won't Start
- **Check Status**: `sudo systemctl status github-discord-bot`
- **View Logs**: `sudo journalctl -u github-discord-bot -n 50`
- **Restart**: `sudo systemctl restart github-discord-bot`

#### No Notifications in Discord
1. Verify bot is running: `sudo systemctl status github-discord-bot`
2. Check logs for errors: `sudo journalctl -u github-discord-bot -f`
3. Test webhook manually with curl
4. Check GitHub webhook delivery status in App settings

### Debug Mode

Enable verbose logging by modifying `server.js`:
```javascript
console.log(`📥 Received event: ${event}`, JSON.stringify(req.body, null, 2));
```

### Firewall Issues

**Ubuntu/Debian:**
```bash
sudo ufw allow 3000
sudo ufw status
```

**Check if port is accessible:**
```bash
telnet YOUR_VPS_IP 3000
```

### Log Analysis

**Recent Logs:**
```bash
sudo journalctl -u github-discord-bot -n 100
```

**Follow Logs Live:**
```bash
sudo journalctl -u github-discord-bot -f
```

**Filter by Time:**
```bash
sudo journalctl -u github-discord-bot --since "1 hour ago"
```

## Security

### Webhook Verification
- HMAC-SHA256 signatures prevent spoofing
- Timing-safe comparison prevents timing attacks
- Raw body verification ensures payload integrity

### Best Practices
- Use strong, unique webhook secrets
- Keep `.env` file secure (not in version control)
- Use HTTPS for production deployments
- Regularly rotate webhook secrets
- Monitor logs for suspicious activity

### Environment Security
- Never commit `.env` files to version control
- Use environment-specific secrets
- Restrict file permissions: `chmod 600 .env`
- Use Docker secrets or external secret management

## Contributing

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/new-handler`
3. **Make Changes**: Follow existing code patterns
4. **Add Tests**: Test webhook payloads and Discord output
5. **Submit Pull Request**: Include description and screenshots

### Adding New Event Handlers

1. Create `src/handlers/newEvent.js`
2. Implement handler function following existing patterns
3. Add to `router.js` handlers object
4. Update GitHub App permissions if needed
5. Test with sample webhook payloads

### Code Standards
- Use ES6+ syntax
- Follow existing naming conventions
- Add JSDoc comments for functions
- Handle errors gracefully
- Keep dependencies minimal

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- GitHub for comprehensive webhook documentation
- Discord for reliable webhook API
- Express.js community for the web framework
- Node.js for the runtime environment

---

**Need Help?** Open an issue on GitHub or check the troubleshooting section above.

---

Made with ❤️ by [jedbillyb](https://github.com/jedbillyb)
