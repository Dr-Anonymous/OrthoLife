import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface Suggestion {
  id: string;
  name: string;
  label?: string;
  isBrand?: boolean;
  searchTerms?: string;
}

interface AutosuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  onSuggestionSelected: (suggestion: Suggestion) => void;
  suggestions: Suggestion[];
  onKeyDown?: (e: React.KeyboardEvent<any>) => void;
  placeholder?: string;
  inputProps?: any;
  disabled?: boolean;
  multiline?: boolean;
}

const AutosuggestInput = React.forwardRef<any, AutosuggestInputProps>(({
  value,
  onChange,
  onSuggestionSelected,
  suggestions,
  onKeyDown,
  placeholder = "Enter medicine name",
  inputProps,
  disabled,
  multiline = false
}, ref) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const handleInputChange = (e: React.ChangeEvent<any>) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    if (inputValue.length > 0) {
      // In multiline mode, we only want to search using the current line being typed
      const currentToken = multiline ? inputValue.split('\n').pop() || '' : inputValue;

      if (!currentToken.trim()) {
        setFilteredSuggestions([]);
        setIsSuggestionsVisible(false);
        return;
      }

      const cleanSearch = (text: string) => {
        if (!text) return '';
        const prefixes = ['t\\. ', 'cap\\. ', 'syr\\. ', 'tab\\. ', 'inj\\. ', 'crm\\. ', 'gel\\. ', 'oint\\. ', 'tab ', 'cap ', 'syr ', 'inj ', 'crm ', 'gel ', 'oint ', 'syp ', 'caps ', 'tabs '];
        const prefixRegex = new RegExp(`^(${prefixes.join('|')})`, 'i');
        
        return text.toLowerCase()
          .replace(prefixRegex, '')
          .replace(/[.()]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const searchVal = cleanSearch(currentToken);
      
      const filtered = suggestions.filter(suggestion => {
        const cleanName = cleanSearch(suggestion.name || '');
        const cleanLabel = cleanSearch(suggestion.label || '');
        const cleanTerms = cleanSearch(suggestion.searchTerms || '');
        const searchValLower = searchVal.toLowerCase();

        return cleanName.includes(searchValLower) || 
               cleanLabel.includes(searchValLower) || 
               cleanTerms.includes(searchValLower);
      });
      setFilteredSuggestions(filtered);
      setIsSuggestionsVisible(true);
    } else {
      setFilteredSuggestions([]);
      setIsSuggestionsVisible(false);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    onSuggestionSelected(suggestion);
    setFilteredSuggestions([]);
    setIsSuggestionsVisible(false);
    setActiveSuggestionIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (onKeyDown) onKeyDown(e);

    if (e.key === 'ArrowDown') {
      if (filteredSuggestions.length > 0) {
        e.preventDefault();
        setIsSuggestionsVisible(true);
        setActiveSuggestionIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      if (filteredSuggestions.length > 0) {
        e.preventDefault();
        setIsSuggestionsVisible(true);
        setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isSuggestionsVisible && filteredSuggestions.length > 0) {
        e.preventDefault();
        handleSuggestionClick(filteredSuggestions[activeSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsSuggestionsVisible(false);
    }
  };

  const Component = multiline ? Textarea : Input;

  return (
    <div className="relative w-full">
      <Component
        ref={ref}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        {...inputProps}
      />
      {isSuggestionsVisible && filteredSuggestions.length > 0 && (
        <Card className="absolute z-[100] w-full mt-1 bg-background shadow-lg max-h-[300px] overflow-y-auto border border-border">
          <ul className="py-1">
            {filteredSuggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.id}-${suggestion.name}-${index}`}
                onMouseDown={(e) => {
                    e.preventDefault();
                    handleSuggestionClick(suggestion);
                }}
                className={cn(
                    "px-3 py-2 cursor-pointer transition-colors text-sm",
                    index === activeSuggestionIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground',
                    suggestion.isBrand && "pl-6 italic"
                )}
              >
                <div className="flex items-center gap-2">
                  {suggestion.isBrand && <span className="opacity-70">↳</span>}
                  <span className="font-medium">{suggestion.label || suggestion.name}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
});

AutosuggestInput.displayName = "AutosuggestInput";

export default AutosuggestInput;