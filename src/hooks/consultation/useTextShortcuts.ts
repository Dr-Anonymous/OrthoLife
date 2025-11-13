import { useTranslation } from 'react-i18next';
import { ConsultationContext } from '@/context/ConsultationContext';
import React from 'react';

export const useTextShortcuts = () => {
    const { t } = useTranslation();
    const { state, dispatch } = React.useContext(ConsultationContext);
    const { textShortcuts } = state;

    const expandShortcut = (field: string, value: string) => {
        if ((field === 'complaints' || field === 'diagnosis') && value.includes('//')) {
            dispatch({ type: 'SET_MODAL_OPEN', payload: { modal: 'shortcut', isOpen: true } });
            dispatch({ type: 'UPDATE_EXTRA_DATA_FIELD', payload: { field, value: value.replace('//', '') } });
            return;
        }

        if (['complaints', 'diagnosis', 'findings', 'investigations', 'advice', 'personalNote'].includes(field)) {
            const shortcutRegex = /(\s|^)(\w+)\.\s*$/;
            const match = value.match(shortcutRegex);

            if (match) {
                const shortcutText = match[2];
                const matchingShortcut = textShortcuts.find((sc: any) => sc.shortcut.toLowerCase() === shortcutText.toLowerCase());

                if (matchingShortcut) {
                    const isStartOfSentence = /^\s*$/.test(value.substring(0, match.index));
                    let expansion = matchingShortcut.expansion;

                    if (isStartOfSentence) {
                        expansion = expansion.charAt(0).toUpperCase() + expansion.slice(1);
                    }

                    const newValue = value.replace(shortcutRegex, match[1] + expansion + ' ');
                    dispatch({ type: 'UPDATE_EXTRA_DATA_FIELD', payload: { field, value: newValue } });
                    return;
                }
            }
        }

        if (field === 'followup') {
            const shortcutRegex = /(\d+)([dwm])\./i;
            const match = value.match(shortcutRegex);

            if (match) {
                const shortcut = match[0];
                const count = parseInt(match[1], 10);
                const unitChar = match[2].toLowerCase();
                let unitKey = '';

                switch (unitChar) {
                    case 'd':
                        unitKey = count === 1 ? 'day' : 'day_plural';
                        break;
                    case 'w':
                        unitKey = count === 1 ? 'week' : 'week_plural';
                        break;
                    case 'm':
                        unitKey = count === 1 ? 'month' : 'month_plural';
                        break;
                }

                if (unitKey) {
                    const unitText = t(unitKey);
                    const replacementText = t('followup_message_structure', { count, unit: unitText });
                    const newValue = value.replace(shortcut, replacementText);
                    dispatch({ type: 'UPDATE_EXTRA_DATA_FIELD', payload: { field: 'followup', value: newValue } });
                    return;
                }
            }
        }
        dispatch({ type: 'UPDATE_EXTRA_DATA_FIELD', payload: { field, value } });
    };

    return { expandShortcut };
};
