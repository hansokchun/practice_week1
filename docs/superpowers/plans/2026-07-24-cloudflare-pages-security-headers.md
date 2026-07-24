# Cloudflare Pages Security Headers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver baseline anti-clickjacking, MIME, referrer, permission, and CSP protections on Cloudflare Pages static responses.

**Architecture:** Vite copies `public/_headers` unchanged into `dist/_headers`; Cloudflare Pages reads that asset at deployment time and applies its `/*` rule to static files. The existing Pages Function is deliberately unchanged because Pages does not apply `_headers` rules to Function responses.

**Tech Stack:** Vite, Cloudflare Pages `_headers`, Node.js built-in test runner.

---

### Task 1: Capture the static-header contract

**Files:**
- Create: `test/cloudflare-pages-security-headers.test.mjs`
- Test: `test/cloudflare-pages-security-headers.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
test('Cloudflare Pages static responses use baseline security headers', () => {
    assert.match(headers, /^\/\*$/m);
    assert.match(headers, /X-Frame-Options: DENY/);
    assert.match(headers, /X-Content-Type-Options: nosniff/);
    assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);
    assert.match(headers, /Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\), usb=\(\)/);
    assert.match(headers, /Content-Security-Policy: base-uri 'self'; object-src 'none'; frame-ancestors 'none'/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/cloudflare-pages-security-headers.test.mjs`

Expected: FAIL because `public/_headers` does not exist.

### Task 2: Add the Pages security policy

**Files:**
- Create: `public/_headers`
- Test: `test/cloudflare-pages-security-headers.test.mjs`

- [ ] **Step 1: Add the minimum static policy**

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Content-Security-Policy: base-uri 'self'; object-src 'none'; frame-ancestors 'none'
```

- [ ] **Step 2: Run the focused test**

Run: `node --test test/cloudflare-pages-security-headers.test.mjs`

Expected: PASS with one passing subtest.

### Task 3: Verify and deploy

**Files:**
- Create: `public/_headers`
- Create: `test/cloudflare-pages-security-headers.test.mjs`
- Add: `docs/superpowers/specs/2026-07-24-cloudflare-pages-security-headers-design.md`
- Add: `docs/superpowers/plans/2026-07-24-cloudflare-pages-security-headers.md`

- [ ] **Step 1: Run complete checks**

Run: `npm test && npm run build && test -f dist/_headers`

Expected: all tests pass, Vite exits 0, and the built header file exists.

- [ ] **Step 2: Review and commit**

Run: `git diff --check && git add public/_headers test/cloudflare-pages-security-headers.test.mjs docs/superpowers/specs/2026-07-24-cloudflare-pages-security-headers-design.md docs/superpowers/plans/2026-07-24-cloudflare-pages-security-headers.md && git commit -m "feat: add Pages security headers"`

Expected: one commit on `dev` with no whitespace errors.

- [ ] **Step 3: Push and inspect Preview headers**

Run: `git push origin dev && curl -fsSI https://dev.practice-week1-cws.pages.dev/`

Expected: remote `dev` updates; after Cloudflare deploys, the Preview root includes every header from `public/_headers`.
