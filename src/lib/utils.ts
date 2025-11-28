import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function removeBracketedText(text: string): string {
  if (!text) return '';
  return text.replace(/\s*\(.*?\)\s*/g, ' ').trim();
}
