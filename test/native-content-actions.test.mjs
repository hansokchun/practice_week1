import assert from 'node:assert/strict';
import { test } from 'node:test';
import { saveNativePhoto, shareNativeContent } from '../js/native-content-actions.mjs';

const native = { isNativePlatform: () => true };
const web = { isNativePlatform: () => false };
const content = { title: '서울 여행', description: '여행 사진', url: 'https://ikkyee.com/share/photo/photo-1?v=2' };

function createPlugins(overrides = {}) {
    const calls = [];
    return {
        calls,
        capacitor: native,
        loadShare: async () => ({ share: async (options) => { calls.push(['share', options]); return { activityType: 'chosen-app' }; } }),
        loadFilesystem: async () => ({
            Directory: { Cache: 'CACHE' },
            Filesystem: {
                writeFile: async (options) => { calls.push(['write', options]); },
                getUri: async (options) => { calls.push(['uri', options]); return { uri: `file:///cache/${options.path}` }; },
                deleteFile: async (options) => { calls.push(['delete', options]); }
            }
        }),
        ...overrides
    };
}

test('web actions leave the existing browser share and download behavior available', async () => {
    const neverLoad = async () => { throw new Error('native plugin must not load'); };
    const options = { capacitor: web, loadShare: neverLoad, loadFilesystem: neverLoad };
    assert.deepEqual(await shareNativeContent(content, options), { handled: false, data: null, error: null });
    assert.deepEqual(await saveNativePhoto(new Blob(['photo'], { type: 'image/jpeg' }), 'photo.jpg', options), { handled: false, data: null, error: null });
});

test('native public link share supplies all OS share fields and omits internal content properties', async () => {
    const plugins = createPlugins();
    const result = await shareNativeContent({ ...content, text: '함께 보는 사진', privateKey: 'never-shared' }, plugins);
    assert.equal(result.handled, true);
    assert.equal(result.error, null);
    assert.equal(result.data.status, 'shared');
    assert.deepEqual(plugins.calls, [['share', {
        title: '서울 여행', text: '함께 보는 사진', url: content.url, dialogTitle: '공유하기'
    }]]);
});

test('production and dev album/photo links can be shared', async () => {
    for (const url of [
        'https://ikkyee.com/share/photo/photo-1?v=2&cover=123',
        'https://ikkyee.com/share/album/album-1?v=2',
        'https://dev.practice-week1-cws.pages.dev/share/photo/photo-1?v=2',
        'https://dev.practice-week1-cws.pages.dev/share/album/album-1?v=2'
    ]) assert.equal((await shareNativeContent({ ...content, url }, createPlugins())).error, null);
});

test('native share refuses external links, credentials, ports, fragments and non-content paths', async () => {
    for (const url of [
        'http://ikkyee.com/share/photo/photo-1',
        'javascript:alert(1)',
        'https://other.example/share/photo/photo-1',
        'https://ikkyee.com.other.example/share/photo/photo-1',
        'https://user@ikkyee.com/share/photo/photo-1',
        'https://ikkyee.com:443/share/photo/photo-1',
        'https://ikkyee.com:8443/share/photo/photo-1',
        'https://ikkyee.com/share/photo/photo-1#access_token=private',
        'https://ikkyee.com/share/photo/photo-1?access_token=private',
        'https://ikkyee.com/share/photo/photo-1?token_hash=private',
        'https://ikkyee.com/share/photo/photo-1?Authorization=private',
        'https://ikkyee.com/api/config',
        'https://ikkyee.com/share/photo/',
        'https://ikkyee.com/share/photo/../private',
        'https://ikkyee.com/share/photo/%2fprivate',
        ' https://ikkyee.com/share/photo/photo-1',
        null
    ]) {
        const plugins = createPlugins();
        const result = await shareNativeContent({ ...content, url }, plugins);
        assert.equal(result.handled, true);
        assert.equal(result.error.code, 'NATIVE_SHARE_URL', String(url));
        assert.deepEqual(plugins.calls, []);
    }
});

test('share cancellation is an ordinary closed dialog; provider failures remain generic', async () => {
    for (const error of [new Error('Share canceled'), new Error('Share cancelled'), { name: 'AbortError' }, { code: 'USER_CANCELLED' }]) {
        const result = await shareNativeContent(content, createPlugins({ loadShare: async () => ({ share: async () => { throw error; } }) }));
        assert.equal(result.error, null);
        assert.equal(result.data.status, 'cancelled');
    }
    const result = await shareNativeContent(content, createPlugins({ loadShare: async () => { throw new Error('private plugin path and token'); } }));
    assert.equal(result.error.code, 'NATIVE_SHARE_FAILED');
    assert.doesNotMatch(result.error.message, /private|plugin|token/);
});

test('photo bytes are written as base64 in the cache and shared by the resulting file URI', async () => {
    const plugins = createPlugins();
    const blob = new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' });
    const result = await saveNativePhoto(blob, '서울-여행.jpg', plugins);
    assert.equal(result.handled, true);
    assert.equal(result.error, null);
    assert.equal(result.data.status, 'shared');
    assert.equal(result.data.fileName, '서울-여행.jpg');
    const write = plugins.calls.find(([type]) => type === 'write')[1];
    assert.equal(write.data, '/9j/2Q==');
    assert.equal(write.directory, 'CACHE');
    assert.equal(write.recursive, true);
    assert.equal('encoding' in write, false);
    assert.match(write.path, /^downloads\/[A-Za-z0-9-]+\/서울-여행\.jpg$/u);
    assert.deepEqual(plugins.calls.find(([type]) => type === 'uri')[1], { path: write.path, directory: 'CACHE' });
    const share = plugins.calls.find(([type]) => type === 'share')[1];
    assert.deepEqual(share.files, [`file:///cache/${write.path}`]);
    assert.equal(share.dialogTitle, '사진 저장 또는 공유');
    assert.equal(share.url, undefined);
    assert.equal(plugins.calls.some(([type]) => type === 'delete'), false);
});

test('filename normalization preserves Korean, strips traversal and controls, and stays bounded', async () => {
    for (const fileName of ['../../서울\\사진\u0000?.jpg', '.hidden.jpg', 'ｓｅｏｕｌ.jpg', `${'가'.repeat(300)}.jpg`, '', '...']) {
        const plugins = createPlugins({ readBlob: async () => 'cGhvdG8=' });
        const result = await saveNativePhoto(new Blob(['photo'], { type: 'image/jpeg' }), fileName, plugins);
        assert.equal(result.error, null);
        assert.match(result.data.fileName, /^[A-Za-z0-9가-힣][A-Za-z0-9가-힣._-]*\.jpg$/u);
        assert.ok(Buffer.byteLength(result.data.fileName, 'utf8') <= 160);
        const write = plugins.calls.find(([type]) => type === 'write')[1];
        assert.equal(write.path.split('/').length, 3);
        assert.equal(write.path.includes('..'), false);
    }
});

test('PNG and WebP download plans retain their actual image format', async () => {
    for (const [mime, extension] of [['image/png', 'png'], ['image/webp', 'webp']]) {
        const result = await saveNativePhoto(new Blob(['photo'], { type: mime }), '서울.jpg', createPlugins());
        assert.equal(result.error, null);
        assert.equal(result.data.fileName, `서울.${extension}`);
    }
});

test('files over 50 MiB, empty content and unsupported media are rejected before reading or loading plugins', async () => {
    let touched = false;
    const options = createPlugins({
        readBlob: async () => { touched = true; },
        loadFilesystem: async () => { touched = true; },
        loadShare: async () => { touched = true; }
    });
    for (const blob of [
        { size: 50 * 1024 * 1024 + 1, type: 'image/jpeg' },
        new Blob([], { type: 'image/jpeg' }),
        new Blob(['html'], { type: 'text/html' }),
        null
    ]) {
        const result = await saveNativePhoto(blob, 'photo.jpg', options);
        assert.equal(result.handled, true);
        assert.ok(result.error);
        assert.equal(touched, false);
    }
});

test('injected Blob reader can return a data URL but malformed encoded bytes cannot be written', async () => {
    const blob = new Blob(['photo'], { type: 'image/jpeg' });
    const success = await saveNativePhoto(blob, 'photo.jpg', createPlugins({ readBlob: async () => 'data:image/jpeg;base64,cGhvdG8=' }));
    assert.equal(success.error, null);
    for (const value of ['not encoded', 'data:text/html;base64,cGhvdG8=', 'cGhvdG8=\n', '']) {
        const plugins = createPlugins({ readBlob: async () => value });
        const result = await saveNativePhoto(blob, 'photo.jpg', plugins);
        assert.equal(result.error.code, 'NATIVE_PHOTO_READ');
        assert.equal(plugins.calls.some(([type]) => type === 'write'), false);
    }
});

test('mobile FileReader data URLs are converted to native binary base64', async () => {
    const previousReader = globalThis.FileReader;
    globalThis.FileReader = class {
        readAsDataURL(blob) {
            this.result = `data:${blob.type};base64,cGhvdG8=`;
            this.onload();
        }
    };
    try {
        const plugins = createPlugins();
        const result = await saveNativePhoto(new Blob(['photo'], { type: 'image/jpeg' }), 'photo.jpg', plugins);
        assert.equal(result.error, null);
        assert.equal(plugins.calls.find(([type]) => type === 'write')[1].data, 'cGhvdG8=');
    } finally {
        if (previousReader === undefined) delete globalThis.FileReader;
        else globalThis.FileReader = previousReader;
    }
});

test('download cache paths do not overwrite files with the same visible name', async () => {
    const plugins = createPlugins();
    const blob = new Blob(['photo'], { type: 'image/jpeg' });
    await saveNativePhoto(blob, 'photo.jpg', plugins);
    await saveNativePhoto(blob, 'photo.jpg', plugins);
    const paths = plugins.calls.filter(([type]) => type === 'write').map(([, options]) => options.path);
    assert.equal(new Set(paths).size, 2);
});

test('photo share cancellation retains its file for delayed recipient reads', async () => {
    const plugins = createPlugins({ loadShare: async () => ({ share: async () => { throw new Error('Share canceled'); } }) });
    const result = await saveNativePhoto(new Blob(['photo'], { type: 'image/jpeg' }), 'photo.jpg', plugins);
    assert.equal(result.error, null);
    assert.equal(result.data.status, 'cancelled');
    assert.equal(plugins.calls.some(([type]) => type === 'delete'), false);
});

test('filesystem and file-share failures never expose file URIs or provider details', async () => {
    const privateError = new Error('file:///private/path secret provider details');
    for (const overrides of [
        { readBlob: async () => { throw privateError; } },
        { loadFilesystem: async () => { throw privateError; } },
        { loadShare: async () => ({ share: async () => { throw privateError; } }) }
    ]) {
        const result = await saveNativePhoto(new Blob(['photo'], { type: 'image/jpeg' }), 'photo.jpg', createPlugins(overrides));
        assert.ok(result.error);
        assert.doesNotMatch(result.error.message, /private|secret|provider|file:/);
    }
});

test('missing local file URI prevents photo sharing and keeps plugin details hidden', async () => {
    const plugins = createPlugins();
    const load = plugins.loadFilesystem;
    plugins.loadFilesystem = async () => {
        const fs = await load();
        fs.Filesystem.getUri = async () => ({ uri: 'https://private.example/photo.jpg' });
        return fs;
    };
    const result = await saveNativePhoto(new Blob(['photo'], { type: 'image/jpeg' }), 'photo.jpg', plugins);
    assert.equal(result.error.code, 'NATIVE_PHOTO_SAVE');
    assert.equal(plugins.calls.some(([type]) => type === 'share'), false);
    assert.doesNotMatch(result.error.message, /private/);
});
