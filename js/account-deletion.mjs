export const ACCOUNT_DELETION_CONFIRMATION = '계정 삭제';

export function getAccountDeletionControlState(value, deleting = false) {
    const confirmed = String(value || '') === ACCOUNT_DELETION_CONFIRMATION;
    return {
        confirmed,
        submitDisabled: !confirmed || Boolean(deleting)
    };
}
