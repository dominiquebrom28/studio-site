---
title: "The Fix Was Not Fixing It"
slug: "the-fix-was-not-fixing-it"
date: "2026-07-25"
summary: "One commit unblocked every PR by fixing one advisory and formally declining the other — then made the CI gate carry that decision out loud."
tags: ["logbook", "security", "ci", "dependencies"]
author: "Project Lead"
draft: false
tldr:
  - "The `npm audit` CI gate was failing repo-wide on two freshly-published high advisories, blocking every open PR."
  - "One got a real patch; the other was judged not-applicable and left unfixed on purpose, with the reasoning written into an allowlist."
  - "The blunt gate was swapped for one that fails on genuinely new highs but carries two documented, time-boxed exceptions."
---

Quiet day: one commit. But it's the kind of commit this logbook exists for, because the honest version of it is "we shipped a security fix that fixes one of the two things and formally refuses to fix the other."

The `Audit dependencies` step in CI runs a raw `npm audit --audit-level=high`. Overnight, two new advisories published against dependencies already in the tree, and the gate started failing on every branch — not because anything in the app changed, but because the outside world's opinion of the lockfile did. Every open PR was stuck behind a red check nobody had introduced.

Two advisories, two different honest answers.

**brace-expansion (DoS)** got a genuine fix, via `overrides` — but not the obvious one. The tidy move is to pin everything to the patched 5.x line. That was tried and rejected: brace-expansion 5.x is ESM-first and crashes the legacy minimatch 3.x that eslint still drags along, which would trade a CI audit failure for a broken `npm run lint`. So the override is split — the 1.x consumer pinned to the backported-patched 1.1.12+, the modern `@typescript-eslint` consumer to 5.0.8. Narrower, uglier, and actually correct.

**react-router (RSC-mode CSRF)** was *not* fixed, and that's the deliberate part. The finding doesn't apply here — this is a client-only Vite SPA with no server routers to exploit — and there's no patched release to move to anyway: the installed 7.18.1 is also the latest, and the only audit-clean version is a downgrade to 7.11.0. Downgrading a whole router to silence a non-applicable finding is how you introduce a real regression chasing a fake one. So it stays, documented.

The part that keeps this from being a quiet cheat: the blunt `npm audit` gate was replaced with `audit-ci` plus an allowlist, so CI still fails on genuinely new highs, but the two exceptions are written down — each with a revisit condition — instead of the check just being loosened until it turns green. One of those allowlist entries only exists to suppress a false positive from npm audit's own range-flattening, on a dependency that *is* already patched.

The commit says everything downstream passed — lint, typecheck, build, 341 tests. Worth stating plainly what "fixed" means here anyway: one advisory is patched, one is a reasoned exception with an expiry note, and the gate now says so out loud rather than pretending the tree is clean. That's the honest shape of a lot of dependency security — and the failure mode this studio keeps trying not to hide.
