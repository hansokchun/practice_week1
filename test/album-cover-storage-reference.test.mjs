import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { getPhotoStoragePath } from '../js/photo-storage.mjs';

const source=readFileSync('auth.js','utf8');
test('album cover persistence strips signing grants but preserves a usable viewer URL in responses', () => {
    const fn=source.match(/function getCanonicalAlbumCoverUrl[\s\S]*?\n}/)?.[0];
    assert.ok(fn);
    const canonical=runInNewContext(`${fn};getCanonicalAlbumCoverUrl`,{getPhotoStoragePath});
    const client={storage:{from:bucket=>({getPublicUrl:path=>({data:{publicUrl:`https://project.supabase.co/storage/v1/object/public/${bucket}/${path}`}})})}};
    const signed='https://project.supabase.co/storage/v1/object/sign/photos/owner/previews/photo.jpg?token=private-access-grant';
    assert.equal(canonical(client,signed),'https://project.supabase.co/storage/v1/object/public/photos/owner/previews/photo.jpg');
    assert.equal(canonical(client,''),null);
    assert.equal(canonical(client,'/images/fallback.jpg'),'/images/fallback.jpg');
    assert.match(source,/cover_url: getCanonicalAlbumCoverUrl\(sb, coverUrl\)/);
});
