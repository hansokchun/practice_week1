export function getWordmarkLayout({ width, symbol, lettering, gap, side }) {
    if (!['left', 'right'].includes(side)) throw new Error('Unsupported symbol side.');
    if (!Number.isFinite(gap) || gap < 0) throw new Error('Wordmark gap must be nonnegative.');
    const contentWidth = symbol.width + gap + lettering.width;
    if (!Number.isFinite(width) || contentWidth > width) throw new Error('Artwork exceeds its canvas.');
    const start = Math.round((width - contentWidth) / 2);
    const symbolStart = side === 'left' ? start : start + lettering.width + gap;
    const textStart = side === 'left' ? start + symbol.width + gap : start;
    return { symbolLeft: symbolStart - symbol.left, textLeft: textStart - lettering.left };
}
