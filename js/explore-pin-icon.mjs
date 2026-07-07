export const EXPLORE_PHOTO_PIN_COLOR = '#f26545';
export const EXPLORE_CLUSTER_PIN_COLOR = '#0f5856';
export const EXPLORE_SELECTED_PIN_COLOR = '#ff4f32';

const PHOTO_PIN_PATH = 'M14 35C11.8 31.8 3 22.4 3 14A11 11 0 0 1 25 14C25 22.4 16.2 31.8 14 35Z';
const SELECTED_PHOTO_PIN_PATH = 'M32 62C28 56.5 12 41 12 28A20 20 0 0 1 52 28C52 41 36 56.5 32 62Z';
const CLUSTER_PIN_PATH = 'M17 41C14.3 37.1 4 26.1 4 16.5A13 13 0 0 1 30 16.5C30 26.1 19.7 37.1 17 41Z';

function encodeSvg(svg) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function makePoint(maps, x, y) {
    return new maps.Point(x, y);
}

function makeSize(maps, width, height) {
    return maps.Size ? new maps.Size(width, height) : { width, height };
}

function getSvgIcon(maps, { svg, width, height, anchorX, anchorY }) {
    return {
        url: encodeSvg(svg),
        scaledSize: makeSize(maps, width, height),
        anchor: makePoint(maps, anchorX, anchorY)
    };
}

export function getExplorePinSymbolIcon(maps, { size = 36, type = 'photo', selected = false } = {}) {
    const isCluster = type === 'cluster';
    if (selected) {
        const width = 64;
        const height = 72;
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                <circle cx="32" cy="30" r="20" fill="${EXPLORE_SELECTED_PIN_COLOR}" fill-opacity="0.22">
                    <animate attributeName="r" values="20;34" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="fill-opacity" values="0.28;0" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="32" cy="30" r="18" fill="${EXPLORE_SELECTED_PIN_COLOR}" fill-opacity="0.18">
                    <animate attributeName="r" values="16;32" dur="1.8s" begin="0.9s" repeatCount="indefinite" />
                    <animate attributeName="fill-opacity" values="0.22;0" dur="1.8s" begin="0.9s" repeatCount="indefinite" />
                </circle>
                <path d="${SELECTED_PHOTO_PIN_PATH}" fill="${EXPLORE_SELECTED_PIN_COLOR}" stroke="#ffffff" stroke-width="4" stroke-linejoin="round" filter="drop-shadow(0 7px 10px rgba(255, 79, 50, 0.3))" />
                <circle cx="32" cy="28" r="8" fill="#ffffff" />
            </svg>
        `.trim();

        return {
            ...getSvgIcon(maps, { svg, width, height, anchorX: 32, anchorY: 62 }),
            fillColor: EXPLORE_SELECTED_PIN_COLOR,
            strokeColor: '#ffffff',
            strokeWeight: 4,
            scale: width / 48
        };
    }

    const width = isCluster ? size + 6 : 28;
    const height = isCluster ? size + 12 : 36;
    const color = isCluster ? EXPLORE_CLUSTER_PIN_COLOR : EXPLORE_PHOTO_PIN_COLOR;
    const path = isCluster ? CLUSTER_PIN_PATH : PHOTO_PIN_PATH;
    const anchorX = isCluster ? 17 : 14;
    const anchorY = isCluster ? 41 : 35;
    const hole = isCluster
        ? '<circle cx="17" cy="16.5" r="5.6" fill="#ffffff" />'
        : '<circle cx="14" cy="14" r="5.2" fill="#ffffff" />';
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <path d="${path}" fill="${color}" stroke="#ffffff" stroke-width="${isCluster ? 2.5 : 2}" stroke-linejoin="round" />
            ${hole}
        </svg>
    `.trim();

    return {
        ...getSvgIcon(maps, { svg, width, height, anchorX, anchorY }),
        fillColor: color,
        strokeColor: '#ffffff',
        strokeWeight: isCluster ? 2.5 : 2,
        scale: width / 48
    };
}
