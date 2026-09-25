# Deployment

## VPS with Nginx + PM2

1. Install Node.js 22+, MongoDB 8 (or use Atlas), Nginx and PM2. Place the project in `/var/www/bg-elevators-cms`.
2. `npm ci`; copy `.env.example` to `.env` and set MongoDB and administrator variables.
3. Set `NODE_ENV=production`, `TRUST_PROXY=1` and `CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com`. Use exact origins, no trailing slash. Set `API_URL=http://127.0.0.1:4000`.
4. Set a persistent `UPLOAD_DIR`. The API process must own it; do not expose it as a public static directory because resumes are private.
5. `npm run seed` then remove the initial administrator password from the environment file.
6. `npm run build`.
7. `pm2 start ecosystem.config.cjs`; `pm2 save`; configure PM2 startup for your service user.
8. Adapt `deploy/nginx-vps.conf.example` with your actual paths/domain, enable it, validate with `nginx -t` and reload Nginx.
9. Enable a valid HTTPS certificate using your provider or Certbot. Secure production cookies require HTTPS.
10. Open `/admin/`, sign in, set the correct website domain in Site settings, and test a draft/publication and both contact and career submissions.
11. Configure ImageKit and SMTP only if required. Without SMTP, submissions are still visible in the CMS. Confirm delivery using your own test address after configuring SMTP.

Bind MongoDB privately and allow only necessary public web ports. Do not expose ports 3000/4000 directly when Nginx is your public entry point. `TRUST_PROXY=1` assumes exactly one trusted reverse proxy; adjust the deployment if you add another proxy.

## Docker Compose

1. Create `.env` and set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `MONGO_ROOT_USERNAME`, and `MONGO_ROOT_PASSWORD`. Use URL-safe random MongoDB credentials, since Compose embeds them in its internal connection URI.
2. Set the HTTPS public domain(s) in `CORS_ORIGINS`.
3. Run `docker compose up --build -d`.
4. Compose starts a persistent MongoDB, an idempotent seed job, the Express API, Next.js and Nginx. The web gateway is available on port 8080.
5. Put an HTTPS reverse proxy in front of port 8080. Production session cookies do not work over plain HTTP.
6. Visit `https://your-domain/admin/`. Remove the initial administrator password after the first successful setup. Future seed runs never replace an existing account password.

MongoDB uses the `mongo_data` volume; uploaded files use the `uploads` volume. Do not delete these volumes during upgrades. The Compose file intentionally does not publish MongoDB or API ports. For Atlas, use the VPS configuration or adapt Compose's explicit internal `MONGODB_URI` overrides and remove its local MongoDB service.

## Backup and upgrade

- Back up MongoDB with `mongodump` and the private upload directory/volume. With ImageKit, retain asset records and provider backups as appropriate.
- Back up `.env` separately with restricted permissions; it is never included in the source ZIP or Git.
- Restore to staging first, verify a page and a private resume, then promote the release.
- For upgrades, keep the database and uploads, run `npm ci` and `npm run build`, and restart PM2 or rebuild the Compose services. Seed only adds missing original records; it preserves edits.

## Sites preview

The optional preview uses the same content templates, validation and CMS service with Cloudflare D1/R2 because Sites does not run MongoDB TCP clients or a Node/Express process. It uses the private Site's ChatGPT authentication. The ZIP's VPS version uses the separate Next.js/React/Express/MongoDB architecture and its own administrator/editor accounts.

Private preview content and uploaded files are separate from the VPS database. Production SMTP must be configured on your VPS. The preview is marked noindex. Keep the Site owner-private: this adapter treats every authenticated viewer admitted by the private Site access policy as an administrator; do not widen the Site audience without adding explicit CMS authorization.
