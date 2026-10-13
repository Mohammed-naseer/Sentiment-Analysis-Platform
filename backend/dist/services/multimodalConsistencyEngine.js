"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlateTextAndVision = void 0;
const DAMAGE_DEFECT_LABELS = new Set([
    'PHYSICAL_DAMAGE',
    'SCRATCH',
    'CRACK',
    'BROKEN_COMPONENT',
    'PACKAGING_DAMAGE',
    'OTHER_ISSUE',
]);
const DAMAGE_TEXT_KEYWORDS = [
    'damage', 'broken', 'crack', 'cracked', 'scratch', 'scratched', 'dent', 'dented',
    'torn', 'shattered', 'defective', 'blemish', 'tear', 'smashed', 'ruined', 'leak',
    'poor packaging', 'box was damaged', 'opened', 'crushed'
];
/**
 * Correlates customer text sentiment & mentions with visual defect analysis.
 * Uses neutral, unbiased, explainable terminology (CONSISTENT, POTENTIALLY_INCONSISTENT, INSUFFICIENT_EVIDENCE).
 */
const correlateTextAndVision = (text, textSentiment, visualLabel, visualConfidence, isImageUsable, qualityReason, additionalDefects) => {
    const lowerText = (text || '').toLowerCase();
    const mentionsDamageKeywords = DAMAGE_TEXT_KEYWORDS.some(kw => lowerText.includes(kw));
    const allDetectedLabels = [visualLabel, ...(additionalDefects || []).map(d => d.label)];
    const detectedDefectLabels = allDetectedLabels.filter(l => DAMAGE_DEFECT_LABELS.has(l));
    const hasVisualDefect = detectedDefectLabels.length > 0;
    // 1. If image quality is unusable or unverified
    if (!isImageUsable || visualLabel === 'UNKNOWN') {
        return {
            textSentiment,
            visualIssue: visualLabel,
            consistency: 'INSUFFICIENT_EVIDENCE',
            confidence: Math.min(visualConfidence, 0.45),
            explanation: qualityReason
                ? `Visual evidence is inconclusive due to image quality limitations (${qualityReason}).`
                : 'Visual evidence is inconclusive or image defect confidence is below diagnostic threshold.',
        };
    }
    const defectsDisplay = detectedDefectLabels.map(l => l.replace(/_/g, ' ').toLowerCase()).join(', ');
    // 2. Text indicates issue/damage AND visual analysis detects physical issue
    if ((textSentiment === 'Negative' || textSentiment === 'Mixed' || mentionsDamageKeywords) && hasVisualDefect) {
        return {
            textSentiment,
            visualIssue: visualLabel,
            consistency: 'CONSISTENT',
            confidence: Math.min(0.96, Math.round((visualConfidence * 0.5 + 0.46) * 100) / 100),
            explanation: `Reported issue aligns with visual observation (${defectsDisplay}).`,
        };
    }
    // 3. Text indicates positive satisfaction ("flawless", "perfect", "good") BUT visual defect detected
    if (textSentiment === 'Positive' && hasVisualDefect && visualConfidence >= 0.6) {
        return {
            textSentiment,
            visualIssue: visualLabel,
            consistency: 'POTENTIALLY_INCONSISTENT',
            confidence: Math.round(visualConfidence * 100) / 100,
            explanation: `Customer sentiment is positive, but visual analysis detected indicators of ${defectsDisplay}. Manual review suggested.`,
        };
    }
    // 4. Text complains about physical damage/defect BUT image shows normal condition
    if (mentionsDamageKeywords && (textSentiment === 'Negative' || textSentiment === 'Mixed') && visualLabel === 'NORMAL' && visualConfidence >= 0.7) {
        return {
            textSentiment,
            visualIssue: visualLabel,
            consistency: 'POTENTIALLY_INCONSISTENT',
            confidence: Math.round(visualConfidence * 100) / 100,
            explanation: 'Text describes physical damage or defects, but the provided image exhibits standard product condition.',
        };
    }
    // 5. Normal product and neutral/positive sentiment
    if (visualLabel === 'NORMAL' && textSentiment !== 'Negative') {
        return {
            textSentiment,
            visualIssue: visualLabel,
            consistency: 'CONSISTENT',
            confidence: Math.round(visualConfidence * 100) / 100,
            explanation: 'Visual condition is standard and aligns with positive/neutral customer feedback.',
        };
    }
    // 6. Default / Borderline cases
    return {
        textSentiment,
        visualIssue: visualLabel,
        consistency: 'CONSISTENT',
        confidence: Math.round(visualConfidence * 100) / 100,
        explanation: 'Cross-modal correlation indicates general alignment between text feedback and visual observation.',
    };
};
exports.correlateTextAndVision = correlateTextAndVision;
