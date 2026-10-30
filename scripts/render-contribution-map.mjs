import { readFile, writeFile } from 'node:fs/promises';
import { projectContributionLocation } from '../js/photo-contribution-art.mjs';

// Offline cartography only: visiting Home never queries a map provider.
const sourceUrl = new URL('../public/artwork/central-seoul-map-data.json', import.meta.url);
const outputUrl = new URL('../images/seoul-photo-map-v3.svg', import.meta.url);
const source = JSON.parse(await readFile(sourceUrl, 'utf8'));
const paths = new Map();
for (const feature of source.features) {
    // Local alleys are represented by their photo pins; keep the floor legible at 480px.
    if (feature.kind === 'residential') continue;
    const points = feature.coordinates.map(([lng, lat]) => projectContributionLocation({ lat, lng }));
    const path = points.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
    const closed = feature.kind === 'park' || feature.kind === 'water';
    const list = paths.get(feature.kind) || [];
    list.push(path + (closed ? 'Z' : ''));
    paths.set(feature.kind, list);
}
const group = (kind, attributes) => `<path ${attributes} d="${(paths.get(kind) || []).join('')}"/>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1152" height="768" viewBox="0 0 1152 768">
<title>서울 종로·남산 실제 도로와 수로</title>
<desc>© OpenStreetMap contributors, ODbL. Simplified static cartography; source and licence: /artwork/credits.html</desc>
<defs><radialGradient id="edge"><stop offset="0.58" stop-color="white"/><stop offset="0.88" stop-color="white" stop-opacity=".72"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient><mask id="fade"><ellipse cx="580" cy="424" rx="560" ry="272" fill="url(#edge)"/></mask><clipPath id="bounds"><path d="M100 270L1000 175L1070 565L170 660Z"/></clipPath></defs>
<g mask="url(#fade)"><ellipse cx="580" cy="424" rx="560" ry="272" fill="#f9f7f2"/><g clip-path="url(#bounds)">
${group('park', 'fill="#dce7d7" fill-opacity=".8" stroke="none"')}
${group('water', 'fill="#c9dfdd" stroke="none"')}
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
${group('residential', 'stroke="#fff" stroke-width="1.5"')}
${group('pedestrian', 'stroke="#fff" stroke-width="1.2"')}
${group('tertiary', 'stroke="#d6dedb" stroke-width="4.2"')}
${group('secondary', 'stroke="#d6dedb" stroke-width="5.5"')}
${group('primary', 'stroke="#d6dedb" stroke-width="7"')}
${group('tertiary', 'stroke="#fff" stroke-width="2.8"')}
${group('secondary', 'stroke="#fff" stroke-width="3.8"')}
${group('primary', 'stroke="#fff" stroke-width="5.1"')}
${group('stream', 'stroke="#c9dfdd" stroke-width="2.8"')}
${group('river', 'stroke="#c9dfdd" stroke-width="4.5"')}
</g></g></g></svg>`;
await writeFile(outputUrl, svg);
console.log(`Rendered ${source.features.length} actual geographic features (${Buffer.byteLength(svg)} bytes).`);
