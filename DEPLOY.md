# Deploying to MilesWeb (or any static host)

The site is fully static: build, upload `dist/`, done. Nothing runs on the host.
The invitation form is the one moving part, and it lives on Cloudflare, not on the host.

## 1. Build and check

```bash
npm ci
npm run build
npm run check
```

`npm run check` confirms that `dist/` has every page, `.htaccess`, `CNAME`, `robots.txt` and
`sitemap.xml`, that every local link resolves, that the 3D chunk is inside its 250 KB
budget, and that nothing on the "not published" list got in (see below). Expect about
1.7 MB in 41 files.

## 2. Upload

cPanel → File Manager → `public_html`:

1. Zip the *contents* of `dist/` (not the folder itself) and upload the zip.
2. Extract it in `public_html`, then delete the zip.
3. Settings (top right) → tick **Show Hidden Files**, and confirm `.htaccess` is there.
   It sets the 404 page, HTTPS, www → bare domain, compression and caching.

FTP works too; make sure your client uploads hidden files.

## 3. Point the domain at MilesWeb, keeping Cloudflare in front

**This is what keeps the invitation form working.** The form posts to
`https://datumatelier.uk/api/invite`. A Cloudflare Worker (`_worker/` in the
`aigroupchathq/datum-intro` repo) answers that one path, because Cloudflare attaches it by
route to the domain, whoever hosts the files. So:

- Cloudflare → `datumatelier.uk` → DNS: change the `A` record(s) for `datumatelier.uk`
  from GitHub Pages' addresses to the MilesWeb server IP (cPanel shows it as "Shared IP
  Address"). Point `www` at `datumatelier.uk`. **Keep the orange cloud ("Proxied") on.**
  A grey cloud bypasses Cloudflare, and `/api/invite` would then hit MilesWeb and 404.
- Cloudflare → SSL/TLS: use **Full (strict)**. Give MilesWeb a certificate, either a free
  Cloudflare Origin Certificate (Cloudflare → SSL/TLS → Origin Server → Create,
  then cPanel → SSL/TLS → Install) or cPanel AutoSSL.
- No Worker changes are needed: it only accepts requests from `https://datumatelier.uk`
  and `https://www.datumatelier.uk`, which is still where the pages are served.

On a MilesWeb temporary URL or any other hostname the pages work, but a live form post
is refused by the Worker (`origin`). That is expected. Test the form on the real domain.

## 4. After the switch, check

```bash
curl -sI https://datumatelier.uk/ | head -5
```

Expect `HTTP/2 200` from Cloudflare (`server: cloudflare`).

```bash
curl -s https://datumatelier.uk/api/invite
```

Once the Worker is deployed, expect `{"ok":false,"error":"method"}`: the Worker
answering. An HTML page instead means the request reached MilesWeb (grey cloud, or no
Worker route).

```bash
curl -sI https://www.datumatelier.uk/record.html | grep -i location
```

Expect `https://datumatelier.uk/record.html`.

Then in a browser:

- `https://datumatelier.uk/nope` shows the site's 404 page.
- `https://datumatelier.uk/#instrument` lands on Hold REV.
- The invitation form shows "This is only a preview…" until the Turnstile site key is set.

## The invitation form today

As of this build, the form is in **preview mode** and sends nothing: `invite.html` has
`data-sitekey=""`, and the Worker's `wrangler.toml` still has `PASTE_DATABASE_ID_HERE`.
Going live is the checklist in `_worker/README.md` of the original repo (Turnstile widget,
D1 database, secret, deploy), and then the site key goes into `public/invite.html` here:

```html
<form class="invite-form" id="invite-form" novalidate data-endpoint="/api/invite" data-sitekey="YOUR-SITE-KEY">
```

The Turnstile widget's hostnames stay `datumatelier.uk` and `www.datumatelier.uk`.

## Files kept off the public site

`vite.config.js` lists files that are in `public/` but are not published (prototypes,
photos and fonts no page uses). It mirrors the `exclude:` list in the original repo's
`_config.yml`. If one list changes, change the other.

## GitHub Pages afterwards

Once DNS points at MilesWeb, GitHub Pages no longer serves the domain. Leave it on as a
fallback or turn it off (repo → Settings → Pages). The `CNAME` file is harmless on MilesWeb.
