import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function removeBracketedText(text: string): string {
  if (!text) return '';
  // Preserve line breaks by avoiding \s* (which includes newlines).
  // This keeps multi-line fields (e.g., investigations) intact.
  return text.replace(/[ \t]*\(.*?\)[ \t]*/g, ' ').trim();
}

/**
 * Removes the word "guide" (case-insensitive) from a line of text,
 * along with any unrelated punctuation that might be left over.(I commented this out- not using it.)
 * Examples: 
 * "Guide: Low back pain" -> "Low back pain"
 * "Low back exercises guide" -> "Low back exercises"
 */
export function cleanAdviceLine(line: string): string {
  if (!line) return '';
  // Remove 'guide' case-insensitive
  let cleaned = line.replace(/guide/gi, '');
  // Remove leading/trailing punctuation (colon, hyphen, spaces) often used like "Guide: ..."
  // cleaned = cleaned.replace(/^[:\-\s]+|[:\-\s]+$/g, '').trim();
  // Also clean up any double spaces created
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned;
}

export function cleanConsultationData(data: any): any {
  if (!data) return data;

  const cleanMedication = (med: any) => ({
    ...med,
    composition: removeBracketedText(med.composition || med.name),
    dose: removeBracketedText(med.dose),
    frequency: removeBracketedText(med.frequency),
    duration: removeBracketedText(med.duration),
    instructions: removeBracketedText(med.instructions),
    notes: removeBracketedText(med.notes),
  });

  const referredToList = data.referred_to_list && Array.isArray(data.referred_to_list)
    ? data.referred_to_list.map((s: string) => removeBracketedText(s)).filter((s: string) => s && s.trim().length > 0)
    : [];

  // Use the list to populate the string if the list has content, otherwise use the existing string (cleaned)
  const referredToString = referredToList.length > 0
    ? referredToList.map((s: string) => `• ${s}`).join('\n')
    : removeBracketedText(data.referred_to);

  return {
    ...data,
    complaints: removeBracketedText(data.complaints),
    findings: removeBracketedText(data.findings),
    investigations: removeBracketedText(data.investigations),
    diagnosis: removeBracketedText(data.diagnosis),
    advice: removeBracketedText(data.advice),
    followup: removeBracketedText(data.followup),
    referred_by: removeBracketedText(data.referred_by),
    medications: (data.medications?.map(cleanMedication) || []).filter((m: any) => m.composition && m.composition.trim().length > 0),
    procedure: removeBracketedText(data.procedure),
    referred_to: referredToString,
    // maintain the list in cleaned data too, though print might not use it directly yet
    referred_to_list: referredToList,
    weight: removeBracketedText(data.weight),
    height: removeBracketedText(data.height),
    pulse: removeBracketedText(data.pulse),
    spo2: removeBracketedText(data.spo2),
    bp: removeBracketedText(data.bp),
    temperature: removeBracketedText(data.temperature),
    allergy: removeBracketedText(data.allergy),
    medicalHistory: removeBracketedText(data.medicalHistory),
    occupation: removeBracketedText(data.occupation),
    blood_group: removeBracketedText(data.blood_group),
  };
}

export function pruneEmptyFields(data: any): any {
  if (Array.isArray(data)) {
    return data.map(pruneEmptyFields);
  } else if (typeof data === 'object' && data !== null) {
    return Object.entries(data).reduce((acc, [key, value]) => {
      // Keep boolean false (checked checkboxes)
      if (value === '' || value === null || value === undefined) {
        return acc;
      }

      // Prune BP field if it essentially empty (just a separator)
      if (key === 'bp' && typeof value === 'string' && value.trim() === '/') {
        return acc;
      }

      // Special handling for medications to remove empty rows
      if (key === 'medications' && Array.isArray(value)) {
        const validMeds = value.filter((m: any) => m && m.composition && m.composition.trim() !== '');
        if (validMeds.length > 0) {
          acc[key] = validMeds.map(pruneEmptyFields);
        }
        return acc;
      }

      // Special handling for referred_to_list to remove empty strings
      if (key === 'referred_to_list' && Array.isArray(value)) {
        const validItems = value.filter((item: any) => typeof item === 'string' && item.trim() !== '');
        if (validItems.length > 0) {
          acc[key] = validItems;
        }
        return acc;
      }

      // Recursively prune objects
      if (typeof value === 'object') {
        const pruned = pruneEmptyFields(value);
        // If object becomes empty (and wasn't originally an empty array/object we wanted to keep), maybe remove? 
        // For now, let's keep empty objects/arrays if they are significant, 
        // but for consultation data like empty medications array, it's fine.
        acc[key] = pruned;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
  }
  return data;
}
