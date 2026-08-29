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
                <defs>
                    <mask id="selected-pin-mask">
                        <rect width="${width}" height="${height}" fill="#ffffff" />
                        <circle cx="32" cy="28" r="8" fill="#000000" />
                    </mask>
                </defs>
                <ellipse cx="32" cy="62" rx="4" ry="1.5" fill="${EXPLORE_SELECTED_PIN_COLOR}" fill-opacity="0.42">
                    <animate attributeName="rx" values="4;30" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="ry" values="1.5;8" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="fill-opacity" values="0.42;0" dur="1.8s" repeatCount="indefinite" />
                </ellipse>
                <ellipse cx="32" cy="62" rx="4" ry="1.5" fill="${EXPLORE_SELECTED_PIN_COLOR}" fill-opacity="0.34">
                    <animate attributeName="rx" values="4;30" dur="1.8s" begin="0.9s" repeatCount="indefinite" />
                    <animate attributeName="ry" values="1.5;8" dur="1.8s" begin="0.9s" repeatCount="indefinite" />
                    <animate attributeName="fill-opacity" values="0.34;0" dur="1.8s" begin="0.9s" repeatCount="indefinite" />
                </ellipse>
                <g>
                    <animateTransform attributeName="transform" type="translate" values="0 0;0 -7;0 2;0 0" keyTimes="0;0.4;0.72;1" dur="0.44s" repeatCount="1" />
                    <path d="${SELECTED_PHOTO_PIN_PATH}" fill="${EXPLORE_SELECTED_PIN_COLOR}" mask="url(#selected-pin-mask)" />
                </g>
            </svg>
        `.trim();

        return {
            ...getSvgIcon(maps, { svg, width, height, anchorX: 32, anchorY: 62 }),
            fillColor: EXPLORE_SELECTED_PIN_COLOR,
            strokeColor: EXPLORE_SELECTED_PIN_COLOR,
            strokeWeight: 0,
            scale: width / 48
        };
    }

    const width = isCluster ? size + 6 : 28;
    const height = isCluster ? size + 12 : 36;
    const color = isCluster ? EXPLORE_CLUSTER_PIN_COLOR : EXPLORE_PHOTO_PIN_COLOR;
    const path = isCluster ? CLUSTER_PIN_PATH : PHOTO_PIN_PATH;
    const anchorX = isCluster ? 17 : 14;
    const anchorY = isCluster ? 41 : 35;
    const maskId = isCluster ? 'cluster-pin-mask' : 'photo-pin-mask';
    const hole = isCluster
        ? '<circle cx="17" cy="16.5" r="5.6" fill="#000000" />'
        : '<circle cx="14" cy="14" r="5.2" fill="#000000" />';
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <defs>
                <mask id="${maskId}">
                    <rect width="${width}" height="${height}" fill="#ffffff" />
                    ${hole}
                </mask>
            </defs>
            <path d="${path}" fill="${color}" mask="url(#${maskId})" />
        </svg>
    `.trim();

    return {
        ...getSvgIcon(maps, { svg, width, height, anchorX, anchorY }),
        fillColor: color,
        strokeColor: color,
        strokeWeight: 0,
        scale: width / 48
    };
}
