import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function removeBracketedText(text: string): string {
  if (!text) return '';
  return text.replace(/\s*\(.*?\)\s*/g, ' ').trim();
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
    name: removeBracketedText(med.name),
    dose: removeBracketedText(med.dose),
    frequency: removeBracketedText(med.frequency),
    duration: removeBracketedText(med.duration),
    instructions: removeBracketedText(med.instructions),
    notes: removeBracketedText(med.notes),
  });

  return {
    ...data,
    complaints: removeBracketedText(data.complaints),
    findings: removeBracketedText(data.findings),
    investigations: removeBracketedText(data.investigations),
    diagnosis: removeBracketedText(data.diagnosis),
    advice: removeBracketedText(data.advice),
    followup: removeBracketedText(data.followup),
    medications: data.medications?.map(cleanMedication) || [],
    procedure: removeBracketedText(data.procedure),
    referred_to: removeBracketedText(data.referred_to),
    weight: removeBracketedText(data.weight),
    bp: removeBracketedText(data.bp),
    temperature: removeBracketedText(data.temperature),
    allergy: removeBracketedText(data.allergy),
  };
}
