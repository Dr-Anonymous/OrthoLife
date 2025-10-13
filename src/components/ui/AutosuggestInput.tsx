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

const AutosuggestInput = ({
  value,
  onChange,
  onSuggestionSelected,
  suggestions,
  onKeyDown,
}: AutosuggestInputProps) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);

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
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={handleInputChange}
        onKeyDown={onKeyDown}
        placeholder="Enter medicine name"
      />
      {isSuggestionsVisible && filteredSuggestions.length > 0 && (
        <Card className="absolute z-10 w-full mt-1 bg-background shadow-lg">
          <ul>
            {filteredSuggestions.map(suggestion => (
              <li
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="p-2 hover:bg-muted cursor-pointer"
              >
                {suggestion.name}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

export default AutosuggestInput;