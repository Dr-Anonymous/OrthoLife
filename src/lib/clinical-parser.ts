import { LimsService, LimsRange } from "@/hooks/useLimsCatalog";

export interface ParsedInvestigation {
  name: string;
  value?: number;
  unit?: string;
  status?: 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high' | 'unknown';
  range?: LimsRange;
  originalText: string;
}

/**
 * Clinical Parser Utility
 * 
 * Extracts test names and values from unstructured text.
 * Compares results against the LIMS reference ranges.
 */
export class ClinicalParser {
  private services: LimsService[];
  private ranges: LimsRange[];
  private synonymsMap: Map<string, string>;

  constructor(services: LimsService[] = [], ranges: LimsRange[] = []) {
    this.services = services;
    this.ranges = ranges;
    this.synonymsMap = new Map();
    this.initializeSynonyms();
  }

  private initializeSynonyms() {
    // Common medical synonyms
    const commonSynonyms: Record<string, string[]> = {
      'Hemoglobin': ['Hb', 'Hgb', 'Haemoglobin'],
      'C-Reactive Protein': ['CRP'],
      'White Blood Cells': ['WBC', 'Total Count', 'TC'],
      'Erythrocyte Sedimentation Rate': ['ESR'],
      'Fast Blood Sugar': ['FBS'],
      'Post Prandial Blood Sugar': ['PPBS'],
      'Glycated Hemoglobin': ['HbA1c', 'A1c'],
      'Serum Creatinine': ['Creat', 'Creatinine', 'S.Creat'],
      'Uric Acid': ['S.Uric Acid'],
      'Thyroid Stimulating Hormone': ['TSH'],
      'Free T4': ['FT4'],
      'Free T3': ['FT3'],
      'Vitamin D': ['Vit D', '25-OH Vit D'],
      'Vitamin B12': ['Vit B12', 'Cobalamin'],
    };

    for (const [canonical, variations] of Object.entries(commonSynonyms)) {
      variations.forEach(v => this.synonymsMap.set(v.toLowerCase(), canonical.toLowerCase()));
      this.synonymsMap.set(canonical.toLowerCase(), canonical.toLowerCase());
    }
  }

  private findServiceByName(name: string): LimsService | undefined {
    const normalized = name.toLowerCase().trim();
    const canonical = this.synonymsMap.get(normalized) || normalized;
    
    return this.services.find(s => 
      s.name.toLowerCase() === canonical || 
      s.name.toLowerCase() === normalized
    );
  }

  private getStatus(value: number, range: LimsRange): ParsedInvestigation['status'] {
    if (range.critical_high !== undefined && value >= range.critical_high) return 'critical-high';
    if (range.critical_low !== undefined && value <= range.critical_low) return 'critical-low';
    if (range.high_value !== undefined && value > range.high_value) return 'high';
    if (range.low_value !== undefined && value < range.low_value) return 'low';
    return 'normal';
  }

  /**
   * Parses a block of text into structured investigations.
   * Pattern: "TestName: Value" or "TestName Value"
   */
  public parse(text: string, patientMetadata?: { age?: number, sex?: string }): ParsedInvestigation[] {
    if (!text) return [];

    const results: ParsedInvestigation[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      // Regex to find "Name: Value" or "Name Value"
      // Groups: 1: Name, 2: Separator, 3: Value
      const regex = /([a-zA-Z0-9\s\-\.\/]+)([:\s\=\(]+)(\d+\.?\d*)/g;
      let match;

      while ((match = regex.exec(line)) !== null) {
        const name = match[1].trim();
        const value = parseFloat(match[3]);
        
        if (isNaN(value)) continue;

        const service = this.findServiceByName(name);
        let status: ParsedInvestigation['status'] = 'unknown';
        let matchedRange: LimsRange | undefined;

        if (service) {
          // Find matching range for age/sex
          const ranges = this.ranges.filter(r => r.service_id === service.id);
          matchedRange = ranges.find(r => {
            const sexMatch = !r.sex || r.sex === 'Both' || r.sex === patientMetadata?.sex;
            const age = patientMetadata?.age || 30; // Default to adult if unknown
            const ageMatch = age >= r.min_age && age <= r.max_age;
            return sexMatch && ageMatch;
          });

          if (matchedRange) {
            status = this.getStatus(value, matchedRange);
          }
        }

        results.push({
          name: service?.name || name,
          value,
          status,
          range: matchedRange,
          originalText: match[0]
        });
      }
    }

    return results;
  }
}
