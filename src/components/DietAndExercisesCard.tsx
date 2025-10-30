import React from 'react';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface DietAndExercisesCardProps {
  advice?: string;
  patientName: string;
}

const DietAndExercisesCard: React.FC<DietAndExercisesCardProps> = ({ advice, patientName }) => {
  const navigate = useNavigate();
  const adviceLines = advice ? advice.split('\n').filter(line => line.trim() !== '') : [];

  const getButtonInfo = (line: string) => {
    const lowerLine = line.toLowerCase();
    const hasDiet = lowerLine.includes('diet');
    const hasExercises = lowerLine.includes('exercise');

    if (hasDiet && hasExercises) {
      return { text: 'View Guide', query: line };
    }
    if (hasDiet) {
      return { text: 'View Diet', query: line };
    }
    if (hasExercises) {
      return { text: 'View Exercise', query: line };
    }
    return null;
  };

  return (
    <div className="lg:col-span-1">
      <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
        <div className="flex items-center mb-4">
          <ClipboardList className="h-6 w-6 text-blue-500 mr-3" />
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Diet and Exercises for {patientName}</h2>
        </div>
        <div className="flex-grow">
          {adviceLines.length > 0 ? (
            <ul className="space-y-2 text-gray-600">
              {adviceLines.map((line, index) => {
                const buttonInfo = getButtonInfo(line);
                return (
                  <li key={index} className="flex items-start justify-between">
                    <span className="mr-2 mt-1">•</span>
                    <span className="flex-grow">{line}</span>
                    {buttonInfo && (
                      <Button
                        variant="link"
                        onClick={() => navigate(`/guides?q=${encodeURIComponent(buttonInfo.query)}`)}
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
            <p className="text-gray-500 text-center py-4">No specific advice provided.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DietAndExercisesCard;
