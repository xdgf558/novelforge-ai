# Security Policy

## Supported versions

Security fixes are applied to the latest code on `main` and to the most recent
desktop release when one is actively maintained. Older local builds may not
receive backports.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's
[private vulnerability reporting](https://github.com/xdgf558/novelforge-ai/security/advisories/new)
to send a confidential report.

Include:

- the affected version or commit;
- reproducible steps and expected impact;
- relevant logs with credentials, local file paths, and novel content removed;
- a suggested fix, if available.

We aim to acknowledge reports within five business days and will coordinate
disclosure after a fix is available. Do not include API keys, publishing
tokens, local databases, backups, generated manuscripts, or other private
author data in a report.

## Security boundaries

- AI and publishing credentials are local secrets and must never be committed.
- AI tasks send selected writing context to providers configured by the author.
- Desktop databases and generated assets stay outside the application bundle.
- AI output cannot directly overwrite formal story memory without author
  approval.

Production dependencies are checked in CI with `npm audit --omit=dev`. Some
desktop packaging dependencies are development-only and may temporarily carry
upstream advisories until Electron Builder publishes a compatible fix; they
must not be loaded by the installed application at runtime.
