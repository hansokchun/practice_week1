const smooth = (seconds, start, duration) => {
    const t = Math.max(0, Math.min(1, (seconds - start) / duration));
    return t * t * (3 - 2 * t);
};

export function getBrandMotionProgress(seconds) {
    if (!Number.isFinite(seconds)) throw new TypeError('Motion time must be finite.');
    const symbol = smooth(seconds, 0.6, 0.55);
    const wordmark = smooth(seconds, 1.12, 0.5);
    return {
        dots: Array.from({ length: 6 }, (_, index) => smooth(seconds, 0.08 + index * 0.08, 0.18)),
        symbol, wordmark, symbolOffset: 12 * (1 - symbol), wordmarkOffset: 10 * (1 - wordmark)
    };
}

export function labelBrandDots(alpha, width, height, minDotArea = 50) {
    if (alpha.length !== width * height) throw new Error('Alpha dimensions do not match.');
    const componentIds = new Uint32Array(alpha.length);
    const queue = new Uint32Array(alpha.length);
    const components = [];
    for (let seed = 0; seed < alpha.length; seed += 1) {
        if (!alpha[seed] || componentIds[seed]) continue;
        const id = components.length + 1;
        let tail = 1;
        queue[0] = seed;
        componentIds[seed] = id;
        const component = { id, area: 0, left: width, right: 0, top: height, bottom: 0 };
        for (let head = 0; head < tail; head += 1) {
            const index = queue[head];
            const x = index % width;
            const y = Math.floor(index / width);
            component.area += 1;
            component.left = Math.min(component.left, x);
            component.right = Math.max(component.right, x);
            component.top = Math.min(component.top, y);
            component.bottom = Math.max(component.bottom, y);
            for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                const neighbor = ny * width + nx;
                if (alpha[neighbor] && !componentIds[neighbor]) {
                    componentIds[neighbor] = id;
                    queue[tail++] = neighbor;
                }
            }
        }
        components.push(component);
    }
    const dots = components.filter(part => part.area >= minDotArea
        && part.right - part.left < width / 8 && part.bottom - part.top < height / 8
        && (part.top + part.bottom) / 2 > height * 0.62)
        .sort((a, b) => b.bottom - a.bottom);
    if (dots.length !== 6) throw new Error(`Expected the approved six-dot trail, found ${dots.length}.`);
    const roles = new Map(dots.map((dot, index) => [dot.id, index + 1]));
    const labels = Uint8Array.from(componentIds, id => roles.get(id) || 0);
    return { labels, dots };
}
