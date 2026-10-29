import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync('style.css', 'utf8');

test('trial introduction separates the current step from quieter upcoming stages', () => {
    assert.match(css, /\.photo-trial-intro\s*\{[^}]*border: 0;[^}]*background: transparent;/s);
    assert.match(css, /\.photo-trial-steps li\s*\{[^}]*background: transparent;[^}]*box-shadow: none;/s);
    assert.match(css, /\.photo-trial-steps li\[aria-current="step"\]\s*\{[^}]*background: var\(--action-soft\)/s);
    assert.match(css, /\.photo-trial-steps li:not\(\[aria-current\]\) strong\s*\{[^}]*color: var\(--text\);[^}]*font-weight: 600/s);
    assert.match(css, /\.photo-trial-step-detail\s*\{[^}]*color: color-mix\(in srgb, var\(--muted\) 85%, var\(--text\)\)/s);
});

test('the initial picker reuses the upload dropzone design and returns to a compact button after selection', () => {
    const html = readFileSync('index.html', 'utf8');
    const modal = html.slice(html.indexOf('id="photo-trial-modal"'), html.indexOf('id="auth-modal"'));
    assert.match(modal, /class="btn-primary photo-trial-dropzone" data-trial-add/);
    assert.match(modal, /upload-dropzone-icon/);
    assert.match(modal, /사진을 선택하거나 이곳에 끌어다 놓으세요/);
    assert.match(css, /\[data-trial-add\]\s*\{[^}]*border: 1\.5px dashed[^}]*background: var\(--surface\)/s);
    assert.match(css, /\.photo-trial-dropzone \[data-trial-dropzone-copy\]\s*\{\s*display: none;/);
    assert.match(css, /\.photo-trial-picker\s*\{[^}]*border: 0;[^}]*background: transparent;[^}]*box-shadow: none;/s);
});
