const DAY = 86400000;
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function validateQuotaSnapshot(value, now = Date.now()) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const { period_start, period_end } = value;
    if (!date(period_start) || !date(period_end)) return null;
    const start = Date.parse(period_start), end = Date.parse(period_end);
    if (start > now || end <= now || end <= start || end - start > 35 * DAY) return null;
    const result = { period_start, period_end };
    for (const field of ['egress_gb', 'cached_egress_gb', 'mau', 'function_calls']) {
        const number = value[field] ?? null;
        if (number !== null && (typeof number !== 'number' || !Number.isFinite(number) || number < 0 || number > 1e12
            || (['mau', 'function_calls'].includes(field) && !Number.isSafeInteger(number)))) return null;
        result[field] = number;
    }
    return Object.values(result).slice(2).some(value => value !== null) ? result : null;
}
