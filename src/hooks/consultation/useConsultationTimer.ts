import { useState, useEffect, useRef, useCallback } from 'react';

// A minimal interface for what the hook needs
interface ConsultationLike {
  id: string;
}

export const useConsultationTimer = (selectedConsultation: ConsultationLike | null) => {
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerVisible, setIsTimerVisible] = useState(true);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTimerPausedRef = useRef<boolean>(false);
  const activeTimerIdRef = useRef<string | null>(null);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
  }, []);

  useEffect(() => {
    if (selectedConsultation && isTimerVisible) {
      // If a new consultation is selected, reset and start the timer
      if (activeTimerIdRef.current !== selectedConsultation.id) {
        stopTimer();
        setTimerSeconds(0);
        isTimerPausedRef.current = false;
        activeTimerIdRef.current = selectedConsultation.id;
        startTimer();
      } else if (!timerIntervalRef.current && !isTimerPausedRef.current) {
        // If the same consultation is selected and the timer isn't running, start it
        startTimer();
      }
    } else {
      // Stop the timer if no consultation is selected or if it's hidden
      stopTimer();
    }

    // Reset timer state if the consultation is deselected
    if (!selectedConsultation) {
        setTimerSeconds(0);
        activeTimerIdRef.current = null;
        isTimerPausedRef.current = false;
    }

    // Cleanup on unmount or dependency change
    return () => {
      stopTimer();
    }
  }, [selectedConsultation, isTimerVisible, startTimer, stopTimer]);

  const pauseTimer = () => {
    stopTimer();
    isTimerPausedRef.current = true;
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const toggleTimerVisibility = () => setIsTimerVisible(prev => !prev);

  return {
    formattedTime: formatTime(timerSeconds),
    isTimerVisible,
    toggleTimerVisibility,
    pauseTimer,
    stopTimer, // Exposing this for direct use in saveChanges
  };
};
