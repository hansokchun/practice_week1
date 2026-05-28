import { getTravelDaySummaries } from './travel-days.mjs';

export function getPublicTripDayCards(photos = [], fallbackTitle = '공개 여행') {
    const summaries = getTravelDaySummaries(photos);
    if (!summaries.length) {
        return [{
            eyebrow: 'Draft',
            title: fallbackTitle,
            body: '공개할 날짜 정보가 있는 사진을 추가하면 하루별 여정이 표시됩니다.'
        }];
    }

    return summaries.slice(0, 3).map((summary) => ({
        eyebrow: summary.dayLabel,
        title: summary.title,
        body: `${summary.photoCount}장의 공개 사진과 ${summary.places}개의 위치가 담긴 구간입니다.`
    }));
}
