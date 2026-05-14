# Profile Nickname and Sidebar Back Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix nickname saving/display and make sidebar Back return to the previous sidebar panel.

**Architecture:** Add small, testable helper modules for profile names and sidebar history, then integrate them into the existing vanilla JS module graph. Keep `activatePanel` as the DOM switcher and avoid a full router rewrite.

**Tech Stack:** Vanilla JavaScript ES modules, Supabase JS SDK, Vite, Node built-in test runner.

---

## File Structure

- Create `js/profile-names.mjs`: nickname validation, display-name cache, and fallback formatting.
- Create `js/sidebar-history.mjs`: pure history stack logic for sidebar panels.
- Modify `auth.js`: add `fetchProfilesByIds` helper and improve `updateNicknameInDB` upsert conflict behavior.
- Modify `js/auth-guard.js`: validate nickname before save, improve error diagnostics, refresh cache after save.
- Modify `js/detail.js`: resolve author/comment nicknames from `profiles`.
- Modify `js/profile.js`: resolve profile page nickname from `profiles` and use history-backed Back.
- Modify `js/state.js`: add sidebar history state.
- Modify `package.json`: English description and `test` script using Node's built-in runner.
- Create `test/profile-names.test.mjs`.
- Create `test/sidebar-history.test.mjs`.
- Update `docs/lessons_learned.md`.

## Task 1: Test Helpers

**Files:**
- Create: `test/profile-names.test.mjs`
- Create: `test/sidebar-history.test.mjs`
- Create: `js/profile-names.mjs`
- Create: `js/sidebar-history.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Create tests for:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNickname, getUserFallbackName, createProfileNameResolver } from '../js/profile-names.mjs';

test('normalizeNickname requires a non-empty nickname', () => {
  assert.equal(normalizeNickname('  Alice  '), 'Alice');
  assert.throws(() => normalizeNickname('   '), /required/);
});

test('profile resolver uses cached nickname and safe fallback', async () => {
  const resolver = createProfileNameResolver({
    fetchProfilesByIds: async () => [{ id: 'user-123456', nickname: 'Nari' }]
  });

  assert.equal(await resolver.resolve('user-123456'), 'Nari');
  assert.equal(await resolver.resolve('missing-user'), 'User miss');
});
```

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSidebarHistory } from '../js/sidebar-history.mjs';

test('sidebar history returns to the previous panel', () => {
  const history = createSidebarHistory('explore');
  history.visit('detail', { photoId: 'p1' });
  history.visit('profile', { userId: 'u1' });

  assert.deepEqual(history.back(), { panel: 'detail', context: { photoId: 'p1' } });
  assert.deepEqual(history.back(), { panel: 'explore', context: {} });
  assert.equal(history.back(), null);
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test`

Expected: fail because the helper modules and test script do not exist yet.

- [ ] **Step 3: Implement minimal helpers**

Implement `normalizeNickname`, `getUserFallbackName`, `createProfileNameResolver`, and `createSidebarHistory`.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test`

Expected: all Node tests pass.

## Task 2: Supabase Profile Directory

**Files:**
- Modify: `auth.js`
- Test: `npm test`

- [ ] **Step 1: Add `fetchProfilesByIds(userIds)`**

The helper should de-duplicate ids, query `profiles` with `.in('id', ids)`, and return an empty array on empty input.

- [ ] **Step 2: Improve `updateNicknameInDB`**

Use `.upsert({ id, nickname }, { onConflict: 'id' })` so the user's own row updates by primary key while preserving database uniqueness on nickname.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: helper tests still pass.

## Task 3: Profile Save Flow

**Files:**
- Modify: `js/auth-guard.js`
- Modify: `js/profile-names.mjs`
- Test: `npm test`

- [ ] **Step 1: Import `normalizeNickname`**

Use it before any Supabase write. Empty nickname shows a warning and exits without network writes.

- [ ] **Step 2: Improve duplicate/error handling**

Keep duplicate nickname handling for code `23505`, add console diagnostics for other database errors, and show a clearer generic profile-save error.

- [ ] **Step 3: Refresh local metadata and cache**

After successful save, update `currentUser.user_metadata`, local variables, and profile-name cache.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: all Node tests pass.

## Task 4: Public Nickname Display

**Files:**
- Modify: `js/detail.js`
- Modify: `js/profile.js`
- Modify: `js/app.js`
- Test: `npm test`

- [ ] **Step 1: Wire resolver from app bootstrap**

Create one profile name resolver with `fetchProfilesByIds` and pass it into detail/profile modules.

- [ ] **Step 2: Detail author display**

When showing detail, set fallback immediately, then resolve and update the author label asynchronously if a profile nickname exists.

- [ ] **Step 3: Comments display**

Collect comment author ids, resolve names, and render author labels using resolved names.

- [ ] **Step 4: Profile page display**

When opening a profile page, set fallback immediately, resolve the user's nickname, update the profile header, and save the resolved nickname into page state.

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: all Node tests pass.

## Task 5: Sidebar Back History

**Files:**
- Modify: `js/state.js`
- Modify: `js/detail.js`
- Modify: `js/profile.js`
- Modify: `js/events.js`
- Test: `npm test`

- [ ] **Step 1: Add history state**

Store a sidebar history object or equivalent stack in state.

- [ ] **Step 2: Record visits**

Record transitions to detail and profile with enough context to reopen the previous panel.

- [ ] **Step 3: Back behavior**

Detail Back and Profile Back should use the stack first, then fall back to explore if no previous entry exists.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: all Node tests pass.

## Task 6: Final Verification and Push

**Files:**
- Modify: `package.json`
- Modify: `docs/lessons_learned.md`

- [ ] **Step 1: Run unit tests**

Run: `npm test`

Expected: pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: Vite build exits with code 0.

- [ ] **Step 3: Security checklist**

Check no secrets were added, Supabase anon key unchanged, nickname text is assigned with `textContent`, and private photo filtering still uses existing `photos` vs `sharedPhotos` pools.

- [ ] **Step 4: Commit and push dev**

Run:

```bash
git add .
git commit -m "fix: sync profile nicknames and sidebar back navigation"
git push origin dev
```

Expected: push succeeds to `origin/dev`.

