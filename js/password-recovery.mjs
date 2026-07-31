export function isPasswordRecoveryCallback(hash = '') {
    const value = String(hash || '').replace(/^#/, '');
    if (!value || value.startsWith('/')) return false;
    return new URLSearchParams(value).get('type') === 'recovery';
}
