# Changelog

All notable changes to ghook are documented here.

---

## [v1.4.0] - 2026-05-15

### Added
- **Multi-webhook routing** — Route GitHub events to different Discord channels. Declare extra webhooks with `DISCORD_WEBHOOK_<NAME>` and map events via `ROUTES`. First match wins; unmatched events fall back to `DISCORD_WEBHOOK_URL`. Contributed by [@Osheun](https://github.com/Osheun).
- **i18n support** — Localize static strings via the `LOCALE` env var. Ships with `en` and `fr`. Unknown locales fall back to `en`. User-authored content is always passed through unchanged. Contributed by [@Osheun](https://github.com/Osheun).

[Full changelog](https://github.com/jedbillyb/ghook/compare/v1.3.0...v1.4.0)

---

## [v1.3.0] - 2026-05-14

### Fixed
- Malformed `X-Hub-Signature-256` headers no longer crash the server. Buffer lengths are checked before `crypto.timingSafeEqual`, so bad headers return a clean 401.

### Added
- **Event filters** — `IGNORED_EVENTS` drops named events entirely; `BRANCH_FILTER` restricts push/create/delete to matching branch patterns. Tag refs always pass through. Contributed by [@Osheun](https://github.com/Osheun).
- **GitHub Actions notifications** — New `workflow_run` handler sends a Discord notification when a workflow completes. Colour-coded by conclusion. Contributed by [@Osheun](https://github.com/Osheun).
- **Test suite and CI** — 34 unit tests covering signature verification, embed builders, routing, event filtering, and push batching. CI runs on Node 20 and 22. Contributed by [@Osheun](https://github.com/Osheun).

[Full changelog](https://github.com/jedbillyb/ghook/compare/v1.2.1...v1.3.0)

---

## [v1.2.1] - 2026-05-14

### Fixed
- Duplicate Discord notifications on release publish. GitHub fires `published`, `released`, and `prereleased` simultaneously — the handler now deduplicates by tag name so only one notification is sent.

[Full changelog](https://github.com/jedbillyb/ghook/compare/v1.2.0...v1.2.1)

---

## [v1.2.0] - 2026-05-14

### Added
- **Discord Components V2** — Notifications now use Discord's modern component-based layout by default. Set `DISCORD_LEGACY_EMBEDS=true` to fall back to classic embeds. Contributed by [@Osheun](https://github.com/Osheun).
- **Private repository filtering** — Events from private repos are skipped by default. Set `NOTIFY_PRIVATE_REPOS=true` to opt in. Contributed by [@Osheun](https://github.com/Osheun).
- `WEBHOOK_FOOTER` and `WEBHOOK_FOOTER_URL` env vars to override the footer text and link in Components V2 mode.
- Push event batching — multiple pushes to the same branch within 5 seconds are coalesced into one notification.
- Release deduplication — duplicate release events are suppressed.

### Changed
- Emojis removed from all Discord embed content and server-side logs. Contributed by [@Osheun](https://github.com/Osheun).
- Improved issue and PR embed detail.

### Fixed
- Notifications suppressed for pushes with no commits (e.g. force push resets).

[Full changelog](https://github.com/jedbillyb/ghook/compare/v1.1.1...v1.2.0)

---

## [v1.1.1] - 2026-04-08

### Changed
- Footer and timestamp format standardized across all event handlers for consistent branding.

[Full changelog](https://github.com/jedbillyb/ghook/compare/v1.1.0...v1.1.1)

---

## [v1.1.0] - 2026-04-08

### Added
- `delete` event handler for branch and tag deletions.
- `release` event handler with pre-release awareness and colour coding.
- GitHub App setup guide in README covering permissions, event subscriptions, and security.

[Full changelog](https://github.com/jedbillyb/ghook/compare/v1.0.0...v1.1.0)

---

## [v1.0.0] - 2026-04-05

Initial release.

- GitHub App integration for global repository coverage
- Rich Discord embeds with colour coding, avatars, and direct links
- HMAC-SHA256 webhook signature verification
- Handlers for push, star, fork, pull request, issues, issue comments, and branch/tag creation
- systemd service file and reverse proxy support
