import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface ConsultationTimerProps {
  formattedTime: string;
  isTimerVisible: boolean;
  toggleTimerVisibility: () => void;
}

const ConsultationTimer: React.FC<ConsultationTimerProps> = ({
  formattedTime,
  isTimerVisible,
  toggleTimerVisibility,
}) => {
  return (
    <div className="flex justify-between items-center mt-4">
      {isTimerVisible && (
        <div className="text-lg font-semibold">
          {formattedTime}
        </div>
      )}
      <Button variant="ghost" size="icon" onClick={toggleTimerVisibility}>
        {isTimerVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default ConsultationTimer;
