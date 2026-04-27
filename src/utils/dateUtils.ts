/**
 * Merges a Date object and a time string (HH:mm) into a single local Date object.
 * @param date - The date to use
 * @param time - The time string in HH:mm format
 * @returns A merged Date object or null if time is invalid
 */
export const getLocalDateTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const merged = new Date(date);
  merged.setHours(hours, minutes, 0, 0);
  return merged;
};
