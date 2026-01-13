import { useState, useRef, useCallback, useEffect } from 'react';

export const useConsultationTimer = (selectedConsultation: any) => {
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerVisible, setIsTimerVisible] = useState(true);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isTimerPausedRef = useRef(false);
    const activeTimerIdRef = useRef<string | null>(null);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (selectedConsultation && isTimerVisible) {
            if (activeTimerIdRef.current !== selectedConsultation.id) {
                stopTimer();
                isTimerPausedRef.current = false;
                // Initialize from DB duration or 0
                setTimerSeconds(selectedConsultation.duration || 0);
                activeTimerIdRef.current = selectedConsultation.id;

                if (selectedConsultation.status !== 'completed' && !isTimerPausedRef.current) {
                    timerRef.current = setInterval(() => {
                        setTimerSeconds(prev => prev + 1);
                    }, 1000);
                }
            }
        } else {
            stopTimer();
            activeTimerIdRef.current = null;
        }
        return () => stopTimer();
    }, [selectedConsultation, isTimerVisible, stopTimer]);

    const pauseTimer = useCallback(() => {
        stopTimer();
        isTimerPausedRef.current = true;
    }, [stopTimer]);

    return {
        timerSeconds,
        isTimerVisible,
        setIsTimerVisible,
        stopTimer,
        pauseTimer,
        isTimerPausedRef
    };
};
