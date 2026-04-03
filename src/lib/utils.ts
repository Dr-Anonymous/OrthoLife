import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a medication name by removing common pharmaceutical prefixes (T, Tab, Cap, etc.)
 * and converting to lowercase for consistent comparison and filtering.
 */
export function normalizeMedName(name: string | null | undefined): string {
  if (!name) return "";
  let clean = name.toLowerCase().trim();
  // Strip common pharmaceutical prefixes repeatedly (e.g., "Tab. T. OMNACORTIL")
  const prefixRegex = /^(t|c|cap|tab|inj|syr|syt|syp|ointment|cream|gel|pow|powder|drops|susp|mist|crm|lot|caps|tabs|pint|p\.int|p\.inj|supp|pdr|tab\.|cap\.|syr\.|inj\.|syp\.|syp|t\.|c\.|g\.|s\.|m\.|tab\s|cap\s|inj\s|syr\s|t\s|c\s)[\s.]*/i;
  
  let oldClean;
  do {
    oldClean = clean;
    clean = clean.replace(prefixRegex, '').trim();
  } while (clean !== oldClean);
  
  return clean;
}

/**
 * Removes bracketed text from strings.
 */
export function removeBracketedText(text: string): string {
  if (!text) return '';
  // Preserve line breaks by avoiding \s* (which includes newlines).
  // This keeps multi-line fields (e.g., investigations) intact.
  return text.replace(/[ \t]*\(.*?\)[ \t]*/g, ' ').trim();
}

/**
 * Removes the word "guide" (case-insensitive) from a line of text,
 * along with any unrelated punctuation that might be left over.
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

  const hasReferredToListField = 'referred_to_list' in data && Array.isArray(data.referred_to_list);
  const referredToList = hasReferredToListField
    ? data.referred_to_list.map((s: string) => removeBracketedText(s)).filter((s: string) => s && s.trim().length > 0)
    : [];

  // Use the list to populate the string if the list field exists, otherwise use the existing string (cleaned)
  // This prevents resurrection of deleted fields when the user clears the list.
  const referredToString = hasReferredToListField
    ? (referredToList.length > 0 ? referredToList.map((s: string) => `• ${s}`).join('\n') : '')
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

/**
 * Calculates a future date based on follow-up instruction text.
 * Supports patterns like "X days", "X weeks", "X months", "X years" in English and Telugu.
 * Handles phrases like "వారం తర్వాత" (1 week after) without explicit digits.
 */
export function calculateFollowUpDate(message: string, baseDate: Date = new Date()): string | null {
  if (!message) return null;

  const text = message.toLowerCase();
  
  // Define patterns
  const patterns = [
    { regex: /(\d+)?\s*(year|years|సంవత్సరం|సంవత్సరాలు|సంవత్సరాల)/i, unit: 'years' },
    { regex: /(\d+)?\s*(month|months|నెల|నెలలు|నెలల)/i, unit: 'months' },
    { regex: /(\d+)?\s*(week|weeks|వారం|వారాలు|వారాల)/i, unit: 'weeks' },
    { regex: /(\d+)?\s*(day|days|రోజు|రోజులు|రోజుల)/i, unit: 'days' }
  ];

  for (const { regex, unit } of patterns) {
    const match = text.match(regex);
    if (match) {
      // If digit (\d+) is missing, assume 1 (e.g., "వారం తర్వాత")
      const countString = match[1];
      const count = countString ? parseInt(countString) : 1;
      
      const date = new Date(baseDate);
      
      if (unit === 'days') date.setDate(date.getDate() + count);
      else if (unit === 'weeks') date.setDate(date.getDate() + count * 7);
      else if (unit === 'months') date.setMonth(date.getMonth() + count);
      else if (unit === 'years') date.setFullYear(date.getFullYear() + count);
      
      // Fix UTC shift: use local date components to build YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Trims standard follow-up prefixes to show only patient-specific notes.
 * Eg: "5 రోజుల తర్వాత / వెంటనే- ఏవైనా లక్షణాలు తీవ్రమైతే for injection" -> "for injection"
 */
export function stripFollowUpPrefix(text: string | null | undefined): string {
  if (!text) return '-';
  
  // Standard templates from Consultation.tsx
  // EN: after {{count}} {{unit}}, or immediately if symptoms worsen.
  // TE: {{count}} {{unit}} / వెంటనే- ఏవైనా లక్షణాలు తీవ్రమైతే.
  
  // Regex to match the common prefix patterns
  // Telugu pattern: \d+ (unit name) (after/later) / immediately...
  const teluguPrefixRegex = /^\d+\s*(రోజు|రోజుల|వారం|వారాల|నెల|నెలల|సంవత్సరం|సంవత్సరాల)?\s*(తర్వాత)?\s*\/\s*వెంటనే-\s*ఏవైనా\s*లక్షణాలు\s*తీవ్రమైతే\.?\s*/i;
  
  // English pattern: after \d+ (units), or immediately...
  const englishPrefixRegex = /^after\s*\d+\s*(day|days|week|weeks|month|months|year|years),?\s*or\s*immediately\s*if\s*symptoms\s*worsen\.?\s*/i;

  let stripped = text.replace(teluguPrefixRegex, '').replace(englishPrefixRegex, '');
  
  // Also handle cases where there might be a trailing dot or space left over
  stripped = stripped.trim();
  
  return stripped || '-';
}
