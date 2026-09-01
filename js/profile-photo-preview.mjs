function hashText(value = '') {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function getProfilePhotoPreview(photos = [], { seed = '', limit = 7 } = {}) {
    const safeLimit = Math.max(0, Number(limit) || 0);
    return [...photos]
        .sort((left, right) => {
            const leftKey = left?.id || left?.localId || left?.url || '';
            const rightKey = right?.id || right?.localId || right?.url || '';
            return hashText(`${seed}:${leftKey}`) - hashText(`${seed}:${rightKey}`);
        })
        .slice(0, safeLimit);
}
