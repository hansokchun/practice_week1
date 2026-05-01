/**
 * upload.js — §7 파일 업로드, EXIF 파싱, 이미지 압축, Storage 업로드
 */
import { uploadImage, upsertPhoto, dataUrlToFile } from '../auth.js';

export function initUpload({ state, ui, map, clusterGroup }, { showToast, syncData }) {

    async function processFiles(files) {
        const pendingPhotos = [];
        showToast("Processing photos...", "info");
        
        for (const f of Array.from(files)) {
            if (!f.type.startsWith('image/')) {
                showToast(`Skipped ${f.name} - Not an image`, "warning");
                continue;
            }
            try {
                const exif = await exifr.parse(f);
                const url = await new Promise(r => { 
                    const rd = new FileReader(); 
                    rd.onload = () => r(rd.result); 
                    rd.readAsDataURL(f); 
                });
                
                const newId = Date.now().toString() + Math.floor(Math.random() * 10000);
                const pad = (n) => n.toString().padStart(2, '0');
                
                let dateString = '';
                if (exif && exif.DateTimeOriginal) {
                    const dt = new Date(exif.DateTimeOriginal);
                    dateString = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
                } else {
                    const dt = new Date();
                    dateString = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
                }

                const photoData = { 
                    id: newId, date: dateString, title: '', description: '', 
                    lat: exif?.latitude, lng: exif?.longitude, 
                    liked: 0, shared: false, owner_id: state.currentUser.id,
                    _file: f, _dataUrl: url
                };

                if (!photoData.lat || !photoData.lng) {
                    pendingPhotos.push(photoData);
                } else {
                    await uploadAndSavePhoto(photoData);
                }
            } catch (err) { 
                console.error(err); 
                showToast(`Photo processing error: ${err.message}`, "warning");
            }
        }
        
        if (pendingPhotos.length > 0) {
            showToast(`${pendingPhotos.length} photos need location. Click on the map!`, "info");
            startLocationPicker(pendingPhotos);
        } else {
            showToast("Upload complete!", "success");
            syncData();
        }
    }

    /** Canvas 기반 이미지 압축 */
    async function compressImage(file, maxWidth, quality = 0.8) {
        return new Promise((resolve) => {
            const img = new Image();
            const reader = new FileReader();
            reader.onload = (e) => {
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    }, 'image/jpeg', quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    /** Storage 업로드 + DB 메타데이터 저장 */
    async function uploadAndSavePhoto(photoData) {
        const file = photoData._file || dataUrlToFile(photoData._dataUrl, `${photoData.id}.jpg`);
        showToast("Compressing photo (3 versions)...", "info");
        
        const [microFile, gridFile, detailFile] = await Promise.all([
            compressImage(file, 100, 0.6),
            compressImage(file, 400, 0.7),
            compressImage(file, 1200, 0.8)
        ]);
        
        showToast("Uploading chunks to Storage...", "info");
        
        const [microReq, gridReq, detailReq] = await Promise.all([
            uploadImage(microFile, `${photoData.id}_micro.jpg`),
            uploadImage(gridFile, `${photoData.id}_grid.jpg`),
            uploadImage(detailFile, `${photoData.id}_detail.jpg`)
        ]);

        if (microReq.error || gridReq.error || detailReq.error) {
            const uploadError = microReq.error || gridReq.error || detailReq.error;
            showToast(`Upload failed: ${uploadError.message}`, "warning");
            throw uploadError;
        }

        const dbPhoto = {
            id: photoData.id, url: detailReq.url, date: photoData.date,
            title: photoData.title, description: photoData.description,
            lat: photoData.lat, lng: photoData.lng,
            liked: photoData.liked, shared: photoData.shared, owner_id: photoData.owner_id
        };
        
        const { error: dbError } = await upsertPhoto(dbPhoto);
        if (dbError) { showToast(`Save failed: ${dbError.message}`, "warning"); throw dbError; }
    }

    /** GPS가 없는 사진의 위치를 지도 클릭으로 지정 */
    function startLocationPicker(list) {
        if (!list.length) { document.body.classList.remove('picking-location'); showToast("Saved!", "success"); syncData(); return; }
        const p = list.shift();
        const guideThumb = document.getElementById('guide-thumb');
        document.body.classList.add('picking-location');
        guideThumb.src = p._dataUrl || p.url;
        clusterGroup.eachLayer(m => m.options.interactive = false);
        map.once('click', async (e) => {
            p.lat = e.latlng.lat; p.lng = e.latlng.lng;
            try { await uploadAndSavePhoto(p); } catch (err) { console.error('Location pick upload failed:', err); }
            clusterGroup.eachLayer(m => m.options.interactive = true);
            document.body.classList.remove('picking-location');
            startLocationPicker(list);
        });
    }

    return { processFiles, startLocationPicker };
}
