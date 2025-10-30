import React from 'react';
import { ClipboardList } from 'lucide-react';

interface DietAndExercisesCardProps {
  advice?: string;
}

const DietAndExercisesCard: React.FC<DietAndExercisesCardProps> = ({ advice }) => {
  if (!advice || advice.trim() === '') {
    return null;
  }

  const adviceLines = advice.split('\n').filter(line => line.trim() !== '');

  return (
    <div className="lg:col-span-1">
      <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
        <div className="flex items-center mb-4">
          <ClipboardList className="h-6 w-6 text-blue-500 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">Diet and Exercises</h2>
        </div>
        <div className="flex-grow">
          {adviceLines.length > 0 ? (
            <ul className="space-y-2 text-gray-600">
              {adviceLines.map((line, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2 mt-1">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No specific advice provided.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DietAndExercisesCard;
