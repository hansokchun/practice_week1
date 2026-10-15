import { geoBounds, geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-50m.json' with { type: 'json' };
import { hasUsablePhotoLocation } from './photo-location.mjs';
import { getLocationPrecisionLabel } from './photo-location-privacy.mjs';

const countries = feature(world, world.objects.countries);
export const MAX_ALBUM_DOWNLOAD_BYTES = 32 * 1024 * 1024;
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const located = photo => photo.lat !== '' && photo.lng !== '' && hasUsablePhotoLocation(photo);

export function createAlbumDownloadPlan(album, photos, viewerId) {
    const own = Boolean(viewerId) && album?.owner_id === viewerId;
    if (!album?.id || (!own && !['public', 'link'].includes(album.visibility))) throw Error('볼 수 없는 앨범입니다.');
    const seen = new Set();
    const members = photos.filter(photo => {
        const member = photo.album_id ? photo.album_id === album.id : Boolean(album.title) && photo.album === album.title;
        const visible = own || (photo.visibility ? ['public', 'link'].includes(photo.visibility) : photo.shared === true);
        if (!photo.id || seen.has(photo.id) || photo.owner_id !== album.owner_id || !member || !visible) return false;
        seen.add(photo.id);
        return true;
    });
    const name = String(album.title || '이끼-앨범').normalize('NFKC').trim()
        .replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^[.-]+|[.-]+$/g, '').slice(0, 72) || '이끼-앨범';
    return { photos: members, fileName: `${name}.html` };
}

export function renderOfflineAlbumMap(photos) {
    const points = photos.map((photo, index) => ({ photo, number: index + 1 })).filter(({ photo }) => located(photo));
    if (!points.length) return '<p class="map-empty">위치가 저장된 사진이 없습니다.</p>';
    const geometry = { type: 'MultiPoint', coordinates: points.map(({ photo }) => [Number(photo.lng), Math.max(-85, Math.min(85, Number(photo.lat)))]) };
    const [[west], [east]] = geoBounds(geometry);
    const middle = (west + (east < west ? east + 360 : east)) / 2;
    const projection = geoMercator().rotate([-middle, 0]).fitExtent([[75, 75], [1525, 825]], geometry);
    // Coincident photos still need a useful regional frame, not infinite zoom.
    const scale = projection.scale();
    if (!Number.isFinite(scale) || scale > 24000) {
        const latitude = geometry.coordinates.reduce((sum, p) => sum + p[1], 0) / points.length;
        projection.scale(24000).translate([800, 450]);
        const center = projection([middle, latitude]);
        projection.translate([1600 - center[0], 900 - center[1]]);
    }
    projection.clipExtent([[0, 0], [1600, 900]]);
    const path = geoPath(projection);
    const groups = new Map();
    for (const point of points) {
        const [x, y] = projection([Number(point.photo.lng), Math.max(-85, Math.min(85, Number(point.photo.lat)))]);
        const key = `${Math.round(x / 30)}:${Math.round(y / 30)}`;
        if (!groups.has(key)) groups.set(key, { x, y, numbers: [] });
        groups.get(key).numbers.push(point.number);
    }
    const markers = [...groups.values()].map(({ x, y, numbers }) => `<a href="#photo-${numbers[0]}"><title>사진 ${numbers.join(', ')}</title><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="22" fill="#1a4d4e" stroke="white" stroke-width="3"/><text x="${x.toFixed(2)}" y="${(y + 6).toFixed(2)}" text-anchor="middle" fill="white" font-size="18">${numbers.length > 1 ? `${numbers.length}장` : numbers[0]}</text></a>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-label="앨범 사진 위치 지도"><rect width="1600" height="900" fill="#e5f0f1"/><g fill="#f0f0e9" stroke="#9aabaa" stroke-width="1.4">${countries.features.map(country => `<path d="${path(country) || ''}"/>`).join('')}</g>${markers}<text x="24" y="875" fill="#435959" font-size="17">Natural Earth · 사진 좌표 기반 위치 지도 · 도로 지도 아님</text></svg>`;
}

function formatDate(value) {
    if (!value || !Number.isFinite(new Date(value).getTime())) return '-- --';
    return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(value));
}

export async function createOfflineAlbum({
    album, photos, viewerId, loadPhoto, onProgress = () => {}, assertActive = () => {},
    storyMap = new Map(), maxBytes = MAX_ALBUM_DOWNLOAD_BYTES
}) {
    const plan = createAlbumDownloadPlan(album, photos, viewerId);
    if (!plan.photos.length) throw Error('저장할 사진이 없습니다.');
    const articles = [];
    let bytes = 0;
    for (const [index, photo] of plan.photos.entries()) {
        assertActive();
        const dataUrl = await loadPhoto(photo);
        assertActive();
        if (typeof dataUrl !== 'string' || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)) throw Error('저장할 사진 형식을 확인하지 못했습니다.');
        bytes += dataUrl.length;
        if (bytes > maxBytes) throw Error('앨범 저장 용량을 초과했습니다. 사진을 나눠 앨범으로 저장해주세요.');
        const number = index + 1;
        const position = located(photo)
            ? `${Number(photo.lat).toFixed(5)}, ${Number(photo.lng).toFixed(5)} · ${getLocationPrecisionLabel(photo.location_precision)}` : '위치 없음';
        articles.push(`<article id="photo-${number}"><header><span class="number">${number}</span><div><h2>${escape(photo.title || photo.description || `사진 ${number}`)}</h2><p>${formatDate(photo.date)} · ${escape(position)}</p></div><a href="#album-map" aria-label="사진 위치 지도로 돌아가기">↑ 지도</a></header><img src="${dataUrl}" alt="${escape(photo.description || `사진 ${number}`)}" loading="lazy" decoding="async">${photo.description && photo.title ? `<p class="note">${escape(photo.description)}</p>` : ''}${storyMap.get(String(photo.id)) ? `<p class="note">${escape(storyMap.get(String(photo.id)))}</p>` : ''}</article>`);
        onProgress({ completed: number, total: plan.photos.length });
    }
    assertActive();
    const map = renderOfflineAlbumMap(plan.photos);
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'"><title>${escape(album.title || '이끼 앨범')}</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f9f7f2;color:#192727;font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;line-height:1.7;letter-spacing:0}main{max-width:1440px;margin:auto;padding:48px 32px}h1{font-size:32px;margin:8px 0;overflow-wrap:anywhere}h2{font-size:20px;margin:0;overflow-wrap:anywhere}.brand{color:#1a4d4e;font-weight:700}.intro{max-width:760px;white-space:pre-wrap;overflow-wrap:anywhere}.meta,header p,footer{color:#596b6a;font-size:14px}.map{margin:32px 0 48px;scroll-margin-top:24px}.map svg{display:block;width:100%;height:auto;aspect-ratio:16/9;border:1px solid #bccfce;border-radius:6px}.map h2{margin-bottom:12px}.map-empty{padding:80px 24px;background:#e9eeeb;text-align:center}.photos{max-width:1080px;margin:auto}article{margin:0 0 64px;scroll-margin-top:24px}article header{display:flex;align-items:flex-start;gap:16px;margin-bottom:16px}article header div{flex:1;min-width:0}article header p{margin:4px 0 0}article a{color:#1a4d4e;white-space:nowrap}.number{display:grid;place-items:center;background:#1a4d4e;color:white;width:36px;height:36px;flex-shrink:0;border-radius:50%;font-weight:700}article img{display:block;width:100%;max-height:900px;object-fit:contain;background:#e8ece8}.note{white-space:pre-wrap;overflow-wrap:anywhere}footer{border-top:1px solid #ccd7d3;padding:24px 0}a{color:#1a4d4e}@media(max-width:600px){main{padding:28px 16px}h1{font-size:26px}h2{font-size:18px}article{margin-bottom:40px}article header{gap:10px}article header p{font-size:12px}.map{margin:24px 0 32px}.map svg{min-height:300px;object-fit:contain}}@media print{@page{size:A4 landscape;margin:12mm}body{background:white}main{padding:0;max-width:none}.map{break-after:page;margin:12px 0}.map svg{width:100%;max-height:155mm}.photos{max-width:none}article{break-inside:avoid;break-after:page;margin:0}article img{max-height:155mm}article header a{display:none}footer{break-before:avoid}}
</style></head><body><main><span class="brand">Ikkyee · 장소 아카이브</span><h1>${escape(album.title || '나의 앨범')}</h1>${album.note ? `<p class="intro">${escape(album.note)}</p>` : ''}<p class="meta">사진 ${plan.photos.length}장 · 위치 ${plan.photos.filter(located).length}장 · 오프라인 보관본</p><section class="map" id="album-map"><h2>사진 위치 지도</h2>${map}</section><section class="photos">${articles.join('')}</section><footer>이끼에서 보관한 앨범 · 지도 데이터: Natural Earth (Public Domain)<br>사진과 위치를 포함한 파일입니다. 파일을 전달하면 비공개 사진과 위치도 함께 전달됩니다.</footer></main></body></html>`;
    if (new TextEncoder().encode(html).byteLength > maxBytes) throw Error('앨범 저장 용량을 초과했습니다. 사진을 나눠 앨범으로 저장해주세요.');
    return { html, fileName: plan.fileName, count: plan.photos.length };
}
