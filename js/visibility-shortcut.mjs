const SUPPORTED_SHORTCUTS = new Set(['private', 'link', 'public']);

export function getVisibilityShortcutAction(value) {
    if (!SUPPORTED_SHORTCUTS.has(value)) {
        return {
            visibility: 'private',
            shouldSave: false
        };
    }

    return {
        visibility: value,
        shouldSave: true
    };
}
