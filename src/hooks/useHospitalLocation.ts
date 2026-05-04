import { useState, useEffect } from 'react';
import { useHospitals } from '@/context/HospitalsContext';
import { getDistance } from '@/lib/geolocation';

export const useHospitalLocation = (storageKeyPrefix: string = 'hospital', consultantId?: string | number) => {
  const { hospitals } = useHospitals();
  
  const [manualLocation, setManualLocation] = useState<string | null>(() => 
    localStorage.getItem(`${storageKeyPrefix}_manualLocation`)
  );
  const [autoLocation, setAutoLocation] = useState<string | null>(null);
  const [isGpsEnabled, setIsGpsEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(`${storageKeyPrefix}_gpsEnabled`);
    return stored !== null ? JSON.parse(stored) : true;
  });

  const toggleGps = () => {
    const newValue = !isGpsEnabled;
    setIsGpsEnabled(newValue);
    localStorage.setItem(`${storageKeyPrefix}_gpsEnabled`, JSON.stringify(newValue));
    if (newValue) {
      setManualLocation(null);
      localStorage.removeItem(`${storageKeyPrefix}_manualLocation`);
    }
  };

  const handleManualLocationChange = (name: string | null) => {
    setManualLocation(name);
    if (name) {
      localStorage.setItem(`${storageKeyPrefix}_manualLocation`, name);
      setIsGpsEnabled(false);
      localStorage.setItem(`${storageKeyPrefix}_gpsEnabled`, JSON.stringify(false));
    } else {
      localStorage.removeItem(`${storageKeyPrefix}_manualLocation`);
    }
  };

  useEffect(() => {
    if (isGpsEnabled && navigator.geolocation && hospitals.length > 0) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          const consultantHospitals = consultantId ? hospitals.filter(h => h.consultantId === consultantId) : [];
          const candidates = consultantHospitals.length > 0 ? consultantHospitals : hospitals;

          let closest = candidates[0];
          let minDistance = Infinity;

          candidates.forEach(hospital => {
            const distance = getDistance(latitude, longitude, hospital.lat, hospital.lng);
            if (distance < minDistance) {
              minDistance = distance;
              closest = hospital;
            }
          });
          setAutoLocation(closest.name);
        },
        (error) => console.error("Geolocation error:", error)
      );
    }
  }, [isGpsEnabled, hospitals, consultantId]);

  const locationName = isGpsEnabled && autoLocation ? autoLocation : (manualLocation || 'OrthoLife');

  return {
    locationName,
    isGpsEnabled,
    toggleGps,
    handleManualLocationChange,
    hospitals,
    manualLocation,
    autoLocation,
  };
};
