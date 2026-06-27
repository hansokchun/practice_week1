export function formatRelativeTime(value, now = new Date()) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '방금';

    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const hours = Math.floor(diffMs / 3600000);
    if (hours < 1) return '방금';
    if (hours < 24) return `${hours}시간 전`;

    const days = Math.floor(hours / 24);
    if (days < 14) return `${days}일 전`;
    if (days < 28) return `${Math.floor(days / 7)}주 전`;

    const months = Math.min(11, Math.max(1, Math.floor(days / 30)));
    if (days < 365) return `${months}개월 전`;

    return `${Math.floor(days / 365)}년 전`;
}
