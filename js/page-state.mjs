import { getSectionForViewMode, normalizeAppSection } from './app-sections.mjs';

export function createPageStateSnapshot(state) {
    return {
        appSection: normalizeAppSection(state.appSection),
        viewMode: state.viewMode,
        targetUserId: state.targetUserId,
        profileViewMode: state.profileViewMode,
        activeAlbum: state.activeAlbum,
        currentPhotoId: state.currentPhoto?.id || null,
        targetNickname: state._targetNickname || null
    };
}

export function normalizeSavedPageState(saved) {
    if (!saved || typeof saved !== 'object') return null;
    return {
        ...saved,
        appSection: saved.appSection
            ? normalizeAppSection(saved.appSection)
            : getSectionForViewMode(saved.viewMode)
    };
}
