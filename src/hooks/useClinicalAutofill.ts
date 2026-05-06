import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TextShortcut, AutofillProtocol } from '@/types/consultation';
import { processTextShortcuts, processDurationShortcuts } from '@/lib/textShortcuts';

interface UseClinicalAutofillOptions {
  consultantId?: string;
}

export function useClinicalAutofill({ consultantId }: UseClinicalAutofillOptions) {
  const [textShortcuts, setTextShortcuts] = useState<TextShortcut[]>([]);
  const [autofillKeywords, setAutofillKeywords] = useState<AutofillProtocol[]>([]);

  const fetchShortcuts = useCallback(async () => {
    const filterCondition = consultantId 
      ? `consultant_id.eq.${consultantId},consultant_id.is.null`
      : `consultant_id.is.null`;

    const { data: shortcuts } = await supabase
      .from('text_shortcuts')
      .select('*')
      .or(filterCondition);
    
    if (shortcuts) setTextShortcuts(shortcuts);

    const { data: keywords } = await supabase
      .from('autofill_keywords')
      .select('*')
      .or(filterCondition);
    
    if (keywords) setAutofillKeywords(keywords as AutofillProtocol[]);
  }, [consultantId]);

  useEffect(() => {
    fetchShortcuts();
  }, [fetchShortcuts]);

  const processFieldChange = useCallback((
    value: string,
    cursorPosition: number,
    options: {
      enableDurationShortcuts?: boolean;
      language?: string;
      variant?: 'default' | 'followup';
    } = {}
  ): { newValue: string, newCursorPosition: number } | null => {
    
    // 1. Check for custom text shortcuts (e.g. "diag. ")
    const shortcutResult = processTextShortcuts(value, cursorPosition, textShortcuts);
    if (shortcutResult) return shortcutResult;

    // 2. Check for duration shortcuts (e.g. "2w. ")
    if (options.enableDurationShortcuts) {
      const durationResult = processDurationShortcuts(value, cursorPosition, {
        language: options.language,
        variant: options.variant
      });
      if (durationResult) return durationResult;
    }

    return null;
  }, [textShortcuts]);

  return {
    textShortcuts,
    autofillKeywords,
    processFieldChange,
    refreshShortcuts: fetchShortcuts
  };
}
