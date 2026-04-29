import { format } from "date-fns";

/**
 * Merges a Date object and a time string (HH:mm) into a single local Date object.
 * @param date - The date to use
 * @param time - The time string in HH:mm format
 * @returns A merged Date object or null if time is invalid
 */
export const getNextHour = () => {
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return format(nextHour, "HH:mm");
};

export const getLocalDateTime = (date: Date, time?: string) => {
  // If time is not provided or empty, default to the next full hour
  const timeToUse = time || getNextHour();
  const [hours, minutes] = timeToUse.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
};
