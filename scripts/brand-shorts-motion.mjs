import { getBrandMotionProgress } from './brand-motion.mjs';

const smooth = (seconds, start, duration) => {
    const t = Math.max(0, Math.min(1, (seconds - start) / duration));
    return t * t * (3 - 2 * t);
};

export const SHORTS_LAYOUTS = Object.freeze({
    intro: Object.freeze({ left: 120, top: 740, width: 840, height: 205 }),
    outro: Object.freeze({ left: 120, top: 660, width: 840, height: 205 }),
    overlay: Object.freeze({ left: 120, top: 1280, width: 840, height: 205 })
});

export function getShortsMotion(seconds, kind) {
    if (!Number.isFinite(seconds)) throw new TypeError('Motion time must be finite.');
    if (!Object.hasOwn(SHORTS_LAYOUTS, kind)) throw new Error('Unknown shorts motion kind.');
    if (kind === 'overlay') {
        const enter = smooth(seconds, 0, 0.35);
        return { opacity: enter * (1 - smooth(seconds, 2.4, 0.5)), offset: 8 * (1 - enter) };
    }
    return { ...getBrandMotionProgress(seconds),
        cta: kind === 'outro' ? smooth(seconds, 0.9, 0.5) : 0,
        website: kind === 'outro' ? smooth(seconds, 1.25, 0.45) : 0 };
}
