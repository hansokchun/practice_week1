export function getShareSaveControlState(isSaving) {
    return {
        disabled: Boolean(isSaving),
        saveLabel: isSaving ? '저장 중' : '설정 저장'
    };
}
