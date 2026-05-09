import { LimsService, LimsRange } from "@/hooks/useLimsCatalog";
import { normalizeSearchText } from "./utils";

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
    // Common medical synonyms - normalized keys
    const commonSynonyms: Record<string, string[]> = {
      'Hemoglobin': ['Hb', 'Hgb', 'Haemoglobin', 'Hemoglobin'],
      'C-Reactive Protein': ['CRP', 'C Reactive Protein'],
      'White Blood Cells': ['WBC', 'Total Count', 'TLC', 'TC'],
      'Erythrocyte Sedimentation Rate': ['ESR'],
      'Fasting Blood Sugar': ['FBS', 'F.B.S', 'Fasting Sugar', 'Blood Sugar Fasting'],
      'Post Prandial Blood Sugar': ['PPBS', 'P.P.B.S', 'Post Prandial Sugar'],
      'Random Blood Sugar': ['RBS', 'Random Sugar'],
      'Glycated Hemoglobin': ['HbA1c', 'A1c', 'HbA1C', 'Hb A1c', 'Glycosylated Hemoglobin'],
      'Serum Creatinine': ['Creat', 'Creatinine', 'S.Creat', 'S Creatinine'],
      'Uric Acid': ['S.Uric Acid', 'Serum Uric Acid', 'S Uric Acid'],
      'Thyroid Stimulating Hormone': ['TSH', 'S.TSH', 'Thyroid', 'S TSH', 'S. TSH', 'Ultra TSH'],
      'Prothrombin Time': ['PT', 'INR', 'PT/INR', 'Prothrombin'],
      'Free T4': ['FT4', 'Free Thyroxine'],
      'Free T3': ['FT3', 'Free Triiodothyronine'],
      'Vitamin D': ['Vit D', '25-OH Vit D', 'Vitamin D3', 'Vit D3'],
      'Vitamin B12': ['Vit B12', 'Cobalamin', 'B12'],
      'Calcium': ['S.Calcium', 'Serum Calcium', 'Ca'],
      'Potassium': ['S.Potassium', 'K+', 'K'],
      'Sodium': ['S.Sodium', 'Na+', 'Na'],
      'Platelet Count': ['PLT', 'Platelets'],
      'Urea': ['S.Urea', 'Serum Urea'],
    };

    for (const [canonical, variations] of Object.entries(commonSynonyms)) {
      const normalizedCanonical = normalizeSearchText(canonical);
      variations.forEach(v => this.synonymsMap.set(normalizeSearchText(v), normalizedCanonical));
      this.synonymsMap.set(normalizedCanonical, normalizedCanonical);
    }
  }

  private findServiceByName(name: string): LimsService | undefined {
    const query = normalizeSearchText(name);
    if (!query) return undefined;

    // Helper to prioritize 'test' over 'package'
    const prioritize = (matches: LimsService[]) => {
      if (matches.length === 0) return undefined;
      // Sort: Tests first, then alphabetical, then shorter names
      const sorted = [...matches].sort((a, b) => {
        if (a.type === 'test' && b.type !== 'test') return -1;
        if (a.type !== 'test' && b.type === 'test') return 1;
        
        // Exact match of query with a service name part should win
        const aName = normalizeSearchText(a.name);
        const bName = normalizeSearchText(b.name);
        if (aName === query && bName !== query) return -1;
        if (bName === query && aName !== query) return 1;
        
        return a.name.length - b.name.length;
      });
      return sorted[0];
    };

    // 1. Direct match with name in catalog (Normalized)
    const directMatches = this.services.filter(s => normalizeSearchText(s.name) === query);
    if (directMatches.length > 0) return prioritize(directMatches);

    // 2. Try direct synonym match
    const canonical = this.synonymsMap.get(query);
    if (canonical) {
      const synMatches = this.services.filter(s => {
        const sName = normalizeSearchText(s.name);
        return sName === canonical || this.synonymsMap.get(sName) === canonical;
      });
      if (synMatches.length > 0) return prioritize(synMatches);
    }

    // 3. Word boundary / Smart match (Essential for short strings like "Hb")
    // Use a regex that looks for the query as a standalone word
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRegex = new RegExp(`(^|[^a-z0-9])${escapedQuery}([^a-z0-9]|$)`, 'i');
    const wordMatches = this.services.filter(s => wordRegex.test(s.name));
    if (wordMatches.length > 0) return prioritize(wordMatches);

    // 4. Substring match (Only for longer queries to avoid noise)
    if (query.length > 3) {
      const fuzzyMatches = this.services.filter(s => normalizeSearchText(s.name).includes(query));
      if (fuzzyMatches.length > 0) return prioritize(fuzzyMatches);
    }

    // 5. Synonym Substring
    for (const [synonym, canon] of this.synonymsMap.entries()) {
      if (query.includes(synonym) && synonym.length >= 3) {
        const canonMatches = this.services.filter(s => normalizeSearchText(s.name) === canon);
        if (canonMatches.length > 0) return prioritize(canonMatches);
      }
    }

    return undefined;
  }

  private getStatus(value: number, range: LimsRange): ParsedInvestigation['status'] {
    // Robust parsing - handle both snake_case (DB) and camelCase (potential JS)
    const getVal = (obj: any, keys: string[]) => {
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
          // If it's a string like "11-13.5", parse the first or last number depending on context
          const val = typeof obj[key] === 'string' ? parseFloat(obj[key]) : obj[key];
          if (!isNaN(val)) return val;
        }
      }
      return NaN;
    };
    
    let critHigh = getVal(range, ['critical_high', 'criticalHigh']);
    let critLow = getVal(range, ['critical_low', 'criticalLow']);
    let high = getVal(range, ['high_value', 'highValue', 'upper_limit', 'high']);
    let low = getVal(range, ['low_value', 'lowValue', 'lower_limit', 'low']);

    // Special handling for "normalRange" string (e.g. "0.8-1.2")
    const normalRangeStr = (range as any).normalRange || (range as any).normal_range;
    if (normalRangeStr && typeof normalRangeStr === 'string' && isNaN(low) && isNaN(high)) {
      const parts = normalRangeStr.split(/[\-\s]+/);
      if (parts.length >= 2) {
        low = parseFloat(parts[0]);
        high = parseFloat(parts[parts.length - 1]);
      } else if (normalRangeStr.startsWith('<')) {
        high = parseFloat(normalRangeStr.substring(1));
      } else if (normalRangeStr.startsWith('>')) {
        low = parseFloat(normalRangeStr.substring(1));
      }
    }

    if (!isNaN(critHigh) && value >= critHigh) return 'critical-high';
    if (!isNaN(critLow) && value <= critLow) return 'critical-low';
    if (!isNaN(high) && value > high) return 'high';
    if (!isNaN(low) && value < low) return 'low';
    
    if (isNaN(critHigh) && isNaN(critLow) && isNaN(high) && isNaN(low)) {
      return 'unknown';
    }

    return 'normal';
  }

  public parse(text: string, patientMetadata?: { age?: number, sex?: string }): ParsedInvestigation[] {
    if (!text) return [];

    const results: ParsedInvestigation[] = [];
    const lines = text.split('\n');

    const pSex = patientMetadata?.sex;
    const isMale = pSex === 'M' || pSex === 'Male' || pSex === 'male';
    const isFemale = pSex === 'F' || pSex === 'Female' || pSex === 'female';

    for (const line of lines) {
      if (!line.trim()) continue;

      const regex = /([a-zA-Z0-9\s\-\.\/\(\)]*?[a-zA-Z0-9\/\)])([\-\:\s\=\(]+)(\d+\.?\d*)/g;
      let match;

      while ((match = regex.exec(line)) !== null) {
        const rawName = match[1].trim();
        const value = parseFloat(match[3]);

        if (isNaN(value)) continue;

        const service = this.findServiceByName(rawName);
        
        const stopwords = ['last', 'ref', 'normal', 'range', 'age', 'value', 'date', 'prev', 'previous', 'to', 'for', 'visit', 'at'];
        if (!service && stopwords.includes(rawName.toLowerCase())) continue;

        let status: ParsedInvestigation['status'] = 'unknown';
        let matchedRange: LimsRange | undefined;

        if (service) {
          // 1. Check external ranges (reference_ranges table)
          const externalRanges = this.ranges.filter(r => String(r.service_id) === String(service.id));
          
          if (externalRanges.length > 0) {
            matchedRange = externalRanges.find(r => {
              const rSex = r.sex?.toLowerCase();
              const sexMatch = !rSex || rSex === 'both' || rSex === 'any' ||
                (isMale && (rSex === 'male' || rSex === 'm')) ||
                (isFemale && (rSex === 'female' || rSex === 'f'));

              const age = patientMetadata?.age || 30;
              const minAge = r.min_age !== undefined ? r.min_age : 0;
              const maxAge = r.max_age !== undefined ? r.max_age : 150;
              
              const ageMatch = age >= minAge && age <= maxAge;
              return sexMatch && ageMatch;
            }) || externalRanges[0];
          }

          // 2. Fallback: Check embedded ranges in result_schema
          if (!matchedRange && service.result_schema && Array.isArray(service.result_schema)) {
            const query = normalizeSearchText(rawName);
            const schemaParam = service.result_schema.find(p => 
                normalizeSearchText(p.name) === query || 
                normalizeSearchText(p.parameterCode) === query ||
                normalizeSearchText(service.name) === query
            );

            if (schemaParam) {
              matchedRange = {
                id: service.id,
                service_id: service.id,
                parameter_name: schemaParam.name,
                ...schemaParam
              } as LimsRange;
            }
          }

          if (matchedRange) {
            status = this.getStatus(value, matchedRange);
          }
        }

        results.push({
          name: service?.name || rawName,
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
