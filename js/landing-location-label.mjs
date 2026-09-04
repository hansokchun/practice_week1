const REGION_SUFFIX_PATTERN = /(?:특별자치도|특별자치시|특별시|광역시|자치도)$/u;
const KOREAN_PROVINCE_PATTERN = /^(경기|강원|충청북|충청남|전라북|전라남|경상북|경상남|제주)도$/u;

function normalizeLocationPart(value) {
    return String(value || '')
        .trim()
        .replace(REGION_SUFFIX_PATTERN, '')
        .replace(KOREAN_PROVINCE_PATTERN, '$1')
        .trim();
}

export function normalizeLandingHeroLocationLabel(value) {
    const parts = String(value || '')
        .split(/[\s,·/|>]+/u)
        .map(normalizeLocationPart)
        .filter(Boolean)
        .filter((part, index, items) => items.indexOf(part) === index)
        .slice(0, 2);
    return parts.join(' · ');
}
