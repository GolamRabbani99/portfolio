# golam-portfolio — engineering notes

Portfolio site for Golam Rabbani, AI Automation Engineer. Built the way I
build automation: minimal attack surface, graceful failure, measurable
performance.

**Stack:** Vite 8 · TypeScript (strict) · three.js · GSAP · GitHub Actions → GitHub Pages

## Architecture decision: static-first

A portfolio has no users, no state, no secrets — so it gets no server.
The site compiles to static assets served from a CDN:

- **Security:** no backend = no injection surface, no session handling,
  no patching treadmill. The threat model collapses to supply chain +
  content delivery, both addressed below.
- **Scale:** CDN-served static files scale horizontally by default.
- **Speed:** nothing computes at request time.

Choosing *not* to add a framework backend here is the engineering
decision; everything else follows from it.

## Performance budget

| Asset | Size (gzip) | Loading strategy |
|---|---|---|
| HTML | ~5 KB | immediate — full content readable without JS |
| CSS | ~3 KB | immediate |
| App JS (GSAP + modules) | ~47 KB | deferred module |
| three.js scene | ~116 KB | **code-split chunk, loaded via `requestIdleCallback` after first paint** |

Critical path ≈ 55 KB gz. The 3D hero is progressive enhancement: if the
chunk fails (offline, blocked), a CSS gradient takes its place and every
word of content still renders. Animations respect
`prefers-reduced-motion` end-to-end (static rendered frame, no typing,
counters show final values).

## Security model

**Supply chain.** No runtime CDNs — three.js and GSAP are npm
dependencies, version-pinned via `package-lock.json` and bundled at build
time. CI runs `npm audit --omit=dev --audit-level=high` and **fails the
build on known high-severity CVEs**.

**Content-Security-Policy** (shipped via `public/_headers` for Netlify
and `vercel.json` for Vercel; on GitHub Pages, which can't set response
headers, the same policy can be applied as a `<meta http-equiv>` tag):

```
default-src 'self'; script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com; img-src 'self' data:;
object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

`script-src 'self'` with zero inline scripts is the meaningful line: even
a successful HTML injection cannot execute attacker JS.
*Known trade-off:* `'unsafe-inline'` for styles accommodates
animation-set style attributes; style injection is a far lower-impact
vector than script injection, accepted and documented.

**Hardening headers:** `nosniff`, `frame-ancestors 'none'` +
`X-Frame-Options: DENY` (no clickjacking), `Referrer-Policy:
strict-origin-when-cross-origin`, `Permissions-Policy` denying
camera/mic/geolocation/payment.

**Data:** the site collects nothing. Contact is `mailto:` — no form, no
form-handler endpoint, no third-party form service holding submissions.
No analytics by default. GDPR exposure: nil.

## Project layout

```
index.html                 content (fully readable without JS)
src/
  config.ts                single source of truth (set GITHUB_USER here)
  styles.css               design tokens + components
  main.ts                  orchestration + lazy-loading strategy
  modules/
    typewriter.ts          hero terminal stream
    animations.ts          GSAP reveals, counters, scramble, card tilt
    hero-scene.ts          three.js graph (separate chunk)
.github/workflows/deploy.yml   CI: audit gate → build → Pages deploy
public/_headers, vercel.json   security headers per host
```

## Run it

```bash
npm ci          # exact locked dependency tree
npm run build   # type-check (strict) + production build
npm run preview # serve dist locally
```

## Deploy

Push to `main` — the GitHub Actions workflow type-checks, audits,
builds, and deploys to GitHub Pages. One config edit required first:
set `GITHUB_USER` in `src/config.ts`.
