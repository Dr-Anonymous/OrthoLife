import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function removeBracketedText(text: string): string {
  if (!text) return '';
  return text.replace(/\s*\(.*?\)\s*/g, ' ').trim();
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
  };
}
