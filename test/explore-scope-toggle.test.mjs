import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { getExploreScopeControl, getNextExplorePhotoScope } from '../js/explore-scope-toggle.mjs';

test('Explore owner scope alternates directly without a menu', () => {
    assert.equal(getNextExplorePhotoScope('others'), 'mine');
    assert.equal(getNextExplorePhotoScope('mine'), 'others');
    assert.equal(getNextExplorePhotoScope(undefined), 'mine');
    assert.equal(getNextExplorePhotoScope('invalid'), 'mine');
    let scope = 'others';
    for (let i = 0; i < 10; i++) {
        scope = getNextExplorePhotoScope(scope);
        assert.equal(scope, i % 2 === 0 ? 'mine' : 'others');
    }
});

test('Explore icon, accessible name and pressed state describe the visible photo scope', () => {
    assert.deepEqual(getExploreScopeControl('mine'), { icon: 'person', label: '내 사진', pressed: true });
    assert.deepEqual(getExploreScopeControl('others'), { icon: 'groups', label: '다른 사람 사진', pressed: false });
    assert.deepEqual(getExploreScopeControl(null), getExploreScopeControl('others'));
});

function makeScopeHarness(currentUser) {
    const app = readFileSync('js/app.js', 'utf8');
    const functions = app.slice(app.indexOf('function renderExplorePhotoScopeControls()'), app.indexOf('function resetExploreSelectionState()'));
    const state = { currentUser, explorePhotoScope: 'others', isExploreMobileDiscoveryOpen: true };
    const trigger = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
    const icon = { textContent: '' };
    const tooltip = { textContent: '' };
    const events = [];
    const nodes = { '[data-explore-scope-trigger]': trigger, '[data-explore-scope-trigger-icon]': icon, '[data-explore-scope-tooltip]': tooltip };
    const build = new Function('deps', `
        const { state, $, getExploreScopeControl, isExploreMobileViewport, showToast,
            shouldPreserveExploreViewport, getExplorePhotoMapItems, getExploreCurrentBounds,
            resetExploreSelectionState, setExploreMobileDiscoveryOpen, renderPublicSurfaces } = deps;
        ${functions}
        return { renderExplorePhotoScopeControls, setExplorePhotoScope };
    `);
    const controller = build({
        state,
        $: selector => nodes[selector],
        getExploreScopeControl,
        isExploreMobileViewport: () => true,
        showToast: message => events.push(['toast', message]),
        shouldPreserveExploreViewport: () => true,
        getExplorePhotoMapItems: () => [],
        getExploreCurrentBounds: () => ({}),
        resetExploreSelectionState: () => { events.push(['reset']); state.isExploreMobileDiscoveryOpen = false; },
        setExploreMobileDiscoveryOpen: open => { state.isExploreMobileDiscoveryOpen = open; },
        renderPublicSurfaces: () => events.push(['render'])
    });
    return { ...controller, state, trigger, icon, tooltip, events };
}

test('member toggles update the visible icon and tooltip while preserving the open mobile drawer', () => {
    const h = makeScopeHarness({ id: 'member' });
    for (const scope of ['mine', 'others', 'mine', 'others']) {
        h.setExplorePhotoScope(scope);
        const control = getExploreScopeControl(scope);
        assert.equal(h.state.explorePhotoScope, scope);
        assert.equal(h.trigger.attributes['aria-pressed'], String(control.pressed));
        assert.equal(h.trigger.attributes['aria-label'], control.label);
        assert.equal(h.icon.textContent, control.icon);
        assert.equal(h.tooltip.textContent, control.label);
        assert.equal(h.state.isExploreMobileDiscoveryOpen, true);
        assert.equal(h.state.explorePreserveViewportOnce, true);
    }
    assert.equal(h.events.filter(([name]) => name === 'reset').length, 4);
    assert.equal(h.events.filter(([name]) => name === 'render').length, 4);
});

test('guest requests remain on public photos and do not reset or refresh private map data', () => {
    const h = makeScopeHarness(null);
    h.renderExplorePhotoScopeControls();
    h.setExplorePhotoScope('mine');
    assert.equal(h.state.explorePhotoScope, 'others');
    assert.equal(h.icon.textContent, 'groups');
    assert.deepEqual(h.events, [['toast', '내 사진은 로그인 후 볼 수 있어요.']]);
    h.state.explorePhotoScope = 'mine';
    h.renderExplorePhotoScopeControls();
    assert.equal(h.state.explorePhotoScope, 'others');
    assert.equal(h.trigger.attributes['aria-pressed'], 'false');
});
