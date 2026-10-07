// Build-only adaptation of pinned piexifjs 1.0.6; keep its MIT header and tag types.
export function compactPiexifForPhotoDownload(source) {
    function removeBetween(start, end) {
        const from = source.indexOf(start);
        const to = source.indexOf(end, from + start.length);
        if (from < 0 || to < 0 || source.indexOf(start, from + start.length) !== -1) {
            throw new Error('Unsupported piexif source structure');
        }
        source = source.slice(0, from) + source.slice(to);
    }
    removeBetween('    that.remove = function', '    that.insert = function');
    removeBetween('    that.InteropIFD = {', '    if (typeof exports');
    source = source.replace(/^    that\.version = "1\.0\.4";\r?\n/m, '');
    if (/that\.(?:remove|GPSHelper|InteropIFD)\b/.test(source)) {
        throw new Error('Unsupported piexif helper dependency');
    }
    for (const [name, keys] of [['ImageIFD', ['ExifTag', 'GPSTag']], ['ExifIFD', ['InteroperabilityTag']]]) {
        const pattern = new RegExp(`    that\\.${name} = \\{[\\s\\S]*?^    \\};`, 'm');
        const declaration = source.match(pattern)?.[0];
        if (!declaration) throw new Error('Unsupported piexif constants');
        const entries = keys.map(key => {
            const value = declaration.match(new RegExp(`\\b${key}:\\s*(\\d+)`))?.[1];
            if (!value) throw new Error('Unsupported piexif constant');
            return `${key}:${value}`;
        });
        const remainder = source.replace(declaration, '');
        const references = [...remainder.matchAll(new RegExp(`that\\.${name}\\.(\\w+)`, 'g'))];
        if (references.some(match => !keys.includes(match[1]))) throw new Error('Unsupported piexif constant dependency');
        source = source.replace(declaration, `    that.${name} = {${entries.join(',')}};`);
    }
    const from = source.indexOf('    var TAGS = {');
    const to = source.indexOf('    TAGS["0th"]', from);
    if (from < 0 || to < 0) throw new Error('Unsupported piexif tag structure');
    const tags = source.slice(from, to);
    const compactTags = tags.replace(/'name': '[^']*',\s*/g, '');
    if (tags === compactTags) throw new Error('Unsupported piexif tag labels');
    return source.slice(0, from) + compactTags + source.slice(to);
}

export function compactPiexifPlugin() {
    return {
        name: 'compact-piexif-photo-download',
        enforce: 'pre',
        apply: 'build',
        transform(source, id) {
            if (!id.replaceAll('\\', '/').endsWith('/piexifjs/piexif.js')) return;
            return { code: compactPiexifForPhotoDownload(source), map: null };
        }
    };
}
