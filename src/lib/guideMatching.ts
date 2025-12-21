import { Guide, MatchedGuide } from '@/types/consultation';
import { cleanAdviceLine } from '@/lib/utils';

export const getMatchingGuides = (text: string, guides: Guide[], language: string): MatchedGuide[] => {
    if (!text || !guides.length) return [];

    const lines = text.split('\n').filter(line => line.trim() !== '');
    const newMatchedGuides: MatchedGuide[] = [];

    lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('guide')) {
            const cleaned = cleanAdviceLine(line);
            if (cleaned) {
                // Matching Logic (Client-side mirror of backend)
                const term = cleaned;
                // Determine language of the search term
                const isTeluguTerm = /[\u0C00-\u0C7F]/.test(term);
                const termLower = isTeluguTerm ? term : term.toLowerCase();

                const searchWords = term.split(/\s+/).filter(w => w.length > 0);

                if (searchWords.length > 0) {
                    const scoredGuides = guides.map((guide) => {
                        let score = 0;
                        let title = '';
                        let description = '';
                        const category = guide.categories?.name?.toLowerCase() || '';

                        if (isTeluguTerm) {
                            const translation = guide.guide_translations.find((t) => t.language === 'te');
                            if (translation) {
                                title = translation.title;
                                description = translation.description;
                            } else {
                                return { guide, score: 0 };
                            }
                        } else {
                            title = guide.title.toLowerCase();
                            description = guide.description?.toLowerCase() || '';
                        }

                        if (title.includes(termLower)) score += 100;
                        if (description.includes(termLower)) score += 50;

                        searchWords.forEach(word => {
                            const wordCompare = isTeluguTerm ? word : word.toLowerCase();
                            if (title.includes(wordCompare)) score += 10;
                            if (description.includes(wordCompare)) score += 5;
                            if (category.includes(word.toLowerCase())) score += 2;
                        });

                        return { guide, score };
                    });

                    scoredGuides.sort((a, b) => b.score - a.score);
                    const bestMatch = scoredGuides[0];

                    if (bestMatch && bestMatch.score > 0) {
                        const langPrefix = language === 'te' ? '/te' : '';
                        const link = `https://ortho.life${langPrefix}/guides/${bestMatch.guide.id}`;
                        newMatchedGuides.push({ query: cleaned, guide: bestMatch.guide, guideLink: link });
                    } else {
                        newMatchedGuides.push({ query: cleaned });
                    }
                } else {
                    newMatchedGuides.push({ query: cleaned });
                }
            }
        }
    });
    return newMatchedGuides;
};
