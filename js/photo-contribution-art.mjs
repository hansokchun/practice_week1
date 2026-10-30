export const CONTRIBUTION_ART_SIZE = Object.freeze({ width: 1152, height: 768 });

export const CONTRIBUTION_PHOTOS = Object.freeze([
    Object.freeze({ id: 'daeo', lat: 37.5797175, lng: 126.9693226, frameBottom: 260 }),
    Object.freeze({ id: 'bukchon', lat: 37.581853, lng: 126.985635, frameBottom: 218 }),
    Object.freeze({ id: 'ihwa', lat: 37.578147, lng: 127.008011, frameBottom: 238 })
]);

export const CONTRIBUTION_NAMSAN = Object.freeze({
    lat: 37.5511694,
    lng: 126.9882267,
    width: 300,
    height: 300 * 350 / 360,
    anchorX: 150,
    anchorY: 190
});

export function projectContributionLocation({ lat, lng }) {
    const u = (lng - 126.951) / 0.069;
    const v = (37.596 - lat) / 0.056;
    return { x: 100 + 900 * u + 70 * v, y: 270 - 95 * u + 390 * v };
}

function escapeAttribute(value) {
    return String(value).replace(/[&"<>]/g, character => ({
        '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;'
    })[character]);
}

function positionStyle({ x, y, width, height }) {
    return `left:${x / CONTRIBUTION_ART_SIZE.width * 100}%;top:${y / CONTRIBUTION_ART_SIZE.height * 100}%;width:${width / CONTRIBUTION_ART_SIZE.width * 100}%;height:${height / CONTRIBUTION_ART_SIZE.height * 100}%`;
}

export function renderContributionArtwork({ mapUrl, namsanUrl, photoUrls }) {
    const namsan = projectContributionLocation(CONTRIBUTION_NAMSAN);
    const frameWidth = 192;
    const frameHeight = 144;
    const pins = CONTRIBUTION_PHOTOS.map(photo => {
        const { x, y } = projectContributionLocation(photo);
        return `<g data-contribution-pin="${photo.id}">
            <path class="photo-contribution-stem" d="M${x} ${photo.frameBottom}V${y - 40}" />
            <path class="photo-contribution-pin" d="M0 0C-5-8-18-20-18-32a18 18 0 0 1 36 0C18-20 5-8 0 0Z" transform="translate(${x} ${y})" />
            <circle class="photo-contribution-pin-center" cx="${x}" cy="${y - 32}" r="6" />
        </g>`;
    }).join('');
    const photos = CONTRIBUTION_PHOTOS.map(photo => {
        const { x } = projectContributionLocation(photo);
        const frame = { x: x - frameWidth / 2, y: photo.frameBottom - frameHeight, width: frameWidth, height: frameHeight };
        return `<div class="photo-contribution-photo" data-contribution-photo="${photo.id}" style="${positionStyle(frame)}">
            <img src="${escapeAttribute(photoUrls[photo.id])}" alt="" width="400" height="300" loading="lazy" decoding="async">
        </div>`;
    }).join('');
    return `<div class="photo-contribution-art" aria-hidden="true">
        <div class="photo-contribution-art-stage">
            <img class="photo-contribution-map" src="${escapeAttribute(mapUrl)}" alt="" width="1152" height="768" loading="lazy" decoding="async">
            <img class="photo-contribution-namsan" src="${escapeAttribute(namsanUrl)}" alt="" width="360" height="350" loading="lazy" decoding="async" style="${positionStyle({ x: namsan.x - CONTRIBUTION_NAMSAN.anchorX, y: namsan.y - CONTRIBUTION_NAMSAN.anchorY, width: CONTRIBUTION_NAMSAN.width, height: CONTRIBUTION_NAMSAN.height })}">
            <svg class="photo-contribution-markers" viewBox="0 0 1152 768" focusable="false">${pins}</svg>
            ${photos}
        </div>
    </div>`;
}
