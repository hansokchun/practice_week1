import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import exifr from 'exifr';

// --- Icons Setup ---
const icons = {
  liked: L.divIcon({ 
    className: 'map-icon icon-liked', 
    html: `<svg viewBox="0 0 24 24" width="30" height="30" fill="#ed4956" stroke="#ed4956" stroke-width="1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`, 
    iconSize: [30, 30], iconAnchor: [15, 15] 
  }),
  my: L.divIcon({ 
    className: 'map-icon icon-my', 
    html: `<svg viewBox="0 0 24 24" width="30" height="30" fill="#3b82f6"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`, 
    iconSize: [30, 30], iconAnchor: [15, 30] 
  }),
  shared: L.divIcon({ 
    className: 'map-icon icon-shared', 
    html: `<svg viewBox="0 0 24 24" width="30" height="30" fill="#737373"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`, 
    iconSize: [30, 30], iconAnchor: [15, 30] 
  })
};

// --- Helper Component to sync map view ---
function MapRefresher({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

function App() {
  // --- State ---
  const [showSplash, setShowSplash] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [myPhotoIds, setMyPhotoIds] = useState(JSON.parse(localStorage.getItem('my_uploaded_photos') || '[]'));
  const [myLikedIds, setMyLikedIds] = useState(JSON.parse(localStorage.getItem('my_liked_photos') || '[]'));
  
  const [viewMode, setViewMode] = useState('my'); // 'my' or 'shared'
  const [showOnlyLiked, setShowOnlyLiked] = useState(false);
  const [activeDate, setActiveDate] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDenseGrid, setIsDenseGrid] = useState(false);
  
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');

  const [toasts, setToasts] = useState([]);

  // --- Effects ---
  useEffect(() => {
    syncData();
    // Handle URL Hash for deep linking
    const hashId = window.location.hash.slice(1);
    if (hashId) {
      // Data might not be loaded yet, so we'll handle this in syncData
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('my_uploaded_photos', JSON.stringify(myPhotoIds));
  }, [myPhotoIds]);

  useEffect(() => {
    localStorage.setItem('my_liked_photos', JSON.stringify(myLikedIds));
  }, [myLikedIds]);

  // --- Actions ---
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3400);
  };

  const syncData = async () => {
    try {
      const response = await fetch('/api/photos');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const cloudPhotos = data.map(p => ({ 
        ...p, 
        liked: Number(p.liked || 0), 
        shared: !!p.shared 
      }));
      setPhotos(cloudPhotos);

      const hashId = window.location.hash.slice(1);
      if (hashId) {
        const linkedPhoto = cloudPhotos.find(p => p.id == hashId);
        if (linkedPhoto) handleShowDetail(linkedPhoto);
      }
    } catch (e) {
      showToast(`Cloud Error: ${e.message}`, "warning");
    }
  };

  const handleShowDetail = async (p) => {
    setCurrentPhoto(p);
    setIsSidebarExpanded(true);
    setIsSidebarHidden(false);
    window.history.replaceState(null, null, `#${p.id}`);
    loadComments(p.id);
  };

  const loadComments = async (photoId) => {
    try {
      const res = await fetch(`/api/photos?photo_id=${photoId}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : (data.results || []));
    } catch (e) {
      console.error(e);
      setComments([]);
    }
  };

  const handlePostComment = async () => {
    if (!commentInput.trim() || !currentPhoto) return;
    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'comment', photo_id: currentPhoto.id.toString(), text: commentInput })
      });
      if (res.ok) {
        setCommentInput('');
        loadComments(currentPhoto.id);
        showToast("Comment posted!", "success");
      }
    } catch (e) {
      showToast("Failed to post comment", "warning");
    }
  };

  const handleLike = async () => {
    if (!currentPhoto) return;
    const photoId = currentPhoto.id.toString();
    const isLiked = myLikedIds.includes(photoId);
    
    let newLikedIds;
    let newLikedCount = currentPhoto.liked || 0;

    if (isLiked) {
      newLikedIds = myLikedIds.filter(id => id !== photoId);
      newLikedCount = Math.max(0, newLikedCount - 1);
    } else {
      newLikedIds = [...myLikedIds, photoId];
      newLikedCount += 1;
    }

    setMyLikedIds(newLikedIds);
    const updatedPhoto = { ...currentPhoto, liked: newLikedCount };
    setCurrentPhoto(updatedPhoto);
    setPhotos(prev => prev.map(p => p.id === currentPhoto.id ? updatedPhoto : p));

    await fetch('/api/photos', { method: 'POST', body: JSON.stringify(updatedPhoto) });
  };

  const handleShare = async () => {
    if (!currentPhoto) return;
    const updatedPhoto = { ...currentPhoto, shared: !currentPhoto.shared };
    setCurrentPhoto(updatedPhoto);
    setPhotos(prev => prev.map(p => p.id === currentPhoto.id ? updatedPhoto : p));
    await fetch('/api/photos', { method: 'POST', body: JSON.stringify(updatedPhoto) });
    showToast(updatedPhoto.shared ? "Shared to Community" : "Removed from Community", "success");
  };

  const handleDelete = async () => {
    if (!currentPhoto || !confirm('Are you sure?')) return;
    try {
      await fetch(`/api/photos?id=${currentPhoto.id}`, { method: 'DELETE' });
      setMyPhotoIds(prev => prev.filter(id => id != currentPhoto.id));
      setPhotos(prev => prev.filter(p => p.id !== currentPhoto.id));
      setCurrentPhoto(null);
      setIsSidebarExpanded(false);
      window.history.replaceState(null, null, ' ');
      showToast("Deleted", "info");
    } catch (e) {
      showToast("Delete Failed", "warning");
    }
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    showToast("Processing photos...", "info");
    
    for (const f of Array.from(files)) {
      try {
        const exif = await exifr.parse(f);
        const url = await new Promise(r => { 
          const rd = new FileReader(); 
          rd.onload = () => r(rd.result); 
          rd.readAsDataURL(f); 
        });
        
        const newId = Date.now() + Math.random();
        const data = { 
          id: newId, url, date: (exif?.DateTimeOriginal || new Date()).toISOString().split('T')[0], 
          title: f.name, description: '', lat: exif?.latitude, lng: exif?.longitude, liked: 0, shared: false
        };

        setMyPhotoIds(prev => [...prev, newId.toString()]);
        
        if (!data.lat || !data.lng) {
          // In the real app, we'd trigger a location picker here. 
          // For simplicity in this port, let's just use a default or skip.
          showToast("Photo needs location", "warning");
        } else {
          await fetch('/api/photos', { method: 'POST', body: JSON.stringify(data) });
        }
      } catch (err) { console.error(err); }
    }
    syncData();
  };

  // --- Derived State (Filtering) ---
  const filteredPhotos = useMemo(() => {
    const isMyView = viewMode === 'my';
    return (isMyView 
      ? photos.filter(p => myPhotoIds.includes(p.id.toString()) || myPhotoIds.includes(Number(p.id))) 
      : photos.filter(p => p.shared))
      .filter(p => !showOnlyLiked || myLikedIds.includes(p.id.toString()))
      .filter(p => activeDate === 'all' || p.date === activeDate)
      .filter(p => !searchQuery || (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a,b) => b.date.localeCompare(a.date));
  }, [photos, viewMode, myPhotoIds, myLikedIds, showOnlyLiked, activeDate, searchQuery]);

  const mapPhotos = useMemo(() => {
    return photos.filter(p => {
      const isMyPhoto = myPhotoIds.includes(p.id.toString()) || myPhotoIds.includes(Number(p.id));
      return isMyPhoto || p.shared;
    })
    .filter(p => !showOnlyLiked || myLikedIds.includes(p.id.toString()))
    .filter(p => activeDate === 'all' || p.date === activeDate)
    .filter(p => !searchQuery || (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [photos, myPhotoIds, myLikedIds, showOnlyLiked, activeDate, searchQuery]);

  const groupedPhotos = useMemo(() => {
    return filteredPhotos.reduce((acc, p) => {
      if (!acc[p.date]) acc[p.date] = [];
      acc[p.date].push(p);
      return acc;
    }, {});
  }, [filteredPhotos]);

  const uniqueDates = useMemo(() => {
    const list = viewMode === 'my' 
      ? photos.filter(p => myPhotoIds.includes(p.id.toString()) || myPhotoIds.includes(Number(p.id))) 
      : photos.filter(p => p.shared);
    return [...new Set(list.map(p => p.date))].sort((a,b) => b.localeCompare(a));
  }, [photos, viewMode, myPhotoIds]);

  // --- Render ---
  return (
    <div id="app">
      {showSplash && (
        <div id="splash-screen">
          <div className="splash-bg-slider">
            <div className="slider-track">
              {[1,2,3,4,5,1].map((n, i) => (
                <div key={i} className="slide" style={{backgroundImage: `url('images/main_bg${n}.jpg')`}}></div>
              ))}
            </div>
          </div>
          <div className="splash-content">
            <h1 className="splash-logo">Travelgram</h1>
            <p className="splash-tagline">Archive your moments, Map your journey.</p>
            <button className="splash-start-btn" onClick={() => setShowSplash(false)}>Get Started</button>
          </div>
          <div className="splash-overlay"></div>
        </div>
      )}

      <div id="map-container" style={{ right: isSidebarHidden ? 0 : (isSidebarExpanded ? 'min(55vw, 900px)' : '450px') }}>
        <MapContainer center={[36.2048, 138.2529]} zoom={6} zoomControl={false} id="map">
          <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko" attribution="Google Maps" />
          <ZoomControl position="bottomright" />
          {mapPhotos.map(p => (
            <Marker 
              key={p.id} 
              position={[p.lat, p.lng]} 
              icon={myLikedIds.includes(p.id.toString()) ? icons.liked : (myPhotoIds.includes(p.id.toString()) ? icons.my : icons.shared)}
              eventHandlers={{ click: () => handleShowDetail(p) }}
            />
          ))}
          {currentPhoto && <MapRefresher center={[currentPhoto.lat, currentPhoto.lng]} zoom={18} />}
        </MapContainer>
        <button id="sidebar-toggle" className="map-overlay-btn" onClick={() => setIsSidebarHidden(!isSidebarHidden)}>
          {isSidebarHidden ? '◀' : '▶'}
        </button>
      </div>

      <aside id="sidebar" className={`${isSidebarHidden ? 'hidden' : ''} ${isSidebarExpanded ? 'expanded' : ''}`}>
        {!currentPhoto ? (
          <section id="panel-explore" className="panel active">
            <header className="sidebar-header">
              <h1 className="logo">Travelgram</h1>
              <label htmlFor="upload-input" className="btn-post">Post a Story</label>
              <input type="file" id="upload-input" multiple accept="image/jpeg, image/png" style={{display:'none'}} onChange={handleUpload} />
            </header>
            <nav className="feed-nav">
              <button className={`nav-link ${viewMode === 'my' ? 'active' : ''}`} onClick={() => setViewMode('my')}>My Stories</button>
              <button className={`nav-link ${viewMode === 'shared' ? 'active' : ''}`} onClick={() => setViewMode('shared')}>Community</button>
            </nav>
            <div className="filter-bar">
              <div className="scroll-wrapper">
                <button className={`chip ${showOnlyLiked ? 'active' : ''}`} onClick={() => setShowOnlyLiked(!showOnlyLiked)}>Liked</button>
                <div className="chip-group">
                  <button className={`chip ${activeDate === 'all' ? 'active' : ''}`} onClick={() => setActiveDate('all')}>All Dates</button>
                  {uniqueDates.map(d => (
                    <button key={d} className={`chip ${activeDate === d ? 'active' : ''}`} onClick={() => setActiveDate(d)}>{d}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="view-switcher-tools">
              <div className="search-box">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" placeholder="Search stories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <button className="icon-btn-tool" onClick={() => setIsDenseGrid(!isDenseGrid)}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </button>
            </div>
            <div className={`story-grid ${isDenseGrid ? 'dense' : ''}`}>
              {Object.keys(groupedPhotos).sort((a,b) => b.localeCompare(a)).map(date => (
                <div key={date} className="grid-group">
                  <div className="grid-date-header">{date}</div>
                  <div className="grid-items-container">
                    {groupedPhotos[date].map(p => (
                      <div key={p.id} className="grid-item" onClick={() => handleShowDetail(p)}>
                        <img src={p.url} alt="" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section id="panel-detail" className="panel active">
            <header className="detail-header">
              <button className="icon-btn" onClick={() => { setCurrentPhoto(null); setIsSidebarExpanded(false); window.history.replaceState(null, null, ' '); }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                <span>Back</span>
              </button>
              <div className="detail-actions-right">
                {myPhotoIds.includes(currentPhoto.id.toString()) && (
                  <>
                    <button className="icon-btn danger" onClick={handleDelete} title="Delete Photo">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    <button className={`icon-btn share-toggle ${currentPhoto.shared ? 'active' : ''}`} onClick={handleShare} title="Share to Community">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path></svg>
                    </button>
                  </>
                )}
                <button className={`icon-btn like-toggle ${myLikedIds.includes(currentPhoto.id.toString()) ? 'active' : ''}`} onClick={handleLike} title="Like Photo">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
              </div>
            </header>
            <div className="story-viewer">
              <div className="image-stage">
                <img src={currentPhoto.url} alt="Detail" id="detail-image" />
              </div>
              <div className="story-content">
                <div className="meta">
                  <span className="date-text">{currentPhoto.date}</span>
                  <span className="like-badge">{currentPhoto.liked || 0} likes</span>
                </div>
                <h2 className="title-input">{currentPhoto.title || 'Untitled Story'}</h2>
                <p className="desc-input">{currentPhoto.description || 'No description provided.'}</p>
                <hr className="serif-hr" />
                <div className="comments-section">
                  <h3>Comments</h3>
                  <div className="comments-list">
                    {comments.length === 0 ? <p>No comments yet.</p> : comments.map((c, i) => (
                      <div key={i} className="comment-item">
                        <div>{c.text}</div>
                        <span className="comment-date">{new Date(c.date).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="comment-input-group">
                    <input type="text" placeholder="Write a comment..." value={commentInput} onChange={(e) => setCommentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePostComment()} />
                    <button onClick={handlePostComment}>Post</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </aside>

      <div id="toast-container" className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
