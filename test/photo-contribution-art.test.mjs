import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
    CONTRIBUTION_ART_SIZE,
    CONTRIBUTION_PHOTOS,
    CONTRIBUTION_NAMSAN,
    projectContributionLocation,
    renderContributionArtwork
} from '../js/photo-contribution-art.mjs';

const assets = {
    mapUrl: '/assets/seoul-map.svg',
    namsanUrl: '/assets/namsan.webp',
    photoUrls: { daeo: '/assets/daeo.webp', bukchon: '/assets/bukchon.webp', ihwa: '/assets/ihwa.webp' }
};

test('the contribution map uses one fixed geographic projection for its floor and pins', () => {
    assert.deepEqual(CONTRIBUTION_ART_SIZE, { width: 1152, height: 768 });
    assert.deepEqual(projectContributionLocation({ lat: 37.596, lng: 126.951 }), { x: 100, y: 270 });
    const southeast = projectContributionLocation({ lat: 37.54, lng: 127.02 });
    assert.ok(Math.abs(southeast.x - 1070) < 0.000001);
    assert.ok(Math.abs(southeast.y - 565) < 0.000001);
});

test('real photo anchors retain their sourced geographic coordinates', () => {
    assert.deepEqual(CONTRIBUTION_PHOTOS.map(({ id, lat, lng }) => ({ id, lat, lng })), [
        { id: 'daeo', lat: 37.5797175, lng: 126.9693226 },
        { id: 'bukchon', lat: 37.581853, lng: 126.985635 },
        { id: 'ihwa', lat: 37.578147, lng: 127.008011 }
    ]);
    const namsan = projectContributionLocation(CONTRIBUTION_NAMSAN);
    assert.ok(namsan.x > 630 && namsan.x < 650);
    assert.ok(namsan.y > 520 && namsan.y < 540);
    assert.equal(CONTRIBUTION_NAMSAN.width, 300);
});

test('every ordinary pin ends at its projected photo location with a stem to an upright frame', () => {
    const artwork = renderContributionArtwork(assets);
    for (const photo of CONTRIBUTION_PHOTOS) {
        const pin = projectContributionLocation(photo);
        const group = artwork.match(new RegExp(`<g data-contribution-pin="${photo.id}"[^>]*>([\\s\\S]*?)</g>`))?.[1];
        assert.ok(group, `${photo.id} has its own geographic pin`);
        assert.ok(group.includes(`transform="translate(${pin.x} ${pin.y})"`));
        assert.match(group, /class="photo-contribution-pin" d="M0 0/);
        assert.match(group, /class="photo-contribution-stem"/);
        assert.ok(artwork.includes(`data-contribution-photo="${photo.id}"`));
        assert.ok(artwork.includes(`src="${assets.photoUrls[photo.id]}"`));
    }
    assert.equal((artwork.match(/data-contribution-photo=/g) || []).length, 3);
    assert.doesNotMatch(artwork, /rotate\(|skew\(|clipPath|<button|<a\b/);
});

test('the native composite remains decorative, proportionally sized, lazy and safe to repeat', () => {
    const artwork = renderContributionArtwork(assets);
    assert.match(artwork, /class="photo-contribution-art" aria-hidden="true"/);
    assert.match(artwork, /viewBox="0 0 1152 768"/);
    assert.equal((artwork.match(/<img\b/g) || []).length, 5);
    assert.equal((artwork.match(/loading="lazy" decoding="async"/g) || []).length, 5);
    assert.equal((artwork.match(/alt=""/g) || []).length, 5);
    assert.doesNotMatch(artwork, /\bid="|url\(#/);
    assert.equal(renderContributionArtwork(assets), artwork);
});

test('asset URLs cannot break out of the decorative image attributes', () => {
    const artwork = renderContributionArtwork({ ...assets, mapUrl: '/map.svg?x=" onload="alert(1)&y=2' });
    assert.ok(artwork.includes('src="/map.svg?x=&quot; onload=&quot;alert(1)&amp;y=2"'));
    assert.doesNotMatch(artwork, /src="[^"]*" onload=/);
});

test('the displayed photo anchors match documented sources and public licence credits', () => {
    const provenance = JSON.parse(readFileSync(new URL('../images/seoul-photo-map-v3.source.json', import.meta.url), 'utf8'));
    const credits = readFileSync(new URL('../public/artwork/credits.html', import.meta.url), 'utf8');
    for (const photo of CONTRIBUTION_PHOTOS) {
        const source = provenance.photos.find(item => item.id === photo.id);
        assert.equal(source.lat, photo.lat);
        assert.equal(source.lng, photo.lng);
        assert.ok(credits.includes(source.author));
        assert.ok(credits.includes(source.source));
        assert.ok(credits.includes(source.licenceUrl));
    }
    assert.match(credits, /central-seoul-map-data\.json/);
    assert.match(credits, /OpenStreetMap contributors/);
    assert.match(credits, /<body class="artwork-credits">/);
    const stylesheet = readFileSync(new URL('../public/artwork/credits.css', import.meta.url), 'utf8');
    assert.match(stylesheet, /word-break: keep-all/);
    assert.match(stylesheet, /white-space: nowrap/);
});
