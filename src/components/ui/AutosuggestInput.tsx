import React, { useState, useRef, useEffect } from 'react';
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
  dose?: string;
}

interface AutosuggestInputProps {
  value: string;
  onChange: (value: string, cursorPosition?: number | null) => void;
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
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);

  // Scroll active suggestion into view within the scroll container
  useEffect(() => {
    if (isSuggestionsVisible && suggestionsContainerRef.current) {
        const container = suggestionsContainerRef.current;
        // Using nth-child logic to find the active suggestion list item
        const activeElement = container.querySelector(`li:nth-child(${activeSuggestionIndex + 1})`) as HTMLElement;
        
        if (activeElement) {
            const containerHeight = container.offsetHeight;
            const elementTop = activeElement.offsetTop;
            const elementHeight = activeElement.offsetHeight;
            const scrollTop = container.scrollTop;

            if (elementTop < scrollTop) {
                // If element is hidden above the viewport, scroll up
                container.scrollTop = elementTop;
            } else if (elementTop + elementHeight > scrollTop + containerHeight) {
                // If element is hidden below the viewport, scroll down
                container.scrollTop = elementTop + elementHeight - containerHeight;
            }
        }
    }
  }, [activeSuggestionIndex, isSuggestionsVisible]);

  const handleInputChange = (e: React.ChangeEvent<any>) => {
    const inputValue = e.target.value;
    const cursor = (e.target as any).selectionStart;
    onChange(inputValue, cursor);

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
        // Comprehensive list of pharmaceutical prefixes - must be followed by dot or space
        // Using word boundary \b and global flag to catch all occurrences (especially in searchTerms)
        const prefixRegex = /\b(t|cap|syr|tab|inj|crm|gel|oint|syp|caps|tabs)[\.\s]+/gi;
        
        const cleaned = text.toLowerCase()
          .replace(prefixRegex, ' ')
          .replace(/[^a-z0-9\s]/g, ' ') // Replace special characters with space
          .replace(/\s+/g, ' ')
          .trim();

        // If cleaning stripped everything (like if typing just a prefix), return the lowered original
        return cleaned || text.toLowerCase().trim();
      };

      const searchVal = cleanSearch(currentToken);
      const searchValLower = searchVal.toLowerCase();
      
      // First, identify all group IDs that have at least one match
      const matchingGroupIds = new Set(
        suggestions
          .filter(suggestion => {
            const cleanName = cleanSearch(suggestion.name || '');
            const cleanLabel = cleanSearch(suggestion.label || '');
            const cleanTerms = cleanSearch(suggestion.searchTerms || '');

            return cleanName.includes(searchValLower) || 
                   cleanLabel.includes(searchValLower) || 
                   cleanTerms.includes(searchValLower);
          })
          .map(suggestion => suggestion.id)
      );

      // Then, include ALL suggestions that belong to those matching groups
      // This ensures that if one brand matches, we see the composition and all its other brands
      const filtered = suggestions.filter(suggestion => matchingGroupIds.has(suggestion.id));

      // Find the best match index based on match quality while keeping original hierarchical order
      let bestMatchIndex = 0;
      let highestPriority = -1;

      filtered.forEach((suggestion, index) => {
        const cleanName = cleanSearch(suggestion.name || '');
        const cleanLabel = cleanSearch(suggestion.label || '');
        
        let priority = -1;
        // Priority 1: Exact match on name or label
        if (cleanName === searchValLower || cleanLabel === searchValLower) {
          priority = 10;
        } 
        // Priority 2: Name or label starts with search term
        else if (cleanName.startsWith(searchValLower) || cleanLabel.startsWith(searchValLower)) {
          priority = 5;
        }
        // Priority 3: Name or label contains search term
        else if (cleanName.includes(searchValLower) || cleanLabel.includes(searchValLower)) {
          priority = 1;
        }

        // We use > highestPriority to pick the FIRST best match in the original order
        if (priority > highestPriority) {
          highestPriority = priority;
          bestMatchIndex = index;
        }
      });

      setFilteredSuggestions(filtered);
      setIsSuggestionsVisible(true);
      setActiveSuggestionIndex(bestMatchIndex);
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
        onFocus={() => {
          if (value.trim().length > 0 && filteredSuggestions.length > 0) {
            setIsSuggestionsVisible(true);
          }
        }}
        onBlur={() => {
          // Use a small delay to allow onMouseDown on suggestions to fire first
          // if we weren't using preventDefault, but since we are, 
          // this is mostly for safety with other UI interactions.
          setTimeout(() => setIsSuggestionsVisible(false), 200);
        }}
        placeholder={placeholder}
        disabled={disabled}
        {...inputProps}
      />
      {isSuggestionsVisible && filteredSuggestions.length > 0 && (
        <Card ref={suggestionsContainerRef} className="absolute z-[100] w-full mt-1 bg-background shadow-lg max-h-[300px] overflow-y-auto border border-border">
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
                  {suggestion.dose && (
                    <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0",
                        index === activeSuggestionIndex 
                          ? "bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground" 
                          : "bg-muted text-muted-foreground border-border"
                    )}>
                      {suggestion.dose}
                    </span>
                  )}
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