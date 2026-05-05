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

            const newValue = textBeforeContent + prefix + expansion + ' ' + textAfter;
            const newCursorPosition = (textBeforeContent + prefix + expansion).length + 1;

            return { newValue, newCursorPosition };
        }
    }

    return null;
};
