# Phase 2 — Authentication and user

Phase 2 implements the authentication/user slice without crossing service ownership:

- API Gateway owns the Redis browser session and Google OAuth callback.
- Identity Service owns users, password tokens, profiles and addresses.
- Notification Service consumes `email.requested.v1`, creates idempotent email jobs
  and sends them through a separate retrying worker.

## Implemented flows

- Register, activation, login and logout.
- Shared Redis session across both Gateway instances.
- Profile update and address CRUD with one-default-address invariant.
- Change, forgot and reset password with hashed one-time tokens and TTL.
- Google OAuth start/callback, verified-profile normalization and Identity
  create/link resolution. Real Google login requires the three `GOOGLE_*`
  environment values in `.env` and an authorized callback URI.
- Account activation/password reset templates and JSON/SMTP email transports.
- Admin seed that is safe to run repeatedly.
- Responsive React pages for all auth, password, profile and address flows.

## Local verification

From `source/`:

```powershell
npm run lint
npm test
npm run build
docker compose up -d --build
npm run smoke
npm run auth:integration
npm run notification:integration
```

`auth:integration` verifies the Identity side of Google account creation and
idempotent resolution without contacting Google. A complete provider callback
must be checked manually with test credentials because CI must not contain a
real Google client secret.

The development default `EMAIL_TRANSPORT=json` produces no external email.
Set `EMAIL_TRANSPORT=smtp` and the `SMTP_*` variables to test real delivery.
