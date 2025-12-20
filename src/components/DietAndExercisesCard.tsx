import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cleanAdviceLine } from '../lib/utils';

interface DietAndExercisesCardProps {
  advice?: string;
}

const DietAndExercisesCard: React.FC<DietAndExercisesCardProps> = ({ advice }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const adviceLines = advice ? advice.split('\n').filter(line => line.trim() !== '') : [];

  const getButtonInfo = (line: string) => {
    // 1. Check for "guide" keyword first (explicit override)
    if (line.toLowerCase().includes('guide')) {
      const cleanedQuery = cleanAdviceLine(line);
      // If the line was just "Guide" or similar and cleaned to empty, fallback to original or handle gracefully?
      // Assuming there's content like "Back pain guide", result is "Back pain".
      if (cleanedQuery) {
        return { text: t('dietAndExercisesCard.viewGuide'), query: cleanedQuery };
      }
    }

    return null;
  };

  return (
    <div className="lg:col-span-1">
      <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
        <div className="flex items-center mb-4">
          <ClipboardList className="h-6 w-6 text-blue-500 mr-3" />
          <h2 className="text-2xl font-semibold leading-none tracking-tight">{t('dietAndExercisesCard.title')}</h2>
        </div>
        <div className="flex-grow">
          {adviceLines.length > 0 ? (
            <ul className="space-y-2 text-gray-600">
              {adviceLines.map((line, index) => {
                const buttonInfo = getButtonInfo(line);
                // If it has 'guide', we display the cleaned line.
                // Otherwise we display the original line.
                const lowerLine = line.toLowerCase();
                const displayLine = lowerLine.includes('guide') ? cleanAdviceLine(line) : line;

                return (
                  <li key={index} className="flex items-start justify-between">
                    <span className="mr-2 mt-1">•</span>
                    <span className="flex-grow">{displayLine}</span>
                    {buttonInfo && (
                      <Button
                        variant="link"
                        onClick={() => navigate(`/guides?q=${encodeURIComponent(buttonInfo.query.replace(/[\(\[].*?[\)\]]/g, "").replace(/[.\s]+$/, ""))}`)}
                        className="ml-4"
                      >
                        {buttonInfo.text}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">{t('dietAndExercisesCard.noAdvice')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DietAndExercisesCard;
