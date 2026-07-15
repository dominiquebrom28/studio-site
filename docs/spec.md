# Studio Site — Architecture Spec

Status: draft for review · Author: architect · Save target: `docs/spec.md`
Scope: static portfolio + blog. **No auth, no database, no CMS, no backend, no user data.** All content is markdown committed in-repo.

---

## 1. Summary

The public website of Dom's AI dev studio: a portfolio of projects the AI team has built plus a blog documenting the process, sourced from `reports/`. It is a fully static site — React + Vite + TypeScript + Tailwind — where every project write-up and blog post is a markdown file committed to the repo. There is no server, no database, and no user input beyond a reader's own browser; the entire site compiles to static HTML/CSS/JS and is served from a CDN (Vercel, later, with Dom's approval).

This is the "living case study": the site is built by the studio and documents itself. That means the content pipeline must be trivial for the team's own agents to write into (drop a markdown file in a folder, commit) with zero build config per post.

---

## 2. Routing / pages

Client-side routing with `react-router-dom` — **pin to latest stable at scaffold time** (v7 is current; v6 is fine too, the small API delta here — `RouterProvider`/data routers vs `<BrowserRouter>` — doesn't affect this spec). All routes are statically known at build time; there are no dynamic/authenticated routes.

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Hero + pitch, featured projects, latest posts |
| `/projects` | Projects index | Grid/list of all project cards |
| `/projects/:slug` | Project detail | One project write-up (rendered markdown) |
| `/blog` | Blog index | Reverse-chronological list of posts |
| `/blog/:slug` | Blog post | One rendered post |
| `/about` | About (optional, phase 2) | The studio / how it works |
| `*` | NotFound (404) | Fallback for unknown slugs |

URL rules:
- `:slug` is the filename stem of the markdown file (e.g. `content/projects/soulforge.md` → `/projects/soulforge`). Slugs are lowercase kebab-case, validated at build time (see §3).
- Trailing slashes normalized off. Canonical URLs are the no-trailing-slash form.
- No query-string state, no pagination for v1 (post/project counts are small; revisit only past ~30 posts).

Deploy-time requirement (devops, not this spec's build): because routing is client-side (SPA), Vercel must rewrite all unknown paths to `/index.html` so deep links like `/blog/some-post` resolve. A `vercel.json` rewrite (`{ "source": "/(.*)", "destination": "/index.html" }`) plus the security headers in §5 covers this. Direct 404s are handled by the `*` route rendering the NotFound page.

> Note for future: if SEO/social-preview per post becomes a priority, migrate to a prerendered/SSG approach (see §6 decision on SPA vs SSG). v1 ships SPA.

---

## 3. Content model

Two content types, each a folder of markdown files with typed frontmatter. Content lives **outside `src/`** at the repo root so writers (and agents) never touch application code:

```
content/
  projects/          # the six projects from PROJECT-BRIEF.md, one file each:
    soulforge.md
    pizzaparty.md
    mensapp.md
    lovediary.md
    portfolio.md
    chart-token-playground.md
  posts/
    2026-07-15-i-gave-claude-a-dev-team.md
    ...
```

### 3.1 Frontmatter — projects (`content/projects/*.md`)

```yaml
---
title: "SoulForge"              # required, string
slug: "soulforge"               # optional; defaults to filename stem. kebab-case.
summary: "Gamified productivity RPG."  # required, ≤160 chars, used on cards + meta description
stack: ["Vite", "React", "TypeScript", "Phaser", "Zustand", "Supabase"]  # required, string[]
status: "in-progress"           # required, enum: "shipped" | "in-progress" | "archived"
repo: "https://github.com/..."  # optional, string (URL)
liveUrl: "https://..."          # optional, string (URL)
cover: "/images/projects/soulforge.png"  # optional, path under /public
featured: true                  # optional, boolean, default false — surfaces on home
order: 1                        # optional, number — manual sort on index; lower = earlier
date: "2026-06-15"              # required, ISO date (project start or ship date), for sorting
---

Markdown body: honest write-up — what it is, what worked, what didn't.
```

### 3.2 Frontmatter — blog posts (`content/posts/*.md`)

```yaml
---
title: "I gave Claude a dev team"   # required, string
slug: "i-gave-claude-a-dev-team"    # optional; defaults to filename stem
date: "2026-07-15"                  # required, ISO date — primary sort key (desc)
summary: "How the studio was set up." # required, ≤200 chars, card + meta description
tags: ["process", "agents"]         # optional, string[]
author: "Dom"                       # optional, string, default "Dom"
cover: "/images/posts/dev-team.png" # optional, path under /public
draft: false                        # optional, boolean, default false — excludes from prod build
---

Markdown body.
```

Filename convention for posts: `YYYY-MM-DD-slug.md`. The date prefix is for human sorting in the file tree only; the authoritative date is the `date` frontmatter field.

### 3.3 Build-time loading + typing mechanism

Content is bundled at build time via Vite's `import.meta.glob` — **no runtime fetching, no CMS API.** Because `content/` sits outside `src/`, add an alias in `vite.config.ts` (`resolve.alias`) and, if needed, extend the Vite `fs.allow` list so the dev server can read it.

A single loader module (`src/content/loader.ts`) does the work:

```ts
// eager glob: raw markdown strings, resolved at build time
const projectFiles = import.meta.glob('/content/projects/*.md', {
  eager: true, query: '?raw', import: 'default'
}) as Record<string, string>;
```

For each file:
1. Split frontmatter from body with **`gray-matter`** (parses the YAML block). ⚠️ Implementation caveat: `gray-matter` carries Node/`Buffer` assumptions that can throw `Buffer is not defined` in a pure-browser Vite bundle. If that bites, swap to a browser-safe equivalent — `front-matter`, or a tiny `---` block splitter feeding `js-yaml`. Verify the chosen parser runs in the browser bundle during the scaffold.
2. Validate + coerce the frontmatter against a **Zod** schema (`ProjectFrontmatter`, `PostFrontmatter`). Validation runs at module-eval time. A malformed or missing required field **throws** — surfacing immediately in `npm run dev` and, in a built app, at runtime in the browser (route-level error boundaries in §4/P3 catch it and render a safe error, not a stack trace). Note `vite build` does **not** execute app modules, so it will not fail on bad frontmatter by itself. Build-time enforcement therefore comes from **CI running the loader's unit tests (or a small `validate-content` script) — this is the real "ambiguity is a defect" gate**; wire it into the pipeline so bad content can never merge, let alone ship.
3. Derive `slug` (frontmatter override or filename stem), assert kebab-case and uniqueness across the collection (duplicate slug = build error).
4. Return a typed, frozen array sorted by the type's rule (projects: `order` then `date` desc; posts: `date` desc).

The markdown **body** is not parsed at load time — it's carried as a raw string and rendered by the detail components (§4) so parsing cost is per-page, not upfront.

Exported types are the Zod-inferred types (`z.infer<typeof ProjectFrontmatter>`), giving one source of truth for the shape — no hand-maintained interfaces that drift from the schema.

`draft: true` posts and any project with `status` you choose to hide are filtered out **when `import.meta.env.PROD` is true**, so drafts render in `npm run dev` but never in the production bundle.

Public helper API from `src/content/index.ts`:
- `getAllProjects(): Project[]`
- `getProjectBySlug(slug): Project | undefined`
- `getAllPosts(): Post[]`
- `getPostBySlug(slug): Post | undefined`
- `getFeaturedProjects(limit): Project[]`
- `getLatestPosts(limit): Post[]`

---

## 4. Component / module breakdown

Work packages. **[Indep]** = can be built in parallel against agreed interfaces; **[Dep: X]** = needs X first.

### Foundation (build first — everything depends on it)
- **P0 · Content loader + schemas** (`src/content/`) — §3. Zod schemas, `gray-matter` parse, glob, helper API, unit tests for validation/sorting/slug rules. **[Dep: none]** This is the critical path; unblocks all pages.
- **P0 · App shell + routing** (`src/App.tsx`, `src/router.tsx`) — route table (§2), `react-router` setup, lazy-loaded route components, scroll-to-top on nav. **[Dep: none, parallel with loader]**

### Layout shell (shared)
- **P1 · Layout** (`src/components/layout/`) — `RootLayout` (header + footer + `<Outlet/>`), `Header` (logo, nav links, active state), `Footer` (links, "built by an AI team" note). Tailwind, responsive from 320px, keyboard-navigable, skip-to-content link. **[Dep: routing skeleton; parallel with loader]**

### Shared components **[Indep once interfaces agreed]**
- **P1 · `Markdown`** renderer — the one component that turns a body string into React. `react-markdown` + `remark-gfm` + `rehype` plugins, syntax highlighting (§6). No `dangerouslySetInnerHTML` in app code; raw HTML in markdown disabled. **[Dep: none — pure, testable in isolation]**
- **P1 · `ProjectCard`** — cover, title, summary, stack chips, status badge. Consumes the `Project` type. **[Indep]**
- **P1 · `PostCard`** — title, date, summary, tags. Consumes `Post`. **[Indep]**
- **P1 · `Seo`** — sets `document.title` + meta description/OG tags per page (via `react-helmet-async` or a tiny effect hook). **[Indep]**
- **P1 · Primitives** — `Container`, `Prose` wrapper (Tailwind Typography), `Badge`/`Chip`, `Tag`. **[Indep]**

### Page components **[each Indep once loader + cards + Markdown exist]**
- **P2 · Home** (`/`) — hero + pitch (from PROJECT-BRIEF), `getFeaturedProjects`, `getLatestPosts`. **[Dep: loader, cards]**
- **P2 · ProjectsIndex** (`/projects`) — grid of `ProjectCard`, empty state. **[Dep: loader, ProjectCard]**
- **P2 · ProjectDetail** (`/projects/:slug`) — `getProjectBySlug`, header (title/stack/status/links), `Markdown` body, **NotFound on unknown slug**. **[Dep: loader, Markdown]**
- **P2 · BlogIndex** (`/blog`) — list of `PostCard` desc by date, empty state. **[Dep: loader, PostCard]**
- **P2 · BlogPost** (`/blog/:slug`) — `getPostBySlug`, title/date/tags, `Markdown` body, NotFound on unknown slug. **[Dep: loader, Markdown]**
- **P2 · NotFound** (`*`) — 404 page. **[Indep]**

### Cross-cutting
- **P1 · Tailwind config + design tokens** — colors, type scale, spacing per the design brief (next backlog item). Consumed by everything. **[Dep: design-brief.md]** — this is the one real external dependency; until the design brief lands, build against neutral placeholder tokens and reskin.
- **P3 · States pass** — loading is largely N/A (content is bundled, no async fetch), but every page needs a designed **empty state** (no projects / no posts yet) and the **NotFound** path. Error boundaries wrap route components to catch a malformed render.

Parallelization summary: once **P0 loader** and **P0 routing** land, the Markdown renderer, all cards, primitives, and every page can be split across developers with almost no further coupling. The only shared blocker is the Tailwind token set from the design brief.

---

## 5. Security & trust model

**Trust model in one line:** there is no server, no database, no session, and no user-supplied input that the app processes or stores. The only "untrusted" bytes in the system are (a) the markdown content — which is authored by the team and reviewed in PRs before merge, so it is *trusted-but-treated-as-data*, and (b) third-party npm packages. That reduces the real attack surface to four categories: **XSS from markdown rendering, secrets/env hygiene, source maps + security headers, and dependency supply chain.** Everything else on the 50-item checklist is genuinely N/A, stated below so it's *consciously ruled out*, not skipped.

### Applies — must be cleared

- **#19 XSS (the one real app-layer risk).** Markdown is rendered with `react-markdown`, which builds a React vtree and escapes text by default. Controls: (1) **do not enable `rehype-raw`** / do not allow raw HTML embedding in markdown; (2) **no `dangerouslySetInnerHTML`** anywhere in app code (add an ESLint rule to enforce); (3) constrain the rehype plugin chain; (4) sanitize link `href`s — allow only `http(s)`, `mailto`, and site-relative, reject `javascript:` URIs. Even though content is first-party, treat it as data so a copy-pasted snippet from a report can never inject script. **[FE]**
- **#2 / #3 / #14 / #17-secrets Secrets & env.** `.env*` is already gitignored (verified). This site needs **no secrets at all** — no keys reach the bundle because there is no API. Rule: if an analytics or form tool is ever added, only a public/anon token may reach client code, and it goes through `import.meta.env.VITE_*`. Nothing privileged, ever. **[FE][Ops]**
- **#36 Source maps in production.** Set `build.sourcemap: false` in `vite.config.ts` for prod so `.map` files aren't served. (No secrets exist to leak, but it's free hardening and part of the DoD.) **[FE][Ops]**
- **#46 Security headers + CSP.** Set via `vercel.json` headers at deploy: `Content-Security-Policy` (default-src 'self'; script-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' — Tailwind ships static CSS so inline-style can be tightened; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, plus HSTS (Vercel serves HTTPS). CSP is the second layer of XSS defense behind the render sanitization. Spec'd here; **owned by devops at deploy.** **[Ops][FE]**
- **#37 / #38 / #50 Dependency hygiene.** `npm audit` clean of high/critical before any deploy; pin versions; keep the tree small (react, react-router, react-markdown + remark/rehype plugins, gray-matter, zod — that's essentially it). Every AI-generated block read before merge (#50). **[Ops][Sec]**
- **#10 / #12 No debug/verbose errors in prod.** No debug routes; the `*` NotFound and route-level error boundaries return friendly messages, never stack traces. **[FE]**

### N/A — consciously ruled out (with reason)

| Item | Why N/A |
|---|---|
| **A01 Broken access control** (#5-9, 33, 34, 41, 45, 49) | No protected resources, no rows, no roles, no multi-tenant data. Every page is public by design. |
| **C Authentication & session** (#4, 24, 25, 26, 47) | No login, no accounts, no cookies, no sessions. |
| **#16-18 Injection (SQL/NoSQL) / #22 path traversal** | No database and no server-side filesystem access from user input; markdown paths are compile-time constants from `import.meta.glob`, never built from request data. |
| **#20 CSRF** | No state-changing requests; the site is read-only. |
| **#21 File uploads** | None. |
| **#23 SSRF / #27 CORS / #31 webhooks** | No server, no outbound requests on behalf of users, no cross-origin API, no webhooks. |
| **#32 Payments / entitlements** | None. |
| **H · AI-specific (#39, #40) / #28 rate limiting** | No LLM feature and no server endpoints at runtime — the AI is in the *authoring* pipeline (offline, human-reviewed via PR), not in the shipped product. No brute-force or cost-blowup surface. |
| **I · Observability (#35, 42, 43, 44)** | No PII, no auth events, no data to back up (content is in git = versioned + recoverable). Vercel provides platform-level uptime; a lightweight uptime check is a nice-to-have, not a launch gate. Basic privacy-respecting analytics (if added later) must be cookieless. |

**Authoring-pipeline note (defense in depth for the "living case study"):** because blog posts are distilled by AI agents from `reports/`, treat report content as untrusted *input to the writing process* — never let a report's text act as an instruction to the site build, and keep the human PR review (Dom merges to main) as the trust boundary. This is process, not code, but it's the real prompt-injection consideration for this project.

---

## 6. Key decisions & tradeoffs

**Content: `import.meta.glob` + gray-matter + Zod (vs a CMS / vs MDX).**
Chosen because content is small, first-party, and version-controlled — git *is* the CMS, PRs are the editorial workflow, and bundling at build time means zero runtime fetch and no API to secure. Rejected a headless CMS (Contentful/Sanity): adds an external dependency, an API key, network calls, and a moving part for a site whose whole premise is "content is the repo." Rejected **MDX** (executable JSX in markdown): more power than needed and it widens the XSS/trust surface (arbitrary components/expressions in content) for no current benefit — plain markdown + a fixed renderer is safer and simpler. Downside of the chosen approach: content changes require a rebuild/redeploy (fine — every merge already triggers one) and very large content sets would bloat the bundle (not a concern at this scale; revisit past ~50 items with route-level code-splitting of content).

**Routing: `react-router-dom` SPA (vs Astro/Next SSG, vs no router).**
Chosen for stack consistency (the studio default is React + Vite, not a meta-framework) and because the team already knows it. Rejected **Astro / Next SSG** despite better SEO and per-page prerendered HTML: it changes the stack, and for a new indie site with a handful of pages the SEO delta doesn't justify a framework switch *yet*. This is the most reversible decision — the content loader and components are framework-agnostic enough to migrate later. **Honest downside:** an SPA ships an empty HTML shell, so per-page social-share previews and first-paint SEO are weaker than SSG. Mitigations: client-side `<title>`/meta via the `Seo` component, a real `sitemap.xml` and `robots.txt`, semantic HTML. If organic discovery becomes a goal, the §2 note flags SSG migration as the planned path.

**Styling: Tailwind + `@tailwindcss/typography` (vs CSS Modules / vs a component library).**
Tailwind is the studio default and `prose` classes from the typography plugin render markdown bodies beautifully with near-zero custom CSS — a big win for the blog. Rejected CSS Modules (more hand-written CSS, slower for this content-heavy layout) and a component library like MUI/Chakra (heavy, opinionated, fights the "distinctive, non-generic" design goal in the brief). Downside: Tailwind's utility soup can hurt readability — mitigated by extracting the shared primitives in §4 (`Container`, `Prose`, `Badge`) rather than repeating utility strings.

**Syntax highlighting: `rehype-pretty-code` / Shiki at build time (vs Prism runtime, vs none).**
Blog posts about coding need readable code blocks. Shiki (via `rehype-pretty-code`) highlights at build time using VS Code grammars — accurate, zero client-side highlighting JS, no runtime cost, and it can't execute anything. Rejected **Prism.js / highlight.js** at runtime: ships a highlighter + theme to the client and runs on every render for no benefit here. Rejected **no highlighting**: unacceptable for a dev blog. Downside: Shiki adds build-time cost and a larger dev dependency; acceptable since it never reaches the client bundle. (If build time becomes painful, `highlight.js` via `rehype-highlight` is the lighter fallback.)

---

## 7. Risks

- **Design brief is the one hard dependency.** The Tailwind token set and per-page layouts come from the next backlog item (`docs/design-brief.md`). Building pages against placeholder tokens and reskinning is cheap, but if the design direction is radical (unusual layouts, heavy motion) some component structure may need rework. *Mitigation: agree the token contract early; keep components layout-light.*
- **Content-schema churn.** If frontmatter fields change after content is written, every existing file needs migrating. *Mitigation: the Zod schema is the single source of truth and fails the build loudly, so drift is caught immediately, not shipped.*
- **SPA SEO/social previews** (see §6) — the honest weak point. Low risk for a v1 indie site, becomes real if launch depends on organic reach. *Mitigation flagged: SSG migration path is pre-identified.*
- **Markdown XSS via a future "allow raw HTML" temptation.** Someone may want an embed or iframe in a post and reach for `rehype-raw`. *Mitigation: documented prohibition + ESLint rule; embeds go through a vetted allowlisted component, never raw HTML.*
- **Scope creep toward "just a little backend"** — a contact form, comments, newsletter signup. Each breaks the "no backend, no user data" premise and drags in the entire B/C/D checklist. *Mitigation: any such feature is a separate, explicitly-approved decision; prefer third-party embeds (e.g. a mailto link or hosted form) over standing up a backend.*
- **Bundle bloat from eager content globbing** if the blog grows large. *Low near-term; mitigation is route-level content splitting, noted in §6.*

---

## 8. Out of scope

- Any backend, database, API routes, or serverless functions.
- Authentication, accounts, user profiles, comments, or any stored user data.
- A CMS or admin UI — authoring is markdown files + git PRs.
- Contact forms, newsletter signup, and analytics **for v1** (each is a later, separately-approved decision; if added, cookieless/no-backend options are preferred).
- Search, tag-filtering pages, and pagination — deferred until content volume justifies them.
- i18n / multi-language.
- SSR/SSG and per-page prerendering — SPA for v1; migration path noted, not built.
- **Deployment and the `vercel.json` file itself** — this spec *specifies* the required rewrites and headers (§2, §5) but devops owns creating and deploying them, only after Dom's explicit go-ahead.
- Visual design specifics (palette, type scale, layouts, states) — owned by `docs/design-brief.md`, the next backlog item.
- Writing the actual portfolio/blog content — separate backlog items; this spec defines only the model they must conform to.
