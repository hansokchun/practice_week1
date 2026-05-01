/**
 * mobile.js — §8 모바일 터치 드래그 핸들
 */
import { refreshMapSize } from './map.js';

export function initMobile({ state, ui, map }) {
    const dragHandle = document.getElementById('drag-handle');
    if (!dragHandle) return;

    let isDragging = false;
    let startY = 0;
    let startHeight = 0;

    const onDragStart = (e) => {
        if (window.innerWidth > 768) return;
        isDragging = true;
        startY = e.type === 'mousedown' ? e.pageY : e.touches[0].pageY;
        startHeight = ui.sidebar.getBoundingClientRect().height;
        ui.sidebar.style.transition = 'none';
        ui.sidebar.classList.remove('expanded');
        document.body.style.cursor = 'grabbing';
    };

    const onDragMove = (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();
        const currentY = e.type === 'mousemove' ? e.pageY : e.touches[0].pageY;
        const dy = startY - currentY;
        const newHeight = startHeight + dy;
        const minH = window.innerHeight * 0.15;
        const maxH = window.innerHeight;
        if (newHeight >= minH && newHeight <= maxH) {
            ui.sidebar.style.height = `${newHeight}px`;
            refreshMapSize(map);
        }
    };

    const onDragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        ui.sidebar.style.transition = '';
        const currentHeight = ui.sidebar.getBoundingClientRect().height;
        const vh = window.innerHeight;
        if (currentHeight > vh * 0.85) { ui.sidebar.style.height = '100vh'; ui.sidebar.classList.add('expanded'); }
        else if (currentHeight > vh * 0.35) { ui.sidebar.style.height = '60vh'; }
        else { ui.sidebar.style.height = '15vh'; }
        refreshMapSize(map);
    };

    dragHandle.addEventListener('mousedown', onDragStart);
    dragHandle.addEventListener('touchstart', onDragStart, { passive: true });
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchend', onDragEnd);
}
