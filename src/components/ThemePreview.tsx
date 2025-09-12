import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export const ThemePreview: React.FC = () => {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold gradient-text">Theme Preview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="primary">Primary Button</Button>
            <Button variant="default">Default Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant="default">Default Badge</Badge>
            <Badge variant="secondary">Secondary Badge</Badge>
            <Badge variant="outline">Outline Badge</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 bg-chat-gradient text-primary-foreground rounded-lg">
        <h3 className="font-semibold">Chat Gradient Background</h3>
        <p>This shows how the theme color affects the chat gradient.</p>
      </div>
    </div>
  );
};
