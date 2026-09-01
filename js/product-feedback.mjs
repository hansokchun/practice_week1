export const FEEDBACK_CATEGORIES = Object.freeze({
    bug: '오류가 있어요',
    usability: '사용하기 불편해요',
    feature_request: '기능을 제안해요',
    other: '기타 의견'
});

export const FEEDBACK_STATUSES = Object.freeze({
    received: '접수',
    reviewing: '검토 중',
    planned: '개발 예정',
    completed: '완료',
    closed: '종료'
});

function truncate(value, limit) {
    return String(value || '').trim().slice(0, limit);
}

export function normalizeFeedbackDraft({
    category = 'usability',
    message = '',
    rating = null,
    pagePath = '',
    contactAllowed = false
} = {}) {
    const normalizedRating = Number(rating);
    return {
        category: Object.hasOwn(FEEDBACK_CATEGORIES, category) ? category : 'usability',
        message: truncate(message, 1000),
        rating: Number.isInteger(normalizedRating) && normalizedRating >= 1 && normalizedRating <= 5
            ? normalizedRating
            : null,
        page_path: truncate(pagePath, 200),
        contact_allowed: contactAllowed === true
    };
}

export function isFeedbackDraftValid(draft) {
    return normalizeFeedbackDraft(draft).message.length >= 3;
}

