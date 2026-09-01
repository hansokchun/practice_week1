import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    FEEDBACK_CATEGORIES,
    FEEDBACK_STATUSES,
    normalizeFeedbackDraft
} from '../js/product-feedback.mjs';

test('feedback draft keeps only supported user input', () => {
    assert.deepEqual(normalizeFeedbackDraft({
        category: 'feature_request',
        message: '  지도에서 사진을 비교하고 싶어요.  ',
        rating: '5',
        pagePath: '#/profile?owner=someone',
        contactAllowed: true
    }), {
        category: 'feature_request',
        message: '지도에서 사진을 비교하고 싶어요.',
        rating: 5,
        page_path: '#/profile?owner=someone',
        contact_allowed: true
    });
});

test('feedback draft rejects unsupported and oversized values', () => {
    const normalized = normalizeFeedbackDraft({
        category: 'admin',
        message: `  ${'가'.repeat(1200)}  `,
        rating: '9',
        pagePath: `#/${'x'.repeat(260)}`,
        contactAllowed: 'yes'
    });

    assert.equal(normalized.category, 'usability');
    assert.equal(normalized.message.length, 1000);
    assert.equal(normalized.rating, null);
    assert.equal(normalized.page_path.length, 200);
    assert.equal(normalized.contact_allowed, false);
});

test('feedback constants match the persisted product workflow', () => {
    assert.deepEqual(Object.keys(FEEDBACK_CATEGORIES), ['bug', 'usability', 'feature_request', 'other']);
    assert.deepEqual(Object.keys(FEEDBACK_STATUSES), ['received', 'reviewing', 'planned', 'completed', 'closed']);
});

test('profile and landing admin expose feedback surfaces', () => {
    const html = readFileSync('index.html', 'utf8');
    const app = readFileSync('js/app.js', 'utf8');
    const auth = readFileSync('auth.js', 'utf8');

    assert.match(html, /id="account-feedback-section"[\s\S]*id="account-deletion-section"/u);
    assert.match(html, /id="feedback-modal"[\s\S]*id="feedback-form"/u);
    assert.match(html, /id="landing-admin-feedback"/u);
    assert.match(app, /submitProductFeedback/u);
    assert.match(app, /renderLandingAdminFeedback/u);
    assert.match(auth, /from\(['"]product_feedback['"]\)/u);
});

test('feedback database migration keeps submission private and rate limited', () => {
    const migration = readFileSync(
        'supabase/migrations/20260901144544_add_product_feedback.sql',
        'utf8'
    );

    assert.match(migration, /alter table public\.product_feedback enable row level security/u);
    assert.match(migration, /revoke all on table public\.product_feedback from anon, authenticated/u);
    assert.match(migration, /user_id = \(select auth\.uid\(\)\)/u);
    assert.match(migration, /app_metadata[\s\S]*role[\s\S]*admin/u);
    assert.match(migration, /recent_submission_count >= 5/u);
    assert.match(migration, /security invoker/u);
    assert.doesNotMatch(migration, /security definer/u);
});
