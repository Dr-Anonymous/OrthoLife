import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Suggestion {
  id: string;
  name: string;
}

interface AutosuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  onSuggestionSelected: (suggestion: Suggestion) => void;
  suggestions: Suggestion[];
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const AutosuggestInput = React.forwardRef<HTMLInputElement, AutosuggestInputProps>(({
  value,
  onChange,
  onSuggestionSelected,
  suggestions,
  onKeyDown,
}, ref) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    if (inputValue.length > 0) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.name.toLowerCase().includes(inputValue.toLowerCase())
      );
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
        placeholder="Enter medicine name"
      />
      {isSuggestionsVisible && filteredSuggestions.length > 0 && (
        <Card className="absolute z-10 w-full mt-1 bg-background shadow-lg">
          <ul>
            {filteredSuggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`p-2 cursor-pointer ${index === activeSuggestionIndex ? 'bg-muted' : 'hover:bg-muted'
                  }`}
              >
                {suggestion.name}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
});

export default AutosuggestInput;