# Invitation form: Cloudflare set-up

This folder is the small Cloudflare Worker behind the invitation form on
datumatelier.uk. GitHub Pages ignores folders that start with `_`, so nothing
here is published on the site.

How it fits together:

- The form on the site posts to `https://datumatelier.uk/api/invite`.
- Cloudflare sends only that one path to this Worker. Everything else is still
  served by GitHub Pages.
- The Worker checks the Cloudflare Turnstile spam check, validates the answers
  and saves them in a Cloudflare D1 database called `datum-invites`.
- Once a day it deletes requests that have not been updated for 24 months.

Until step 7 below, the form on the site stays in preview mode and sends
nothing.

## What you need

- Your Cloudflare login, with `datumatelier.uk` already on Cloudflare.
- Node.js 22 on your PC. Commands below are for Windows PowerShell.

## Steps

### 1. Check the site goes through Cloudflare

Cloudflare dashboard → `datumatelier.uk` → DNS → Records. The records for
`datumatelier.uk` (and `www`, if present) must show an **orange cloud**
("Proxied"). If one is grey, the Worker cannot see `/api/invite`.

### 2. Create the Turnstile widget

Cloudflare dashboard → Turnstile → Add widget.

- Name: `Datum invitation`
- Hostnames: `datumatelier.uk` and `www.datumatelier.uk`
- Widget mode: **Managed**

Copy the **site key** (public, goes in the web page) and the **secret key**
(private, goes only into the Worker in step 5). Never paste the secret key
into chat, a file or a commit.

### 3. Sign in from your PC

```powershell
cd C:\Users\vD\dev\datum-intro\_worker
npx.cmd wrangler@4 login
```

A browser window opens. Approve it.

### 4. Create the database

```powershell
npx.cmd wrangler@4 d1 create datum-invites
```

It prints a `database_id`. Open `wrangler.toml` and replace
`PASTE_DATABASE_ID_HERE` with it. The id is not secret; commit it.

Then create the table:

```powershell
npx.cmd wrangler@4 d1 migrations apply datum-invites --remote
```

### 5. Store the Turnstile secret in the Worker

```powershell
npx.cmd wrangler@4 secret put TURNSTILE_SECRET
```

Paste the **secret key** from step 2 when asked. It is stored encrypted in
Cloudflare and never appears in the code.

### 6. Deploy the Worker

```powershell
npx.cmd wrangler@4 deploy
```

### 7. Switch the form on

Send Claude the Turnstile **site key** (it is public) and the date, or do it
yourself:

1. In `index.html` and `compact.html`, set `data-sitekey=""` on the
   `invite-form` to the site key.
2. In `privacy.html`, replace the "Form status: preview" paragraph with
   "Form status: live since [date]."
3. Make sure the operator name, address and contact email placeholders in
   `privacy.html` are filled in.
4. Commit, and merge to `main`.

### 8. Test it on the live site

Open https://datumatelier.uk/#invite, send a request with your own email, then
check it arrived:

```powershell
npx.cmd wrangler@4 d1 execute datum-invites --remote --command "SELECT email, role, marketing_consent, created_at FROM invites ORDER BY id DESC LIMIT 5"
```

## Day-to-day

See everyone who asked:

```powershell
npx.cmd wrangler@4 d1 execute datum-invites --remote --command "SELECT email, role, note, marketing_consent, created_at FROM invites ORDER BY created_at"
```

Only email news to people with `marketing_consent = 1`.

Someone asks to be deleted (do it within a month of the request):

```powershell
npx.cmd wrangler@4 d1 execute datum-invites --remote --command "DELETE FROM invites WHERE email = 'person@example.com'"
```

Someone asks what you hold about them: run the first query with
`WHERE email = 'person@example.com'` and send them the result.

## Tests

```powershell
npm.cmd test
```

Runs the Worker against a real SQLite copy of the schema. No Cloudflare
account needed.
