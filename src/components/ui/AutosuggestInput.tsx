import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

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
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

const AutosuggestInput = React.forwardRef<HTMLInputElement, AutosuggestInputProps>(({
  value,
  onChange,
  onSuggestionSelected,
  suggestions,
  onKeyDown,
  placeholder = "Enter medicine name",
  inputProps,
}, ref) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    if (inputValue.length > 0) {
      const filtered = suggestions.filter(suggestion => {
        const searchTarget = `${suggestion.label || ''} ${suggestion.name || ''} ${suggestion.searchTerms || ''}`.toLowerCase();
        return searchTarget.includes(inputValue.toLowerCase());
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
    onChange(suggestion.name);
    setFilteredSuggestions([]);
    setIsSuggestionsVisible(false);
    setActiveSuggestionIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    }

    if (e.key === 'ArrowDown') {
      if (activeSuggestionIndex < filteredSuggestions.length - 1) {
        setActiveSuggestionIndex(activeSuggestionIndex + 1);
      } else {
        setActiveSuggestionIndex(0);
      }
    } else if (e.key === 'ArrowUp') {
      if (activeSuggestionIndex > 0) {
        setActiveSuggestionIndex(activeSuggestionIndex - 1);
      } else {
        setActiveSuggestionIndex(filteredSuggestions.length - 1);
      }
    } else if (e.key === 'Enter') {
      if (filteredSuggestions.length > 0) {
        e.preventDefault();
        handleSuggestionClick(filteredSuggestions[activeSuggestionIndex]);
      }
    }
  };

  return (
    <div className="relative">
      <Input
        ref={ref}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        {...inputProps}
      />
      {isSuggestionsVisible && filteredSuggestions.length > 0 && (
        <Card className="absolute z-10 w-full mt-1 bg-background shadow-lg max-h-[300px] overflow-y-auto">
          <ul>
            {filteredSuggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.id}-${suggestion.name}-${index}`}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`p-2 cursor-pointer transition-colors ${index === activeSuggestionIndex ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                  } ${suggestion.isBrand ? 'pl-6 text-sm italic' : 'font-semibold'}`}
              >
                <div className="flex items-center gap-2">
                  {suggestion.isBrand && <span className="text-muted-foreground">↳</span>}
                  <span>{suggestion.label || suggestion.name}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
});

export default AutosuggestInput;