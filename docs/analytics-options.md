# Analytics options — a costed recommendation

**Status:** draft for Dom's decision · **Author:** architect (Theo) · **Backlog item:** MEDIUM — "Nothing measures whether anyone reads this site"
**Serves:** PROJECT-BRIEF goal 2. **Constrained by:** the CSP shipped in PR #42 (`vercel.json`) and its two hash guards. **Referenced by:** `docs/reports-surface.md` §8 Q1 ("ship it and see if people click" is not measurable here).
**This document recommends. It installs nothing.** No dependency was added, no client code written, no `vercel.json` edited.

---

## 0. The recommendation in one paragraph

**Add Vercel Web Analytics (`@vercel/analytics`), mounted once in `RootLayout`, on the existing plan — and verify it against a real preview deploy before merging.** It is the only option on this list that requires **no change whatsoever to the CSP**: its script and its beacon are both served from the site's own origin, so `script-src 'self'` and `connect-src 'self'` already permit them, and both hash-guard tests stay byte-identical. It is cookieless, so no consent banner and no visible product regression. It is free within the Hobby allowance and *pauses* rather than bills. Its honest cost is that it is a platform side-feature, not a measurement tool: it will be undercounted by ad-blockers on a developer audience, its custom-event support may be Pro-gated (**not verified**), and it cannot answer the read-depth question at all. The runner-up — Plausible proxied through Vercel rewrites — is a better *instrument* and answers more of the real questions, at €/$9-ish a month, two carefully-ordered rewrite entries, and a values decision about deliberately defeating readers' ad-blockers (§7.2). **"Install nothing" remains a legitimate answer** and is Open Decision D1.

---

## 1. What question is actually being asked

The item exists because content prioritisation is blind. So the test for any option is not "does it install cleanly", it is "does it answer these". Five concrete questions, in the order they matter for this site:

| # | Question | Why it matters here |
|---|---|---|
| **Q1** | **Does anyone arrive at all, and from where?** | The baseline. If the honest answer is "≈nobody yet", every question below is moot and the content-prioritisation problem dissolves into "keep writing, keep sharing". This is the single highest-value number and the cheapest to get. |
| **Q2** | **Which posts get opened?** | 22 posts in `content/posts/`. Nothing distinguishes them today. Must count **client-side navigations** from `/blog`, not just deep-link entries — see §5.1. |
| **Q3** | **Do people reach the end of a long one?** | Real and measurable-in-principle: `2026-07-20-red-is-not-self-justifying.md` is 149 non-blank lines; the current v2-format posts run 19–27. If long ones lose people, `docs/blog-format-v2.md`'s shortening was right and should go further. If not, the long-form ones are the differentiator. Requires **scroll-depth or engagement-time** — the hardest signal to get, and most options simply do not have it. |
| **Q4** | **Does the site work as a portfolio — does anyone go post → project?** | PROJECT-BRIEF goal 1. Requires **custom events / outbound-link tracking**, not pageviews. |
| **Q5** | **Does anything convert to a follow?** | `/feed.xml` fetches, GitHub outbound clicks. Tells you whether the logbook has any returning readership at all. |

An option that answers Q1–Q2 and nothing else is still a large improvement on zero. An option that answers **none** of them is not a win no matter how cleanly it installs — that is the trap the zero-JS route walks into (§5).

---

## 2. The CSP constraint, exactly as it ships today

### 2.1 The directive, verbatim

From `vercel.json`, `headers[0].headers[0].value`, applied to `source: "/(.*)"` — i.e. every response:

```
default-src 'self'; script-src 'self' 'sha256-V5noC2NYj38rEmpCvxUksC/Fk4qe0RcsQo1uBePZmkc='; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

Four directives in that string are load-bearing for analytics, and it is worth being precise about which one blocks what:

- **`script-src 'self' 'sha256-V5noC2…'`** — same-origin scripts, plus exactly one inline script whose bytes hash to that value (the pre-paint theme bootstrap in `index.html`, lines 42–60). No `'unsafe-inline'`, no `'unsafe-eval'`, no third-party origin. A `<script src="https://plausible.io/…">` is **refused**.
- **`connect-src 'self'`** — `fetch`/`XHR`/`sendBeacon` to the site's own origin only. Even if a third-party script somehow loaded, its beacon would be **refused**. This is the directive people forget.
- **`img-src 'self'`** — no `data:`, no `https:`. **This kills the classic "zero-JS tracking pixel" pattern outright.** A `<img src="https://…/pixel.gif">` beacon is blocked by the *image* directive, not the script one. Worth stating because "just use a pixel, no JS" is the obvious-sounding zero-JS idea and it does not work here without widening `img-src`.
- **`default-src 'self'`** — the fallback for every unset directive (`frame-src`, `worker-src`, `prefetch-src`, …). There is no escape hatch hiding in an unset directive.

There is **no `report-uri` / `report-to`**. Consequence: **in production, a CSP violation is silent.** If an analytics script were blocked, nothing would tell Dom — the dashboard would simply read zero, indistinguishable from "nobody visited", which on *this* item is the worst possible failure mode. This is why §7.3 makes a preview-deploy console check a hard prerequisite rather than a nicety.

### 2.2 The two hash guards, and precisely what they assert

The hash is pinned by two separate test suites, both of which will go red on a careless analytics change:

| Guard | File | Runs | Asserts |
|---|---|---|---|
| **Source-side** | `src/lib/csp/inlineScriptHash.test.ts` | `npm test` (CI `build` job, step "Test") | `index.html` has **exactly one** inline script; `vercel.json`'s CSP carries **exactly one** `sha256` token; they match. |
| **Dist-side** | `src/lib/csp/distIndexHash.test.ts` | `npm run verify:dist-csp-hash`, own vitest config, CI step immediately **after** `Build` | `dist/index.html` — what the browser actually receives — has **exactly one** inline script and it matches the shipped hash. |

The exact assertions that matter, because they are the tripwires:

```ts
expect(inlineScripts).toHaveLength(1);          // both suites
expect(extractCspHashes(csp)).toHaveLength(1);  // source-side suite
const [shippedHash] = extractCspHashes(csp);    // both suites — takes only the FIRST hash
```

**So: adding any second inline `<script>` to `index.html` is not a one-line change.** It requires (a) computing a second hash, (b) adding it to `script-src`, (c) relaxing three `toHaveLength(1)` assertions, and (d) replacing the `[shippedHash]` destructure in **both** suites with a set-comparison so the two hashes cannot be silently paired to the wrong scripts. That is roughly a half-day of careful work on the site's most safety-critical test, to buy an inline snippet. Any option that needs an inline stub pays this. Any option that only adds an *external same-origin* `<script src>` pays **nothing** — external scripts with a `src` are explicitly excluded by `extractInlineScripts`' `if (!/\bsrc\s*=/.test(attrs))` check, and are governed by `script-src 'self'`.

### 2.3 What each option costs the CSP

| Option | CSP change required | Security cost, honestly |
|---|---|---|
| **Vercel Web Analytics** (`@vercel/analytics`) | **None.** The script is served first-party at `/_vercel/insights/script.js` and the beacon posts to `/_vercel/insights/event`, both on the site's own origin ([vercel/analytics](https://github.com/vercel/analytics); the same-origin path is confirmed incidentally by the ad-blocker reports at [Vercel Community](https://community.vercel.com/t/issue-vercel-insights-script-js-still-being-served-after-disabling/4213)). `script-src 'self'` and `connect-src 'self'` already cover both. `<Analytics />` injects a `<script src=…>` element — external, so **no new inline script, no new hash, both guards untouched**. | **Effectively nil at the CSP layer.** The trust shift is real but is not new: Vercel already serves every byte of this site. You are not adding a *new* trusted party, you are asking the existing one to do more. Verify empirically (§7.3) — this is the single claim in this document most worth falsifying before merging. |
| **Plausible / Umami hosted, standard snippet** | `script-src … https://plausible.io` (or `https://cloud.umami.is`) **and** `connect-src … <same origin>`. Two directives widened. | **This is the expensive one.** It grants a third-party origin the right to execute arbitrary JavaScript in the page, permanently, and to phone home. The hash-pinned policy exists precisely to make that impossible. If that origin is ever compromised or its DNS hijacked, CSP no longer stops it — and with no `report-to`, you would not find out from the site. Both vendors are reputable; the point is that the *policy* stops being a control and becomes a list of people you trust. |
| **Plausible via Vercel rewrite proxy** | **None** to the CSP itself. Two `rewrites` entries in `vercel.json` (script path + `/api/event`), per [Plausible's Vercel proxy guide](https://plausible.io/docs/proxy/guides/vercel). Script and beacon become same-origin → `'self'` covers both. | **The CSP is unchanged, but the trust is not — it is hidden.** Proxying means the browser can no longer distinguish first-party code from Plausible's, which is exactly the property CSP is for. That is a defensible trade (it also stops ad-blockers, §7.2), but it must be an explicit choice, not a side-effect of "the docs said to". **Ordering trap:** `vercel.json` currently has one rewrite, `{ "source": "/((?!assets/).*)", "destination": "/index.html" }` — a catch-all matching everything except `/assets/`. Vercel evaluates rewrites in order, so **the proxy entries must be listed before it**, or the catch-all swallows them and the "script" returns `index.html` with a `200` and a `text/html` content-type. The failure is silent-ish and easy to misdiagnose. Also: Plausible's docs advise against path names like `analytics`/`stats`/`plausible`, so the chosen path must be recorded somewhere or it will look like a mystery route in a future review. |
| **Plausible custom-events / `window.plausible` stub** | A **second inline script** → the full §2.2 cost: second hash + four assertion changes across two suites. | Not a security regression *per se* (a hash-pinned second script is still hash-pinned), but it doubles the surface of the repo's most delicate guard, and every future edit to either snippet now has two hashes to keep straight. Only pay this if Q4/Q5 are the real questions. |
| **Any `<img>` pixel beacon** | `img-src 'self' https://…`. | Widens the image directive site-wide to permit exfiltration-by-image-URL from any page. Small in absolute terms, but it is a real relaxation bought for a technique that (§5.1) answers almost nothing on an SPA. Not worth it. |
| **Server-side logs only** | **None.** No client code, no CSP interaction at all. | Zero. This is its one genuine and complete advantage. |

---

## 3. Privacy and GDPR posture (Netherlands)

Two separate legal regimes, routinely conflated, and the distinction is the whole answer here:

1. **ePrivacy / Telecommunicatiewet art. 11.7a — the "cookie law".** Triggered by *storing or reading information on the visitor's device*. This is what makes a consent banner necessary. Cookieless analytics that stores nothing on the device, uses no persistent or cross-site identifier, is first-party, and outputs aggregate statistics falls under the audience-measurement exemption and **needs no consent** ([Autoriteit Persoonsgegevens — Cookies](https://www.autoriteitpersoonsgegevens.nl/en/themes/internet-and-smart-devices/cookies)).
2. **GDPR.** Triggered by *processing personal data* — including an IP address, even a transiently-processed one. This applies to all three client-side options and to server logs, regardless of banners. It is satisfied by a lawful basis (legitimate interest) plus **transparency** (Art. 13), not by a banner.

### 3.1 Which options need a banner

**None of the recommended ones.** Stated plainly:

| Option | Banner? | Basis |
|---|---|---|
| Vercel Web Analytics | **No** | No cookies; visitors identified by a hash derived from the incoming request, reset every 24h, not usable across days or sites ([Vercel — Privacy and Compliance](https://vercel.com/docs/analytics/privacy-policy)). |
| Plausible (hosted or CE) | **No** | Cookieless, no persistent identifier, aggregate-only by design — the product's entire positioning ([plausible.io](https://plausible.io/)). |
| Umami (Cloud or self-hosted) | **No** | Same posture — cookieless, privacy-first ([umami.is](https://umami.is/)). |
| Server-side logs only | **No** | Nothing is stored on or read from the device. |
| *Anything cookie-based (GA4, etc.)* | **Yes** | Not on this list, and this is exactly why. |

Treat "needs a banner" as **disqualifying**, not as a footnote. The site has no auth and no user data (`PROJECT-BRIEF.md`); a consent modal would be the single most intrusive element on a page whose design brief is about craft, and it would be the first thing every reader sees on a site whose pitch is honesty. That cost dwarfs any feature difference between these tools.

### 3.2 "No banner" ≠ "nothing to do" — and this is the on-brand part

All three client options process an IP at collection time. GDPR Art. 13 transparency still applies. The proportionate, cheap, and characteristically-this-site response is **a short privacy note** — a `/privacy` route or a footer paragraph — saying what is collected, that it is cookieless and aggregate, who processes it, and how to opt out (an ad-blocker will do it). Roughly one afternoon, no new infra, and it is materially *more* honest than what most sites with banners actually disclose. Flagged as **Open Decision D8**; I recommend doing it in the same PR as whatever ships.

Two further notes, both genuinely uncertain and marked as such:

- **Processor agreement.** Dom is already a Vercel customer, so Vercel's existing DPA covers Web Analytics on the same relationship — **no new processor** is introduced. Plausible or Umami Cloud each add one, needing their own DPA. Whether Umami Cloud's hosting region is EU is **not verified**; Plausible is widely positioned as EU-hosted but I could not read the page directly, so also treat as **not verified**.
- **I am not a lawyer.** The above is the standard reading of the audience-measurement exemption and the AP's published guidance, not legal advice. Nothing in it is exotic, but Dom should be comfortable with it rather than take my word.

---

## 4. Pricing, 2026, with sources — and what I could not verify

**Method note, because this repo has been burned by fabricated-but-cited numbers:** the research had search but no page-fetch tool. Every figure below is what a search of the cited domain returned; the pricing pages themselves could not be opened and read. Anything not corroborated from the vendor's own domain is marked **not verified** and should not be quoted onward.

| Option | Price | Free allowance | Source | Confidence |
|---|---|---|---|---|
| **Vercel Web Analytics — Hobby** | **$0** | **50,000 events/month.** At the cap, collection **pauses** until the next cycle; Hobby teams cannot buy more and **are not billed**. | [vercel.com/docs/analytics/limits-and-pricing](https://vercel.com/docs/analytics/limits-and-pricing); [changelog: up to 80% pricing reduction](https://vercel.com/changelog/up-to-80-pricing-reduction-for-web-analytics) | Good. **Note:** several third-party 2026 blogs still quote the *old* 2,500 Hobby / 25,000 Pro limits (e.g. [schematichq](https://schematichq.com/blog/vercel-pricing), [makerstack](https://makerstack.co/reviews/vercel-analytics-review/)). Those appear superseded. Confirm in the dashboard before relying on the number. |
| **Vercel Web Analytics — Pro** | included in Pro | **100,000 events/month**, then usage-billed against the Pro monthly credit | same as above | Good |
| **Web Analytics Plus add-on** | **$10/month per team** (Pro+) | — | [vercel.com/docs/analytics/limits-and-pricing](https://vercel.com/docs/analytics/limits-and-pricing) | Good. Buys extended retention + UTM parameters. |
| **Vercel Pro (for the log-drain option only)** | **$20/user/month**; platform fee includes $20 usage credit; viewer seats free | — | [vercel.com/docs/plans/pro-plan](https://vercel.com/docs/plans/pro-plan), [vercel.com/pricing](https://vercel.com/pricing) | Good |
| **Plausible hosted** | **from $9/month** at ~10k pageviews/month (Growth); Business ~$19/month at the same volume; yearly billing saves 2 months; 30-day trial, no card | none (trial only) | [plausible.io/docs/subscription-plans](https://plausible.io/docs/subscription-plans) for the tier structure; the **$9 / $19 figures come from third-party 2026 reviews** ([saaspricehub](https://saaspricehub.io/tools/plausible), [analytics-alternatives](https://analytics-alternatives.com/plausible-analytics-review-2026/), [comparetiers](https://comparetiers.com/tools/plausible-analytics)) — plausible.io's own docs do not publish the amounts in a form that could be read | **Price not verified from the vendor.** One search also surfaced "$6/mo". Treat $9 as indicative, ±$5. Check plausible.io directly. |
| **Plausible Community Edition (self-hosted)** | **software free (AGPLv3)**; infra ≈ **$5–20/month VPS** | n/a | [github.com/plausible/community-edition](https://github.com/plausible/community-edition), [plausible.io/docs/self-hosting-configuration](https://plausible.io/docs/self-hosting-configuration) | Good on architecture: Postgres **and** ClickHouse; CPU needs SSE 4.2/NEON; **≥2 GB RAM, 4 GB recommended**. The $5–20 range is third-party ([livemy.app](https://livemy.app/blog/self-host-plausible)) — indicative only. |
| **Umami Cloud** | **Hobby $0**; Pro **$20/month** (1M events); Business **$200/month** (10M events) | reported as **3 sites, 100k events/month, 6-month retention** | [umami.is/pricing](https://umami.is/pricing), [docs.umami.is FAQ](https://docs.umami.is/docs/cloud/faq); the specific 100k/3-sites/6-month figures come from third-party aggregators ([toolradar](https://toolradar.com/tools/umami/pricing), [freetier.co](https://freetier.co/directory/products/umami)) | Tier names and the free Hobby tier: good. **The exact 100k figure: not verified from umami.is.** |
| **Umami self-hosted** | **software free (MIT)**; infra = a Node host + Postgres/MySQL | n/a | [umami.is](https://umami.is/) | Good. Much lighter than Plausible CE — no ClickHouse. |
| **Cloudflare Web Analytics** | **$0, no event cap** | unlimited (basic) | [developers.cloudflare.com/web-analytics/faq](https://developers.cloudflare.com/web-analytics/faq/), [blog.cloudflare.com](https://blog.cloudflare.com/free-privacy-first-analytics-for-a-better-web/) | Good — but see §5.3: it is **JS-based**, so it is not a zero-JS option and it carries the full third-party `script-src` cost. |
| **Vercel Log Drains (the zero-JS route)** | requires **Pro, $20/user/month** | — | [vercel.com/docs/drains](https://vercel.com/docs/drains) | Good. Explicitly unavailable on Hobby. |
| **Vercel Observability Plus** | usage-based, **no base fee** (the former $10 base fee was removed); Pro+ only | — | [vercel.com/docs/observability/observability-plus](https://vercel.com/docs/observability/observability-plus), [changelog](https://vercel.com/changelog/no-base-fee-for-observability-plus) | Good |

**Not verified, and it matters:**

- **Whether this project is on Hobby or Pro today.** Nothing in the repo says. It changes the free allowance, the log-drain option, and whether Web Analytics custom events are available. → **Open Decision D2.**
- **Whether Vercel Web Analytics custom events (`track()`) are available on Hobby.** Could not be confirmed either way. This is the difference between answering Q1–Q2 and answering Q4–Q5. → **Open Decision D6.**
- **Vercel Web Analytics data-retention window on Hobby.** The existence of a paid add-on granting an "extended reporting window" implies the base window is short, but there is no number.

---

## 5. The zero-client-JS option, taken seriously

This deserves better than a strawman: it is the only option with *zero* CSP cost, *zero* privacy exposure to a third party, *zero* bundle bytes, and *zero* ad-blocker distortion. On a site whose spec says "no backend, no user data", it is philosophically the right shape. It fails anyway, for three specific reasons.

### 5.1 The SPA is the killer, and it is structural

`src/router.tsx` uses `createBrowserRouter` with lazy route components. `vercel.json` rewrites `/((?!assets/).*)` to `/index.html`. Together this means:

> **A reader who lands on `/`, browses to `/blog`, opens two posts, and clicks through to a project generates ONE server request.**

Everything after the first paint is `history.pushState` inside the client. No amount of log analysis can recover it — the information never leaves the browser. So server logs can answer:

- ✅ **Q1 (partly)** — how many entries, from which referrers, to which entry URLs. Deep links from RSS, LinkedIn, HN, or a search result *are* server requests and *are* visible.
- ⚠️ **Q2 (partly, and misleadingly)** — you see which posts are *entered directly*, never which are *read after browsing the index*. On a site whose front door is `/` and whose index is `/blog`, that is likely the majority of post reads, invisible.
- ❌ **Q3, Q4, Q5** — structurally impossible. Scroll depth, in-page clicks, and post→project navigation all happen client-side by construction.

**Honest summary: server logs cannot answer "which posts get read", which is the question the item exists to answer.**

### 5.2 And on Hobby, the logs are not there anyway

- **Runtime log retention is 1 hour on Hobby** (1 day Pro, 3 days Enterprise) ([vercel.com/docs/logs/runtime](https://vercel.com/docs/logs/runtime)). One hour is not an analytics window; it is a debugging window.
- **Log Drains — the only way to get logs *out* and keep them — are Pro/Enterprise only** ([vercel.com/docs/drains](https://vercel.com/docs/drains)). `static` is a valid drain source, so the data model is right; the plan gate is not.
- **Observability Plus is Pro+ only** ([vercel.com/docs/observability/observability-plus](https://vercel.com/docs/observability/observability-plus)).

So the real cost of the zero-JS route is: **$20/month for Pro, plus a drain consumer (i.e. a server — the exact "just a little backend" scope creep `docs/spec.md` §7 names as a standing risk), plus a log analyser** — to answer one-and-a-bit of five questions. That is strictly more money, more infra, and more security surface than the recommended option, for strictly less information. It is not a close call.

### 5.3 Two adjacent ideas, and why they don't rescue it

- **Cloudflare zone analytics** (genuinely server-side, no script, free) requires the domain's DNS to be on Cloudflare — which requires a **custom domain**. This site has none; `index.html` canonicalises to `https://doms-ai-studio.vercel.app/`. So this option costs a domain purchase first, and *still* cannot see SPA navigation, and *still* mixes bot traffic in ([Plausible's comparison](https://plausible.io/vs-cloudflare-web-analytics) makes the bot point, self-interestedly but correctly). Revisit only if Dom buys a domain for other reasons (**Open Decision D7**).
- **Cloudflare *Web* Analytics** — free and unlimited, but it is a **JavaScript beacon**, not server-side ([developers.cloudflare.com/web-analytics/faq](https://developers.cloudflare.com/web-analytics/faq/)). It is therefore an Option-B-shaped third-party `script-src` widening (§2.3), not a zero-JS option, and it does not belong in this section except to say so.
- **A `<img>` pixel** is blocked by `img-src 'self'` (§2.1), and even unblocked it fires once per full page load — i.e. it inherits every limitation in §5.1 while also widening the CSP. Dead end.

**Where zero-JS does win:** if Dom's real question is only Q1 ("did that LinkedIn post send anyone here at all?"), and he is willing to check the Vercel dashboard within an hour of posting a link, the existing 1-hour runtime logs already answer it today, for free, with nothing installed. That is a genuinely useful and genuinely free stopgap, and it is worth saying out loud before spending anything.

---

## 6. Scorecard — options against the five questions

✅ answers it · ⚠️ partial or unverified · ❌ cannot

| | Q1 arrivals/referrers | Q2 which posts (incl. SPA nav) | Q3 read depth | Q4 post→project | Q5 outbound/follow | CSP cost | Banner | Cash |
|---|---|---|---|---|---|---|---|---|
| **Vercel Web Analytics** | ✅ | ✅ (`<Analytics />` tracks route changes; verify with React Router — [docs](https://vercel.com/docs/frameworks/frontend/react-router)) | ❌ | ⚠️ needs `track()`; Hobby availability **not verified** | ⚠️ same | **none** | no | $0 (Hobby) |
| **Plausible hosted, proxied** | ✅ | ✅ (script handles `pushState`) | ⚠️ engagement/scroll support **not verified** | ✅ outbound-link + custom events | ✅ | none to the policy; 2 ordered rewrites; +1 hash **if** the inline stub is used | no | ~$9/mo (**not verified**) |
| **Plausible hosted, unproxied** | ✅ | ✅ | ⚠️ | ✅ | ✅ | **`script-src` + `connect-src` widened to a third party** | no | ~$9/mo |
| **Umami Cloud** | ✅ | ✅ | ❌ (natively) | ✅ custom events, free tier | ✅ | third-party widening (proxy possible in principle — **not verified** for Umami) | no | $0 (Hobby) |
| **Umami self-hosted** | ✅ | ✅ | ❌ | ✅ | ✅ | none if same-origin | no | infra + upkeep + a DB of visitor data |
| **Plausible CE self-hosted** | ✅ | ✅ | ⚠️ | ✅ | ✅ | none if same-origin | no | ClickHouse + Postgres, ≥2–4 GB RAM, $5–20/mo |
| **Server logs (Pro + drain)** | ✅ | ❌ (entries only) | ❌ | ❌ | ❌ | **none** | no | $20/mo + a backend |
| **Server logs (Hobby, 1h window)** | ⚠️ if you look within the hour | ❌ | ❌ | ❌ | ❌ | none | no | $0 |
| **Do nothing** | ❌ | ❌ | ❌ | ❌ | ❌ | none | no | $0 |

**Q3 is unanswered by every option except, possibly, Plausible.** If read-depth is the question Dom actually cares about, none of this is a clean answer and that changes the recommendation (§7.4).

---

## 7. Recommendation

### 7.1 Vercel Web Analytics, on the existing plan

**Four reasons, in order of weight:**

1. **It is the only option with a zero CSP delta.** `vercel.json` is unchanged. `script-src` keeps its single pinned hash. Both guard suites — the ones with `toHaveLength(1)` baked into four assertions across two files — stay green without being touched. On a repo that has invested this much in one carefully-pinned directive, "requires no change to it" is not a tiebreaker, it is the argument.
2. **It introduces no new trusted party.** Vercel already serves every byte of this site and already holds a DPA relationship. Every other client option adds an origin whose scripts execute in the page, or a database of visitor data that Dom becomes responsible for.
3. **It is free and it *caps* rather than bills.** At 50k events Hobby collection pauses; there is no surprise invoice. For a project whose open question is literally "is anyone reading", a capped free tier is precisely the right risk shape.
4. **It is the smallest possible change.** One dependency, one `<Analytics />` mount in `RootLayout`, no backend, no database, no secret, no route, no copy. Zero checklist categories move from N/A to applicable (§8).

**And the honest downsides, stated where Dom can't miss them:**

- **It will undercount, probably significantly.** `/_vercel/insights/script.js` is on ad-blocker lists ([Vercel Community thread](https://community.vercel.com/t/issue-vercel-insights-script-js-still-being-served-after-disabling/4213)), and this site's audience is developers — the population most likely to block it. Whatever number appears is a **lower bound**, not a measurement. On a site about honest measurement, that must never be reported as a fact without the caveat (→ **Open Decision D5**).
- **It cannot answer Q3 at all**, and may not answer Q4/Q5 on Hobby (custom-event availability **not verified**).
- **It is lock-in.** The data is not exportable to another tool; switching later means starting the history over.
- **It is a platform side-feature.** Plausible and Umami are products whose entire reason to exist is this job. Vercel's is a convenience.

### 7.2 The counter-case for the runner-up: Plausible, proxied through Vercel rewrites

This is a genuinely strong second, and if Dom's instincts pull this way he should follow them:

- It is a **real analytics tool**, not a side-feature: outbound-link and custom-event tracking are documented, first-class, and would answer **Q4 and Q5** — the questions that connect the blog to the portfolio, which is the actual business question behind PROJECT-BRIEF goal 2.
- **The proxy makes it first-party**, so `script-src 'self'` / `connect-src 'self'` stay exactly as they are *and* the ad-blocker undercount largely disappears — the accuracy problem that is the recommended option's worst flaw.
- **Portable.** Data export, and a self-hosting escape hatch under AGPL if the price ever stops making sense. No lock-in.
- **EU-aligned** and privacy-first by construction, with a longer public track record on the exemption question than a platform feature has.

**Its costs, equally honestly:** ~$9/month unverified; a new processor and a new DPA; two rewrite entries that **must be ordered before the SPA catch-all** or fail confusingly (§2.3); a second inline script and the four-assertion guard surgery **if** custom events are wanted via the `window.plausible` stub; and — the part that is not technical — **a first-party proxy exists to defeat readers' ad-blockers**. Plausible's own docs advise picking a path name that won't be recognised. On a site whose entire brand is honesty and transparency, deliberately evading a reader's stated preference not to be counted is a values decision, not a config decision. That is not a call this document makes. It is a call that must not be slipped past as an implementation detail. → **Open Decision D4.**

### 7.3 Non-negotiable prerequisite, whichever ships

**Verify on a real Vercel preview deploy before merging, with DevTools console open, and confirm zero CSP violations plus a real event landing in the dashboard.** Reason: the CSP has no `report-uri`/`report-to`, so a blocked script produces **silence** — and silence on this feature is indistinguishable from "nobody visited". Shipping an analytics integration that CSP quietly kills would be an unusually perfect example of the failure mode this repo keeps writing blog posts about. Note also that `vercel.json` headers never apply on the Vite dev server, so localhost proves nothing.

### 7.4 What would change the answer

| If… | Then… |
|---|---|
| Q4/Q5 (post→project click-through) is the *primary* question, not Q1/Q2 | Go **Plausible proxied**. Vercel's custom-event support on Hobby is unverified and may be Pro-gated; Plausible's outbound-link tracking is documented. |
| Q3 (read depth) is the primary question | **Nothing here answers it cleanly.** Re-open the costing with scroll-depth as the explicit requirement before spending anything. Do not buy a tool hoping it does this. |
| The preview check shows CSP violations or no events | Fall back to Plausible proxied, and record why in `BACKLOG.md` so it isn't re-proposed. |
| Dom buys a custom domain | Proxying gets cleaner, and free zero-JS Cloudflare zone analytics becomes available as a *complement* (bot/entry-level truth) to the client-side numbers. |
| The project turns out to be on **Pro** | Log drains + Observability Plus become free-ish options — still can't see SPA navigation (§5.1), so this changes the *cost* of the zero-JS route, not its *verdict*. |
| Traffic turns out to be effectively zero | Stop. The content-prioritisation problem was never a measurement problem. |

---

## 8. Security & trust model — checklist categories

Deliberately short, because the recommendation is deliberately small. Per `docs/spec.md` §5, this site's applicable set is XSS, secrets/env, source maps + headers, and supply chain. The recommendation moves **one** row.

| Category | Effect of the recommendation | Effect of a self-hosted option |
|---|---|---|
| **#46 Security headers / CSP** | **Unchanged** — the entire point. Both hash guards untouched. | Unchanged if same-origin. |
| **#14 / #17 Secrets in frontend JS** | Applies but trivial: no key at all for Vercel WA. Plausible/Umami use a public site ID; if it ever needs an env var it goes through `import.meta.env.VITE_*` per spec §5. Nothing privileged, ever. | Same, plus real server-side secrets (DB credentials) — a category this project currently doesn't have. |
| **#37 / #38 / #50 Supply chain** | **One new dependency** (`@vercel/analytics`) that executes on every page load. `npm audit` clean before ship (`npm run audit`), pin the version, read the diff. This is the only genuinely new risk. | Much larger: a whole app + database to patch, forever. |
| **#19 XSS** | Unchanged — no new rendering path, no `dangerouslySetInnerHTML`. | Unchanged on the site; a self-hosted dashboard is its own surface. |
| **I · Observability (#35, 42, 43, 44)** | Currently N/A per spec §5. **#35 (logs never contain PII) becomes live in spirit**: whatever ships must stay cookieless and aggregate, and must never be extended with anything that could identify a reader. #43/#44 stay N/A — a hosted analytics dashboard is the vendor's uptime and backup problem. | **All four move from N/A to applicable.** Dom becomes controller *and* processor of visitor data, on a box he patches, with a restore plan he must actually test. This is the strongest argument against self-hosting for a site with no other backend. |
| **B / C / D / E / H / J** | **Still N/A.** No auth, no rows, no roles, no endpoints, no user input, no LLM at runtime, nothing to rate-limit. The recommendation is read-only telemetry with no server component, so none of these categories are opened. | B/C/D/F/J all become live for a self-hosted dashboard (it has a login, a database, and a public endpoint). |
| **A04 Insecure design (the framing)** | The design intent is: **do not create a data subject.** No identifier that survives a day, no cross-site linkage, no per-visitor record Dom could be asked to produce or delete. Everything above follows from that one constraint. | A self-hosted store *is* a per-visitor record by construction, however anonymised. |

---

## 9. Out of scope

Installing anything. Editing `vercel.json`, `index.html`, `package.json`, or any test. Error tracking / Sentry (a separate item — real, and arguably higher-value than analytics on a site with a silent CSP). Uptime monitoring. Vercel Speed Insights and RUM field data (owned by `docs/performance-budget.md` §200, explicitly). A/B testing. Newsletter or subscriber counts. SEO rank tracking. Buying a custom domain. Writing the privacy note's copy (§3.2 recommends it; the words are a designer/Dom job). Any dashboard *on* the site showing traffic numbers — that is a separate, and given §7.1's undercount problem, a fraught idea.

---

## 10. Open decisions for Dom

Listed separately because none of them are the studio's to make.

| # | Decision | Default, if you want one |
|---|---|---|
| **D1** | **Is measuring visitors worth it at all for an experiment log?** This is a legitimate "no". The site is a public logbook of a private experiment; its value to Dom may not depend on readership, and a genuine answer is "I write it either way, and I'd rather not know". Choosing this costs €0, changes nothing, and is defensible in a post. | Weak yes to Q1 only — knowing whether anyone arrives is worth having; the rest is optional. |
| **D2** | **Is this project on Hobby or Pro today?** Not discoverable from the repo. Changes the free allowance, whether log drains exist at all, and possibly whether custom events work. **Answer this before anything else.** | — (fact-finding, 30 seconds in the dashboard) |
| **D3** | **Vercel Web Analytics, or Plausible proxied?** Zero-CSP-change + free + lock-in + undercounted, vs a better instrument at ~$9/mo with two ordered rewrites and a values question. | Vercel WA, with §7.3's preview verification as a hard gate. |
| **D4** | **Is deliberately defeating readers' ad-blockers acceptable on this site?** Any first-party proxy does exactly that, by design. It is the price of accurate numbers. On a site branded on honesty, it deserves a conscious answer. | Leaning no — which is part of why the recommendation is the option that doesn't require it. |
| **D5** | **If analytics numbers ever appear in a post or on the site, do they carry a "these undercount, here's why" disclosure?** Applying this repo's own falsifiability standard to its own metrics. | Yes, and it would make a good post. |
| **D6** | **Custom events / outbound-click tracking — yes or no?** The difference between "which post got opened" (Q2) and "did the portfolio actually work" (Q4). It is also the thing most likely to force the second-inline-script guard surgery, or a tool switch. | Not in v1. Ship pageviews, see whether Q1 even has a non-zero answer, then decide. |
| **D7** | **Buy a custom domain?** Independently good for a portfolio; also unlocks free zero-JS Cloudflare zone analytics and cleaner proxying. Out of scope here, but it changes several answers. | Yes eventually, on portfolio grounds, not analytics grounds. |
| **D8** | **Ship a short privacy note even though no banner is required?** GDPR Art. 13 transparency applies to IP processing regardless of the ePrivacy exemption. Cheap, and more honest than most banners. | **Yes** — in the same PR as whatever ships. |
| **D9** | **If nothing ships: is the fallback signal enough?** Public-repo GitHub traffic, RSS reader hits, manually noting where a link was posted, and the free 1-hour Vercel runtime-log peek right after sharing something (§5.3). | It is enough to answer Q1 roughly, today, for free. Worth trying for a month before spending anything. |
| **D10** | **Does historical retention matter?** Vercel WA's Hobby reporting window is unverified and probably short; the Plus add-on ($10/mo, Pro+) exists to extend it. If Dom wants a year-over-year story for the logbook, that pushes toward Plausible/Umami. | Doesn't matter yet. Revisit if there is ever a trend worth plotting. |
