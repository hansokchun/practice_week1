import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync('style.css', 'utf8');

test('trial steps stay neutral so the photo picker is the primary visual action', () => {
    assert.match(css, /\.photo-trial-intro\s*\{[^}]*border: 0;[^}]*background: transparent;/s);
    assert.match(css, /\.photo-trial-steps li\s*\{[^}]*background: transparent;[^}]*box-shadow: none;/s);
    assert.match(css, /\.photo-trial-steps li\[aria-current="step"\]\s*\{[^}]*border-color: transparent;[^}]*background: transparent/s);
    assert.match(css, /\.photo-trial-steps li\[aria-current="step"\] \.photo-trial-step-number\s*\{[^}]*background: var\(--surface-soft\);[^}]*color: var\(--text\)/s);
    assert.match(css, /\.photo-trial-steps li:not\(\[aria-current\]\) strong\s*\{[^}]*color: var\(--text\);[^}]*font-weight: 600/s);
    assert.match(css, /\.photo-trial-step-detail\s*\{[^}]*color: color-mix\(in srgb, var\(--muted\) 85%, var\(--text\)\)/s);
});

test('the initial picker reuses the upload dropzone design and returns to a compact button after selection', () => {
    const html = readFileSync('index.html', 'utf8');
    const modal = html.slice(html.indexOf('id="photo-trial-modal"'), html.indexOf('id="auth-modal"'));
    assert.match(modal, /class="btn-primary photo-trial-dropzone" data-trial-add/);
    assert.match(modal, /upload-dropzone-icon/);
    assert.match(modal, /사진을 선택하거나 이곳에 끌어다 놓으세요/);
    assert.match(css, /\[data-trial-add\]\s*\{[^}]*border: 1\.5px dashed[^}]*background: var\(--photo-trial-picker-surface\)/s);
    assert.match(css, /\.photo-trial-dropzone \[data-trial-dropzone-copy\]\s*\{\s*display: none;/);
    assert.match(css, /\.photo-trial-picker\s*\{[^}]*border: 0;[^}]*background: transparent;[^}]*box-shadow: none;/s);
});

test('the green picker treatment is scoped to the first screen, including its hover and drag states', () => {
    const emptyScope = String.raw`\.photo-trial-card:has\(\[data-trial-workspace\]\[hidden\]\)`;
    assert.match(css, /--photo-trial-picker-surface: #e6f1e3;/);
    assert.match(css, new RegExp(`${emptyScope} \\[data-trial-add\\]\\s*\\{[^}]*background: var\\(--photo-trial-picker-surface\\);[^}]*color: var\\(--photo-trial-picker-ink\\)`, 's'));
    assert.match(css, new RegExp(`${emptyScope} \\[data-trial-add\\]:hover\\s*\\{[^}]*background: var\\(--photo-trial-picker-hover\\)`, 's'));
    assert.match(css, new RegExp(`${emptyScope} \\.photo-trial-dropzone\\.is-dragging\\s*\\{[^}]*background: var\\(--photo-trial-picker-hover\\)`, 's'));
    assert.doesNotMatch(css, /\.photo-trial-intro-copy/);
});
