import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface NextStepsProps {
  nextStepsContent: string;
}

const NextSteps: React.FC<NextStepsProps> = ({ nextStepsContent }) => {
  if (!nextStepsContent) {
    return null;
  }

  return (
    <Card className="mt-8 bg-blue-50 border-blue-200">
      <CardHeader className="flex flex-row items-center space-x-2 pb-2">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <CardTitle className="text-lg font-semibold text-blue-800">What's Next for You?</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: nextStepsContent }} />
      </CardContent>
    </Card>
  );
};

export default NextSteps;
