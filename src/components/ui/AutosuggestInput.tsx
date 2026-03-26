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
  disabled?: boolean;
}

const AutosuggestInput = React.forwardRef<HTMLInputElement, AutosuggestInputProps>(({
  value,
  onChange,
  onSuggestionSelected,
  suggestions,
  onKeyDown,
  placeholder = "Enter medicine name",
  inputProps,
  disabled
}, ref) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    if (inputValue.length > 0) {
      const cleanSearch = (text: string) => {
        if (!text) return '';
        const prefixes = ['t\\.', 'cap\\.', 'syr\\.', 'tab\\.', 'inj\\.', 'crm\\.', 'gel\\.', 'oint\\.', 'tab', 'cap', 'syr', 'inj', 'crm', 'gel', 'oint', 'syp', 'caps', 'tabs', 'pint', 'p\\.int', 'p\\.inj', 'supp', 'susp', 'lot', 'pdr'];
        const regex = new RegExp(`^(${prefixes.join('|')})\\s*`, 'i');
        return text.toLowerCase()
          .replace(regex, '')
          .trim();
      };

      const searchVal = cleanSearch(inputValue);
      
      const filtered = suggestions.filter(suggestion => {
        const name = suggestion.name || '';
        const label = suggestion.label || '';
        const searchTerms = suggestion.searchTerms || '';
        
        const cleanName = cleanSearch(name);
        const cleanLabel = cleanSearch(label);
        const cleanTerms = cleanSearch(searchTerms);

        return cleanName.includes(searchVal) || 
               cleanLabel.includes(searchVal) || 
               cleanTerms.includes(searchVal) ||
               name.toLowerCase().includes(inputValue.toLowerCase()) ||
               label.toLowerCase().includes(inputValue.toLowerCase());
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
        disabled={disabled}
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