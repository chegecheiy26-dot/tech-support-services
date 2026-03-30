# Tech Support Services

This project now uses a local SQLite database instead of Supabase.

## Run locally

1. Start the SQLite API:

```bash
npm run api
```

2. In another terminal, start the frontend:

```bash
npm run dev
```

The API runs on `http://localhost:3001` and creates the SQLite database at `data/app.db`.

## Go Live With GitHub + Cloudflare Pages + D1

This repo can now go live on Cloudflare without relying on a local SQLite file:

- the frontend deploys as a static Vite site on Cloudflare Pages
- the `/api/*` routes run as Cloudflare Pages Functions
- the production database lives in Cloudflare D1

Important notes:

- your local database at `data/app.db` stays on your computer for local development
- the live site uses a separate hosted D1 database
- `/api` stays the same on the frontend, so no production `VITE_API_URL` is needed when Pages Functions and the site are deployed together

### 1. Log in to Cloudflare Wrangler

```bash
npx wrangler login
```

### 2. Create the live D1 database

```bash
npx wrangler d1 create tech-support-services-db
```

Save the database name. You will bind it to the Pages project as `DB`.

### 3. Apply the schema migrations

```bash
npx wrangler d1 migrations apply tech-support-services-db --remote
```

The schema lives in:

- [migrations/0001_initial.sql](./migrations/0001_initial.sql)
- [migrations/0002_password_reset_otps.sql](./migrations/0002_password_reset_otps.sql)

### 4. Create the Cloudflare Pages project from GitHub

In the Cloudflare dashboard:

1. Go to `Workers & Pages`
2. Click `Create application`
3. Choose `Pages`
4. Connect your GitHub repo: `jmadk/tech-support-services`
5. Use:
   - Production branch: `main`
   - Build command: `npm run build`
   - Build output directory: `dist`

### 5. Add the D1 binding and environment variables

In the Pages project settings:

1. Open `Settings` -> `Functions`
2. Add a D1 binding:
   - Variable name: `DB`
   - Database: `tech-support-services-db`
3. Add an environment variable:
   - `OWNER_EMAIL=chegekeith4@gmail.com`
   - `RESEND_API_KEY=your-resend-api-key`
   - `RESEND_FROM_EMAIL=KCJ Tech <noreply@yourdomain.com>`
4. Optional:
   - `RESEND_REPLY_TO=chegekeith4@gmail.com`
   - `PASSWORD_RESET_CODE_TTL_MINUTES=10`
   - `PASSWORD_RESET_MAX_ATTEMPTS=5`
   - `PASSWORD_RESET_COOLDOWN_SECONDS=60`

Then redeploy the Pages project.

### 6. Open the live site

Cloudflare will give you a public `*.pages.dev` URL that works on any device.

### Accessing the live database

You can inspect live consultations in two ways.

Cloudflare dashboard:

1. Open `Storage & Databases`
2. Open your D1 database
3. Use the query console or table browser

Wrangler terminal:

```bash
npx wrangler d1 execute tech-support-services-db --remote --command "SELECT * FROM consultations ORDER BY created_at DESC;"
```

Examples:

```bash
npx wrangler d1 execute tech-support-services-db --remote --command "SELECT * FROM users ORDER BY created_at DESC;"
npx wrangler d1 execute tech-support-services-db --remote --command "SELECT * FROM saved_services ORDER BY saved_at DESC;"
```

### About live email delivery

The Cloudflare deployment now supports OTP-based password reset emails and any future transactional email through Resend.

For the hosted version:

- open `Client Inbox`
- reply in Gmail using `chegekeith4@gmail.com`
- contact the client on WhatsApp
- track status in the dashboard
- users can request a 6-digit OTP from the forgot-password form and reset their password on the live site

Important:

- the live site will only send OTP emails after `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured
- after pulling these changes, run the D1 migrations again so the `password_reset_otps` table exists

## Email setup for local development

To receive consultation alerts and password reset OTP emails locally, create a `.env` file in the project root based on `.env.example`:

```env
OWNER_EMAIL=chegekeith4@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=chegekeith4@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=chegekeith4@gmail.com
RESEND_API_KEY=
RESEND_FROM_EMAIL=KCJ Tech <noreply@yourdomain.com>
RESEND_REPLY_TO=chegekeith4@gmail.com
PASSWORD_RESET_CODE_TTL_MINUTES=10
PASSWORD_RESET_MAX_ATTEMPTS=5
PASSWORD_RESET_COOLDOWN_SECONDS=60
```

Local email sending can work in either of these ways:

1. SMTP:
   - use Gmail SMTP with an App Password
2. Resend:
   - add `RESEND_API_KEY`
   - add a valid `RESEND_FROM_EMAIL`

For Gmail SMTP, use an App Password instead of your normal account password:

1. Turn on 2-Step Verification for `chegekeith4@gmail.com`.
2. Create a Gmail App Password.
3. Put that value into `SMTP_PASS`.
4. Restart `npm run api`.

When this is configured:

- Every consultation is stored in SQLite.
- The owner account (`chegekeith4@gmail.com`) can open the dashboard inbox and see all consultations.
- New consultations also send an email notification to the owner inbox.
- Users can request a 6-digit password reset OTP and set a new password.

## Notes

- Auth, profiles, consultations, and saved services are now stored in SQLite.
- The frontend talks to the backend through `/api` requests.
- If you want a different API URL, set `VITE_API_URL`.
- The backend uses Node's built-in `node:sqlite`, so use a recent Node 22+ release.
- The Cloudflare production deployment uses D1 instead of the local `app.db` file.
