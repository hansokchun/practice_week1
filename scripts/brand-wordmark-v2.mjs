const variants = {
    horizontal: { width: 1024, height: 400, symbolSize: 350, brandSize: 216,
        descriptorSize: 56, tracking: 2.8, gap: 44, labelGap: 24, minimumWidth: 280 },
    stacked: { width: 640, height: 720, symbolSize: 340, brandSize: 196,
        descriptorSize: 48, tracking: 2.4, gap: 36, labelGap: 24, minimumWidth: 180 },
    compact: { width: 560, height: 220, symbolSize: 160, brandSize: 116,
        descriptorSize: 0, tracking: 0, gap: 24, labelGap: 0, minimumWidth: 104 }
};

export const WORDMARK_V2 = Object.freeze({
    version: '2.1', text: '이끼 · 장소 저장소', name: '이끼', descriptor: '장소 저장소',
    colors: Object.freeze({ teal: '#245457', white: '#ffffff', light: '#f9f7f2',
        dark: '#003637', ink: '#191c1c', muted: '#70787d', line: '#dedfdc' }),
    master: Object.freeze({ width: 1254, height: 1254,
        bounds: Object.freeze({ left: 103, top: 79, width: 1079, height: 1109 }) }),
    variants: Object.freeze(Object.fromEntries(Object.entries(variants)
        .map(([id, definition]) => [id, Object.freeze(definition)])))
});

export function getWordmarkV2Layout(id, { brand, descriptor }) {
    const definition = WORDMARK_V2.variants[id];
    if (!definition) throw new Error(`Unknown wordmark layout: ${id}`);
    const { width, height, symbolSize, gap, labelGap } = definition;
    const scale = symbolSize / WORDMARK_V2.master.width;
    const source = WORDMARK_V2.master.bounds;
    const artwork = { x: source.left * scale, y: source.top * scale,
        width: source.width * scale, height: source.height * scale };
    const hasDescriptor = id !== 'compact';
    const textWidth = Math.max(brand.width, hasDescriptor ? descriptor.width : 0);
    const textHeight = brand.height + (hasDescriptor ? descriptor.height + labelGap : 0);
    let symbolX, symbolY, brandX, brandY, descriptorX, descriptorY;
    if (id === 'stacked') {
        const totalHeight = artwork.height + gap + textHeight;
        const top = (height - totalHeight) / 2;
        symbolX = (width - artwork.width) / 2 - artwork.x;
        symbolY = top - artwork.y;
        brandX = (width - brand.width) / 2;
        brandY = top + artwork.height + gap;
        descriptorX = (width - descriptor.width) / 2;
        descriptorY = brandY + brand.height + labelGap;
    } else {
        const left = (width - artwork.width - gap - textWidth) / 2;
        symbolX = left - artwork.x;
        symbolY = (height - artwork.height) / 2 - artwork.y;
        brandX = left + artwork.width + gap;
        descriptorX = brandX;
        descriptorY = (height - textHeight) / 2;
        brandY = hasDescriptor ? descriptorY + descriptor.height + labelGap
            : (height - brand.height) / 2;
    }
    const layout = { width, height,
        symbol: { x: symbolX, y: symbolY, width: symbolSize, height: symbolSize },
        symbolArtwork: { ...artwork, x: symbolX + artwork.x, y: symbolY + artwork.y },
        brand: { x: brandX, y: brandY, ...brand },
        descriptor: hasDescriptor ? { x: descriptorX, y: descriptorY, ...descriptor } : null };
    for (const box of [layout.symbol, layout.brand, layout.descriptor].filter(Boolean)) {
        if (![box.x, box.y, box.width, box.height].every(Number.isFinite)
            || box.width <= 0 || box.height <= 0 || box.x < 0 || box.y < 0
            || box.x + box.width > width || box.y + box.height > height) {
            throw new Error(`Wordmark artwork exceeds its canvas: ${id}`);
        }
    }
    return layout;
}
