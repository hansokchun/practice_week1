import { readPhotoExif } from './photo-exif-reader.mjs';
import { filterAcceptedPhotoFiles } from './photo-file-validation.mjs';
import { createGoogleMapsMarker } from './google-maps-marker.mjs';
import { hasUsableCoordinates } from './photo-location.mjs';
import { MAX_TRIAL_PHOTOS, getTrialUploadMetadata } from './photo-trial.mjs';
import { createPhotoTrialStore } from './photo-trial-store.mjs';

const SEOUL = { lat: 37.5665, lng: 126.978 };
const PERSISTENCE_MESSAGE = '브라우저 저장소를 사용할 수 없어 로그인 후 사진을 이어갈 수 없습니다. 저장소 권한을 확인해 주세요.';
const SELECTORS = [
    'file-input', 'add', 'count', 'empty', 'workspace', 'list', 'image', 'name', 'date',
    'location', 'size', 'map', 'map-message', 'map-start', 'location-save',
    'location-clear', 'continue', 'error', 'clear', 'guide'
];

function clonePhotos(photos) {
    return photos.map((photo) => ({ ...photo }));
}

function coordinateFromEvent(event) {
    const lat = typeof event?.latLng?.lat === 'function' ? event.latLng.lat() : event?.latLng?.lat;
    const lng = typeof event?.latLng?.lng === 'function' ? event.latLng.lng() : event?.latLng?.lng;
    return hasUsableCoordinates(lat, lng) ? { lat: Number(lat), lng: Number(lng) } : null;
}

function createId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createPhotoTrialController({
    root,
    store = createPhotoTrialStore(),
    readExif = readPhotoExif,
    filterFiles = filterAcceptedPhotoFiles,
    loadMaps = null,
    onContinue = async () => {},
    notify = () => {},
    onChange = () => {},
    createObjectUrl = (file) => URL.createObjectURL(file),
    revokeObjectUrl = (url) => URL.revokeObjectURL(url)
}) {
    if (!root?.querySelector) throw new TypeError('photo trial root element is required');
    const refs = Object.fromEntries(SELECTORS.map((name) => [
        name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
        root.querySelector(`[data-trial-${name}]`)
    ]));
    let photos = [];
    let selectedId = null;
    let map = null;
    let marker = null;
    let pendingCoordinates = null;
    let bound = false;
    let loaded = false;
    let active = false;
    let disposed = false;
    let revision = 0;
    let mapRequest = 0;
    let processingCount = 0;
    let continuing = false;
    let addQueue = Promise.resolve();
    let persistQueue = Promise.resolve(true);

    const selectedPhoto = () => photos.find((photo) => photo.id === selectedId) || null;
    const setError = (message = '') => { if (refs.error) refs.error.textContent = message; };
    const reportError = (error, fallback) => {
        const message = error?.message || fallback;
        setError(message);
        notify(message);
    };
    const revokePhoto = (photo) => { if (photo?.url) revokeObjectUrl(photo.url); };

    function renderMarker() {
        if (!map) return;
        marker?.setMap?.(null);
        marker = null;
        const photo = selectedPhoto();
        const coordinates = pendingCoordinates || (hasUsableCoordinates(photo?.lat, photo?.lng)
            ? { lat: photo.lat, lng: photo.lng }
            : null);
        if (coordinates) {
            marker = createGoogleMapsMarker(map.__trialMaps, {
                map,
                position: coordinates,
                draggable: true,
                title: '선택한 사진 위치'
            });
            marker.addListener?.('dragend', (event) => {
                const next = coordinateFromEvent(event);
                if (next && active && !disposed) {
                    pendingCoordinates = next;
                    render();
                }
            });
            map.panTo?.(coordinates);
        }
    }

    function render() {
        const photo = selectedPhoto();
        if (refs.count) refs.count.textContent = `${photos.length}/${MAX_TRIAL_PHOTOS}`;
        if (refs.add) refs.add.disabled = photos.length >= MAX_TRIAL_PHOTOS;
        if (refs.fileInput) refs.fileInput.disabled = photos.length >= MAX_TRIAL_PHOTOS;
        if (refs.continue) refs.continue.disabled = !photos.length || processingCount > 0 || continuing;
        if (refs.locationSave) refs.locationSave.disabled = !pendingCoordinates;
        if (refs.mapStart) {
            refs.mapStart.hidden = Boolean(map);
            refs.mapStart.disabled = Boolean(map) || !photo;
        }
        if (refs.empty) refs.empty.hidden = photos.length > 0;
        if (refs.workspace) refs.workspace.hidden = photos.length === 0;
        if (refs.guide) refs.guide.hidden = photos.length > 0;
        if (refs.image) {
            if (photo?.url) refs.image.src = photo.url;
            else refs.image.removeAttribute?.('src');
        }
        if (refs.name) refs.name.textContent = photo?.name || '';
        if (refs.date) refs.date.textContent = photo?.date ? new Date(photo.date).toLocaleString('ko-KR') : '촬영일 정보 없음';
        if (refs.size) refs.size.textContent = photo ? `${(photo.file.size / 1024 / 1024).toFixed(1)} MB` : '';
        const shownLocation = pendingCoordinates || photo;
        if (refs.location) refs.location.textContent = hasUsableCoordinates(shownLocation?.lat, shownLocation?.lng)
            ? `${Number(shownLocation.lat).toFixed(6)},${Number(shownLocation.lng).toFixed(6)}`
            : '위치 정보 없음';
        if (refs.mapMessage) refs.mapMessage.textContent = pendingCoordinates
            ? '지도에서 선택한 위치입니다. ‘이 위치로 지정’을 눌러 적용하세요.'
            : (hasUsableCoordinates(photo?.lat, photo?.lng)
                ? '사진의 저장된 위치입니다. 지도를 눌러 조정할 수 있습니다.'
                : (map ? '지도가 준비되었습니다. 지도를 눌러 위치를 지정하세요.' : '지도에서 위치를 확인하거나 지정할 수 있습니다.'));
        if (refs.list) {
            const nodes = photos.map((item) => {
                const row = root.ownerDocument.createElement('div');
                const button = root.ownerDocument.createElement('button');
                button.type = 'button';
                button.dataset.trialSelect = item.id;
                button.setAttribute('aria-pressed', String(item.id === selectedId));
                const image = root.ownerDocument.createElement('img');
                image.src = item.url;
                image.alt = '';
                const label = root.ownerDocument.createElement('span');
                label.textContent = item.name;
                const remove = root.ownerDocument.createElement('button');
                remove.type = 'button';
                remove.dataset.trialRemove = item.id;
                remove.textContent = '삭제';
                remove.setAttribute('aria-label', `${item.name} 삭제`);
                button.append(image, label);
                row.append(button, remove);
                return row;
            });
            refs.list.replaceChildren(...nodes);
        }
        onChange(clonePhotos(photos));
    }

    function saveDraft(throwOnError = false) {
        const snapshot = clonePhotos(photos);
        const operation = persistQueue.then(async () => {
            try {
                await store.save(snapshot);
                setError('');
                return true;
            } catch (error) {
                const storageFailure = new Error(PERSISTENCE_MESSAGE, { cause: error });
                reportError(storageFailure, PERSISTENCE_MESSAGE);
                if (throwOnError) throw storageFailure;
                return false;
            }
        });
        persistQueue = operation.catch(() => false);
        return operation;
    }

    async function addFiles(files, requestRevision) {
        if (disposed || requestRevision !== revision) return;
        const { accepted, rejected } = filterFiles(files);
        const available = Math.max(0, MAX_TRIAL_PHOTOS - photos.length);
        const additions = accepted.slice(0, available).map((file) => ({
            id: createId(),
            name: file.name,
            file,
            url: createObjectUrl(file),
            date: null,
            lat: null,
            lng: null,
            geo_source: null,
            location_precision: null,
            location_assignment_skipped: false
        }));
        photos.push(...additions);
        processingCount += additions.length;
        selectedId ||= additions[0]?.id || null;
        render();
        await saveDraft();
        if (rejected.length || accepted.length > available) {
            notify(rejected[0]?.reason || `체험 사진은 최대 ${MAX_TRIAL_PHOTOS}장까지 선택할 수 있습니다.`);
        }
        await Promise.all(additions.map(async (item) => {
            let exif = {};
            try { exif = await readExif(item.file); } catch {}
            if (disposed || requestRevision !== revision || !photos.some((photo) => photo.id === item.id)) return;
            Object.assign(item, getTrialUploadMetadata(item, exif));
        }));
        processingCount = Math.max(0, processingCount - additions.length);
        if (!disposed && requestRevision === revision) {
            render();
            await saveDraft();
        }
    }

    function removePhoto(id) {
        const index = photos.findIndex((photo) => photo.id === id);
        if (index < 0) return;
        const [removed] = photos.splice(index, 1);
        revokePhoto(removed);
        if (selectedId === id) selectedId = photos[Math.min(index, photos.length - 1)]?.id || null;
        pendingCoordinates = null;
        render();
        renderMarker();
        void saveDraft();
    }

    async function startMap() {
        if (map || !loadMaps) return;
        const token = ++mapRequest;
        try {
            const loadedMaps = await loadMaps();
            if (disposed || !active || token !== mapRequest) return;
            const maps = loadedMaps?.maps || loadedMaps;
            if (typeof maps?.Map !== 'function' || typeof maps?.Marker !== 'function') {
                throw new Error('지도를 불러오지 못했습니다.');
            }
            const photo = selectedPhoto();
            const center = hasUsableCoordinates(photo?.lat, photo?.lng) ? { lat: photo.lat, lng: photo.lng } : SEOUL;
            map = new maps.Map(refs.map, { center, zoom: center === SEOUL ? 11 : 15 });
            map.__trialMaps = maps;
            map.addListener('click', (event) => {
                const next = coordinateFromEvent(event);
                if (next && active && !disposed) {
                    pendingCoordinates = next;
                    renderMarker();
                    render();
                }
            });
            renderMarker();
            render();
        } catch (error) {
            if (token === mapRequest) reportError(error, '지도를 불러오지 못했습니다.');
        }
    }

    async function continueTrial() {
        if (!photos.length || processingCount > 0 || continuing) return;
        if (pendingCoordinates) {
            reportError(new Error('선택한 위치를 먼저 적용해 주세요.'), '선택한 위치를 먼저 적용해 주세요.');
            return;
        }
        continuing = true;
        render();
        try {
            if (!await saveDraft()) {
                reportError(new Error(PERSISTENCE_MESSAGE), PERSISTENCE_MESSAGE);
                return;
            }
            await onContinue(clonePhotos(photos));
        } catch (error) {
            reportError(error, '사진 저장 준비를 계속할 수 없습니다.');
        } finally {
            continuing = false;
            render();
        }
    }

    function handleClick(event) {
        const target = event.target;
        if (target.closest?.('[data-trial-add]')) refs.fileInput?.click();
        const remove = target.closest?.('[data-trial-remove]');
        if (remove) return removePhoto(remove.dataset.trialRemove);
        const select = target.closest?.('[data-trial-select]');
        if (select) {
            selectedId = select.dataset.trialSelect;
            pendingCoordinates = null;
            render();
            renderMarker();
            return;
        }
        if (target.closest?.('[data-trial-map-start]')) void startMap();
        if (target.closest?.('[data-trial-location-save]') && pendingCoordinates && selectedPhoto()) {
            Object.assign(selectedPhoto(), pendingCoordinates, {
                geo_source: 'manual',
                location_precision: 'pin',
                location_assignment_skipped: false
            });
            pendingCoordinates = null;
            render();
            void saveDraft();
        }
        if (target.closest?.('[data-trial-location-clear]') && selectedPhoto()) {
            Object.assign(selectedPhoto(), {
                lat: null,
                lng: null,
                geo_source: null,
                location_precision: null,
                location_assignment_skipped: true
            });
            pendingCoordinates = null;
            render();
            renderMarker();
            void saveDraft();
        }
        if (target.closest?.('[data-trial-continue]')) void continueTrial();
        if (target.closest?.('[data-trial-clear]')) void clear().catch((error) => reportError(error, PERSISTENCE_MESSAGE));
    }

    function handleChange(event) {
        if (event.target !== refs.fileInput) return;
        const files = Array.from(refs.fileInput.files || []);
        refs.fileInput.value = '';
        const requestRevision = revision;
        addQueue = addQueue.then(() => addFiles(files, requestRevision));
    }

    function deactivate() {
        active = false;
        mapRequest += 1;
    }

    async function loadDraft() {
        await addQueue;
        await persistQueue;
        revision += 1;
        mapRequest += 1;
        try {
            const restored = await store.load();
            photos.forEach(revokePhoto);
            photos = restored.slice(0, MAX_TRIAL_PHOTOS).map((photo) => ({ ...photo, url: createObjectUrl(photo.file) }));
            selectedId = photos[0]?.id || null;
            loaded = true;
            setError('');
        } catch (error) {
            loaded = true;
            reportError(error, PERSISTENCE_MESSAGE);
        }
        render();
        renderMarker();
        return clonePhotos(photos);
    }

    async function clear() {
        revision += 1;
        mapRequest += 1;
        photos.forEach(revokePhoto);
        photos = [];
        selectedId = null;
        pendingCoordinates = null;
        marker?.setMap?.(null);
        marker = null;
        render();
        await persistQueue;
        await store.clear();
    }

    async function removeSaved(ids = []) {
        const uploadedIds = new Set(Array.from(ids, (id) => String(id)));
        const removed = photos.filter((photo) => uploadedIds.has(String(photo.id)));
        if (!removed.length) return;
        removed.forEach(revokePhoto);
        photos = photos.filter((photo) => !uploadedIds.has(String(photo.id)));
        if (!photos.some((photo) => photo.id === selectedId)) selectedId = photos[0]?.id || null;
        pendingCoordinates = null;
        render();
        renderMarker();
        await saveDraft(true);
    }

    return {
        bind() {
            if (bound) return;
            bound = true;
            root.addEventListener('click', handleClick);
            root.addEventListener('change', handleChange);
            root.addEventListener('close', deactivate);
            root.addEventListener('photo-trial:close', deactivate);
        },
        async open() {
            if (disposed) throw new Error('폐기된 사진 체험 컨트롤러는 다시 열 수 없습니다.');
            active = true;
            if (!loaded) await loadDraft();
            else render();
        },
        loadDraft,
        getPhotos: () => clonePhotos(photos),
        removeSaved,
        clear,
        dispose() {
            if (disposed) return;
            disposed = true;
            deactivate();
            revision += 1;
            photos.forEach(revokePhoto);
            photos = [];
            marker?.setMap?.(null);
            root.removeEventListener('click', handleClick);
            root.removeEventListener('change', handleChange);
            root.removeEventListener('close', deactivate);
            root.removeEventListener('photo-trial:close', deactivate);
        }
    };
}
