export const EXPLORE_PHOTO_PIN_COLOR = '#0f5856';
export const EXPLORE_CLUSTER_PIN_COLOR = '#174f45';
export const EXPLORE_SELECTED_PIN_COLOR = '#e37a57';

const LEAF_HIGHLIGHT = '#f5f0df';
const CLUSTER_SECONDARY_COLOR = '#78a67d';

function encodeSvg(svg) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function makePoint(maps, x, y) {
    return new maps.Point(x, y);
}

function makeSize(maps, width, height) {
    return maps.Size ? new maps.Size(width, height) : { width, height };
}

function getSvgIcon(maps, { svg, width, height, anchorX, anchorY, color }) {
    return {
        url: encodeSvg(svg),
        scaledSize: makeSize(maps, width, height),
        anchor: makePoint(maps, anchorX, anchorY),
        fillColor: color,
        strokeColor: color,
        strokeWeight: 0,
        scale: width / 48
    };
}

function getPhotoLeafSvg(color) {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
            <ellipse cx="18" cy="42" rx="4.5" ry="1.4" fill="#163d36" fill-opacity="0.2" />
            <g id="ikkyee-leaf-pin">
                <path class="leaf-stem" d="M18 31.5C17.5 35.5 17.5 39.5 18 42" fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round" />
                <path class="leaf-shape" d="M17 32C7 27 7 14 29 6C31 20 26 29 17 32Z" fill="${color}" />
                <path class="leaf-vein" d="M17 32C19 22 23 14 28 8" fill="none" stroke="${LEAF_HIGHLIGHT}" stroke-opacity="0.78" stroke-width="1.5" stroke-linecap="round" />
                <path d="M20 25C22.5 22.5 25 20.5 28 19" fill="none" stroke="${LEAF_HIGHLIGHT}" stroke-opacity="0.42" stroke-width="1.1" stroke-linecap="round" />
            </g>
        </svg>
    `.trim();
}

function getClusterLeafSvg() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
            <ellipse cx="22" cy="46" rx="6" ry="1.5" fill="#163d36" fill-opacity="0.22" />
            <g id="ikkyee-leaf-cluster">
                <path class="leaf-stem" d="M22 35C21.5 39 21.5 43 22 46M24 37C23 40 22.5 43 22 46" fill="none" stroke="${EXPLORE_CLUSTER_PIN_COLOR}" stroke-width="3" stroke-linecap="round" />
                <path class="leaf-shape" d="M21 36C8 29 8 13 35 5C38 22 32 33 21 36Z" fill="${EXPLORE_CLUSTER_PIN_COLOR}" />
                <path class="leaf-vein" d="M21 36C24 24 29 14 34 7" fill="none" stroke="${LEAF_HIGHLIGHT}" stroke-opacity="0.78" stroke-width="1.6" stroke-linecap="round" />
                <path class="leaf-shape leaf-shape--small" d="M24 37C27 27 34 22 44 23C42 35 35 39 24 37Z" fill="${CLUSTER_SECONDARY_COLOR}" />
                <path d="M25 37C31 32 36 28 42 25" fill="none" stroke="${LEAF_HIGHLIGHT}" stroke-opacity="0.72" stroke-width="1.25" stroke-linecap="round" />
            </g>
        </svg>
    `.trim();
}

function getSelectedLeafSvg() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="68" viewBox="0 0 56 68">
            <ellipse cx="28" cy="62" rx="4" ry="1.5" fill="${EXPLORE_SELECTED_PIN_COLOR}" fill-opacity="0.34">
                <animate attributeName="rx" values="4;24" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="ry" values="1.5;6" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="fill-opacity" values="0.34;0" dur="1.8s" repeatCount="indefinite" />
            </ellipse>
            <g id="ikkyee-leaf-selected">
                <animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 1;0 0" keyTimes="0;0.4;0.72;1" dur="0.42s" repeatCount="1" />
                <path class="leaf-stem" d="M28 52C27.5 56 27.5 59.5 28 62" fill="none" stroke="${EXPLORE_SELECTED_PIN_COLOR}" stroke-width="4" stroke-linecap="round" />
                <path class="leaf-shape" d="M27 54C10 45 10 24 43 10C47 32 40 49 27 54Z" fill="${EXPLORE_SELECTED_PIN_COLOR}" />
                <path class="leaf-vein" d="M27 54C31 38 37 23 42 13" fill="none" stroke="${LEAF_HIGHLIGHT}" stroke-opacity="0.82" stroke-width="2" stroke-linecap="round" />
                <path d="M33 41C36 37 39 34 43 32" fill="none" stroke="${LEAF_HIGHLIGHT}" stroke-opacity="0.45" stroke-width="1.5" stroke-linecap="round" />
            </g>
        </svg>
    `.trim();
}

export function getExplorePinSymbolIcon(maps, { type = 'photo', selected = false } = {}) {
    if (selected) {
        return getSvgIcon(maps, {
            svg: getSelectedLeafSvg(),
            width: 56,
            height: 68,
            anchorX: 28,
            anchorY: 62,
            color: EXPLORE_SELECTED_PIN_COLOR
        });
    }

    if (type === 'cluster') {
        return getSvgIcon(maps, {
            svg: getClusterLeafSvg(),
            width: 48,
            height: 48,
            anchorX: 22,
            anchorY: 46,
            color: EXPLORE_CLUSTER_PIN_COLOR
        });
    }

    return getSvgIcon(maps, {
        svg: getPhotoLeafSvg(EXPLORE_PHOTO_PIN_COLOR),
        width: 36,
        height: 44,
        anchorX: 18,
        anchorY: 42,
        color: EXPLORE_PHOTO_PIN_COLOR
    });
}
