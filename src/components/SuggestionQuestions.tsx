import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Lightbulb, ChevronDown } from 'lucide-react';

interface SuggestionQuestionsProps {
  onSuggestionClick: (suggestion: string) => void;
  suggestions: string[];
}

export const SuggestionQuestions: React.FC<SuggestionQuestionsProps> = ({
  onSuggestionClick,
  suggestions
}) => {
  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    if (selectedValue) {
      onSuggestionClick(selectedValue);
      // Reset select value after selection
      event.target.value = '';
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Gợi ý câu hỏi</span>
      </div>
      
      {/* Mobile/Tablet Select Dropdown - Hidden on desktop */}
      <div className="md:hidden">
        <div className="relative">
          <select
            onChange={handleSelectChange}
            className="w-full p-3 pr-10 text-sm border border-input rounded-lg bg-background appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            defaultValue=""
          >
            <option value="" disabled>
              Chọn câu hỏi gợi ý...
            </option>
            {suggestions.map((suggestion, index) => (
              <option key={index} value={suggestion}>
                {suggestion}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Desktop Grid Layout - Hidden on mobile/tablet */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-2">
        {suggestions.map((suggestion, index) => (
          <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-3">
              <Button
                variant="ghost"
                className="w-full h-auto p-0 text-left justify-start font-normal"
                onClick={() => onSuggestionClick(suggestion)}
              >
                <span className="text-sm leading-relaxed break-words hyphens-auto">
                  {suggestion}
                </span>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
