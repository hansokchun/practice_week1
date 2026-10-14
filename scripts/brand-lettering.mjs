export async function renderBrandLettering(font, text, size, color, sharp) {
    if (!Number.isFinite(size) || size <= 0) throw new Error('Lettering size must be positive.');
    const run = font.layout(text);
    const scale = size / font.unitsPerEm;
    const bounds = { left: Infinity, right: -Infinity, top: -Infinity, bottom: Infinity };
    let pen = 0;
    const paths = run.glyphs.map((glyph, index) => {
        if (!glyph.id) throw new Error(`Missing glyph: ${text}`);
        const position = run.positions[index];
        const x = pen + position.xOffset;
        const y = position.yOffset;
        pen += position.xAdvance;
        if (!glyph.path.commands.length) return '';
        bounds.left = Math.min(bounds.left, x + glyph.bbox.minX);
        bounds.right = Math.max(bounds.right, x + glyph.bbox.maxX);
        bounds.top = Math.max(bounds.top, y + glyph.bbox.maxY);
        bounds.bottom = Math.min(bounds.bottom, y + glyph.bbox.minY);
        return `<path transform="translate(${x} ${y})" d="${glyph.path.toSVG()}"/>`;
    }).join('');
    if (!Number.isFinite(bounds.left)) throw new Error('Lettering needs visible glyphs.');
    const width = Math.ceil((bounds.right - bounds.left) * scale) + 4;
    const height = Math.ceil((bounds.top - bounds.bottom) * scale) + 4;
    // Font outlines prevent system-font substitution and keep spaces as real glyph advances.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g fill="${color}" transform="translate(${2 - bounds.left * scale} ${2 + bounds.top * scale}) scale(${scale} ${-scale})">${paths}</g></svg>`;
    return { bytes: await sharp(Buffer.from(svg)).png().toBuffer(), width, height };
}
