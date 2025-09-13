import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Lightbulb } from 'lucide-react';

interface SuggestionQuestionsProps {
  onSuggestionClick: (suggestion: string) => void;
  suggestions: string[];
}

export const SuggestionQuestions: React.FC<SuggestionQuestionsProps> = ({
  onSuggestionClick,
  suggestions
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Gợi ý câu hỏi</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {suggestions.map((suggestion, index) => (
          <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-3">
              <Button
                variant="ghost"
                className="w-full h-auto p-0 text-left justify-start font-normal"
                onClick={() => onSuggestionClick(suggestion)}
              >
                <span className="text-sm">{suggestion}</span>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
