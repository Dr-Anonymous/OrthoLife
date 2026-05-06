import { TextShortcut } from '@/types/consultation';

export const processTextShortcuts = (
    currentValue: string,
    cursorPosition: number,
    shortcuts: TextShortcut[]
): { newValue: string, newCursorPosition: number } | null => {
    const textBeforeCursor = currentValue.substring(0, cursorPosition);

    // Check for 3 spaces shortcut
    if (textBeforeCursor.endsWith('   ')) {
        const textBeforeContent = currentValue.substring(0, cursorPosition - 3);
        const textAfter = currentValue.substring(cursorPosition);
        const newValue = textBeforeContent + '. ' + textAfter;
        const newCursorPosition = textBeforeContent.length + 2;
        return { newValue, newCursorPosition };
    }

    const shortcutRegex = /(^|\s|\n|\.\s)([a-zA-Z0-9_]+)\.\s$/;
    const match = textBeforeCursor.match(shortcutRegex);

    if (match) {
        const prefix = match[1] || '';
        const shortcutText = match[2];
        const matchingShortcut = shortcuts.find(
            (sc) => sc.shortcut.toLowerCase() === shortcutText.toLowerCase()
        );

        if (matchingShortcut) {
            const fullMatch = match[0];
            const startOfShortcutInValue = cursorPosition - fullMatch.length;
            const textBeforeContent = currentValue.substring(0, startOfShortcutInValue);

            const shouldCapitalize = /^\s*$/.test(textBeforeContent) || prefix.includes('\n') || prefix.includes('.');

            let expansion = matchingShortcut.expansion;
            if (shouldCapitalize) {
                expansion = expansion.charAt(0).toUpperCase() + expansion.slice(1);
            }

            const textAfter = currentValue.substring(cursorPosition);
            const needsSpace = !textAfter.startsWith(' ');
            
            const newValue = textBeforeContent + prefix + expansion + (needsSpace ? ' ' : '') + textAfter;
            const newCursorPosition = (textBeforeContent + prefix + expansion).length + (needsSpace ? 1 : 0);

            return { newValue, newCursorPosition };
        }
    }

    return null;
};

export const processDurationShortcuts = (
    value: string,
    cursorPosition: number,
    options: {
        language?: string;
        variant?: 'default' | 'followup';
    } = {}
): { newValue: string, newCursorPosition: number } | null => {
    const { language = 'en', variant = 'default' } = options;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const isTelugu = language === 'te';
    
    // Pattern 1: Number + Unit (e.g. "2w. ")
    const durationRegex = /(\d+)([dwmy])\.\s$/i;
    const match = textBeforeCursor.match(durationRegex);

    if (match) {
        const shortcut = match[0];
        const count = parseInt(match[1], 10);
        const unitChar = match[2].toLowerCase();
        let unitText = '';

        if (variant === 'followup') {
            if (isTelugu) {
                switch (unitChar) {
                    case 'd': unitText = count === 1 ? 'రోజు తర్వాత' : 'రోజుల తర్వాత'; break;
                    case 'w': unitText = count === 1 ? 'వారం తర్వాత' : 'వారాల తర్వాత'; break;
                    case 'm': unitText = count === 1 ? 'నెల తర్వాత' : 'నెలల తర్వాత'; break;
                    case 'y': unitText = count === 1 ? 'సంవత్సరం తర్వాత' : 'సంవత్సరాల తర్వాత'; break;
                }
            } else {
                switch (unitChar) {
                    case 'd': unitText = count === 1 ? 'day' : 'days'; break;
                    case 'w': unitText = count === 1 ? 'week' : 'weeks'; break;
                    case 'm': unitText = count === 1 ? 'month' : 'months'; break;
                    case 'y': unitText = count === 1 ? 'year' : 'years'; break;
                }
            }
        } else {
            if (isTelugu) {
                switch (unitChar) {
                    case 'd': unitText = count === 1 ? 'రోజు' : 'రోజులు'; break;
                    case 'w': unitText = count === 1 ? 'వారం' : 'వారాలు'; break;
                    case 'm': unitText = count === 1 ? 'నెల' : 'నెలలు'; break;
                    case 'y': unitText = count === 1 ? 'సంవత్సరం' : 'సంవత్సరాలు'; break;
                }
            } else {
                switch (unitChar) {
                    case 'd': unitText = count === 1 ? 'day' : 'days'; break;
                    case 'w': unitText = count === 1 ? 'week' : 'weeks'; break;
                    case 'm': unitText = count === 1 ? 'month' : 'months'; break;
                    case 'y': unitText = count === 1 ? 'year' : 'years'; break;
                }
            }
        }

        if (unitText) {
            let expandedText = '';
            if (variant === 'followup') {
                if (isTelugu) {
                    expandedText = `${count} ${unitText} / వెంటనే- ఏవైనా లక్షణాలు తీవ్రమైతే. `;
                } else {
                    expandedText = `after ${count} ${unitText}, or immediately if symptoms worsen. `;
                }
            } else {
                expandedText = `${count} ${unitText} `;
            }

            const shortcutIndex = textBeforeCursor.lastIndexOf(shortcut);
            if (shortcutIndex !== -1) {
                const textBefore = value.substring(0, shortcutIndex);
                const textAfter = value.substring(cursorPosition);
                const needsSpace = !textAfter.startsWith(' ');
                
                // If expansion ends with space and we don't need one, trim it
                const finalExpandedText = expandedText.endsWith(' ') && !needsSpace 
                    ? expandedText.slice(0, -1) 
                    : expandedText;

                return {
                    newValue: textBefore + finalExpandedText + textAfter,
                    newCursorPosition: textBefore.length + finalExpandedText.length
                };
            }
        }
    }

    // Pattern 2: Unit only (e.g. "w. ") - only for default variant
    if (variant === 'default') {
        const unitOnlyRegex = /(?:^|\s)([dwmy])\.\s$/i;
        const unitMatch = textBeforeCursor.match(unitOnlyRegex);

        if (unitMatch) {
            const fullShortcut = unitMatch[0];
            const unitChar = unitMatch[1].toLowerCase();
            let unitText = '';

            if (isTelugu) {
                switch (unitChar) {
                    case 'd': unitText = 'రోజులు'; break;
                    case 'w': unitText = 'వారాలు'; break;
                    case 'm': unitText = 'నెలలు'; break;
                    case 'y': unitText = 'సంవత్సరాలు'; break;
                }
            } else {
                switch (unitChar) {
                    case 'd': unitText = 'days'; break;
                    case 'w': unitText = 'weeks'; break;
                    case 'm': unitText = 'months'; break;
                    case 'y': unitText = 'years'; break;
                }
            }

            if (unitText) {
                const prefix = fullShortcut.match(/^\s/) ? ' ' : '';
                const expandedText = `${prefix}${unitText} `;
                const shortcutIndex = textBeforeCursor.lastIndexOf(fullShortcut);
                if (shortcutIndex !== -1) {
                    const textBefore = value.substring(0, shortcutIndex);
                    const textAfter = value.substring(cursorPosition);
                    const needsSpace = !textAfter.startsWith(' ');

                    const finalExpandedText = expandedText.endsWith(' ') && !needsSpace 
                        ? expandedText.slice(0, -1) 
                        : expandedText;

                    return {
                        newValue: textBefore + finalExpandedText + textAfter,
                        newCursorPosition: textBefore.length + finalExpandedText.length
                    };
                }
            }
        }
    }

    return null;
};
