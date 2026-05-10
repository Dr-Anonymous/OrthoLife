import { normalizeSearchText } from './utils';
import { analyzeResultValue } from './lims-utils';

export interface LimsService {
  id: string;
  name: string;
  type: string;
  result_schema?: any[];
}

export interface LimsRange {
  id: string;
  service_id: string;
  parameter_name: string;
  sex: string;
  min_age: number;
  max_age: number;
  age_unit: string;
  low_value?: number;
  high_value?: number;
  critical_low?: number;
  critical_high?: number;
  display_range?: string;
  normalRange?: string; // Support for schema field
}

export interface ParsedInvestigation {
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  status: 'normal' | 'high' | 'low' | 'critical-high' | 'critical-low' | 'unknown';
  range?: string;
  serviceId?: string;
  prevValue?: number | string;
  originalText: string;
}

export class ClinicalParser {
  private services: LimsService[] = [];
  private ranges: LimsRange[] = [];
  private synonymsMap: Map<string, string> = new Map();

  constructor(services: LimsService[], ranges: LimsRange[]) {
    this.services = services;
    this.ranges = ranges;
    this.initSynonyms();
  }

  private initSynonyms() {
    const synonyms: Record<string, string[]> = {
      'Hemoglobin': ['Hb', 'Hgb', 'Haemoglobin', 'Hemoglobin (Hb)', 'Total Hemoglobin', 'Haemoglobin (Hb)'],
      'C-Reactive Protein': ['CRP', 'C Reactive Protein', 'C.R.P', 'CRP Quantitative', 'HS-CRP', 'HS CRP', 'C-Reactive Protein (CRP)'],
      'White Blood Cells': ['WBC', 'Total Count', 'TLC', 'TC', 'White Cell Count', 'Total WBC Count'],
      'Erythrocyte Sedimentation Rate': ['ESR', 'E.S.R', 'ESR (Erythrocyte Sedimentation Rate)'],
      'Fasting Blood Sugar': ['FBS', 'F.B.S', 'Fasting Sugar', 'Blood Glucose Fasting', 'Glucose Fasting', 'Fasting Blood Glucose', 'Blood Sugar Fasting', 'S. Glucose Fasting', 'S.F.B.S', 'Plasma Glucose (Fasting)'],
      'Post Prandial Blood Sugar': ['PPBS', 'P.P.B.S', 'Post Prandial Sugar', 'Glucose Post Prandial', 'PP Glucose', 'S.P.P.B.S', 'Plasma Glucose (Post Prandial)'],
      'Random Blood Sugar': ['RBS', 'Random Sugar', 'Glucose Random', 'S.R.B.S', 'Plasma Glucose (Random)'],
      'Glycated Hemoglobin': ['HbA1c', 'A1c', 'HbA1C', 'Hb A1c', 'Glycosylated Hemoglobin', 'Hba1c (Glycosylated Haemoglobin)'],
      'Serum Creatinine': ['Creat', 'Creatinine', 'S.Creat', 'S Creatinine', 'S. Creatinine', 'Serum Creatinine'],
      'Uric Acid': ['S.Uric Acid', 'Serum Uric Acid', 'S Uric Acid', 'Serum Uric Acid'],
      'Blood Urea Nitrogen': ['BUN', 'Urea Nitrogen', 'BUN (Blood Urea Nitrogen)'],
      'Thyroid Stimulating Hormone': ['TSH', 'S.TSH', 'S TSH', 'Ultrasensitive TSH'],
      'Vitamin D': ['Vit D', '25-OH Vitamin D', 'Vitamin D3', '25 - Hydroxy Vitamin D'],
      'Vitamin B12': ['Vit B12', 'B12', 'Cyanocobalamin', 'Vitamin B12'],
      'Platelet Count': ['Platelets', 'Plt', 'Platelet', 'Platelet Count'],
      'Calcium': ['S.Calcium', 'Serum Calcium', 'Ca', 'Serum Calcium'],
      'Phosphorus': ['S.Phosphorus', 'Serum Phosphorus', 'P', 'Serum Phosphorus'],
      'Alkaline Phosphatase': ['ALP', 'S.ALP', 'Alk Phos', 'Alkaline Phosphatase'],
      'Urine Routine': ['Urine R/E', 'Urine RE', 'Urine Analysis', 'U/R', 'Urine Routine'],
    };

    for (const [canonical, variants] of Object.entries(synonyms)) {
      const canonLower = normalizeSearchText(canonical);
      this.synonymsMap.set(canonLower, canonLower);
      for (const variant of variants) {
        this.synonymsMap.set(normalizeSearchText(variant), canonLower);
      }
    }
  }

  public getCanonicalName(name: string): string | undefined {
    return this.synonymsMap.get(normalizeSearchText(name));
  }

  public findServiceByName(name: string): LimsService | undefined {
    const query = normalizeSearchText(name);
    const baseName = normalizeSearchText(name.replace(/\(.*?\)/g, '').trim());
    const canonical = this.synonymsMap.get(query) || this.synonymsMap.get(baseName);

    // Helper to check if a service is a good match
    const isGoodMatch = (s: LimsService, q: string, b: string, c?: string) => {
      const sName = normalizeSearchText(s.name);
      const sCanonical = this.synonymsMap.get(sName);
      return sName === q || sName === b || (c && sName === c) || (c && sCanonical === c);
    };

    // 1. Direct/Canonical match - Prioritize those WITH result_schema
    const directMatches = this.services.filter(s => isGoodMatch(s, query, baseName, canonical));
    const bestDirect = directMatches.find(s => s.result_schema && Array.isArray(s.result_schema) && s.result_schema.length > 0) || directMatches[0];
    if (bestDirect) return bestDirect;

    // 2. Check within result_schema of all services (Packages)
    for (const s of this.services) {
      if (s.result_schema && Array.isArray(s.result_schema)) {
        const matchingParam = s.result_schema.find(p => {
          const pName = normalizeSearchText(p.name || '');
          const pBaseName = normalizeSearchText((p.name || '').replace(/\(.*?\)/g, '').trim());
          const pCode = normalizeSearchText(p.parameterCode || '');
          
          const pCanonical = this.synonymsMap.get(pName) || this.synonymsMap.get(pBaseName) || this.synonymsMap.get(pCode);
          
          return pName === query || 
                 pName === baseName ||
                 pBaseName === query ||
                 pBaseName === baseName ||
                 pCode === query ||
                 pCode === baseName ||
                 (canonical && (pName === canonical || pBaseName === canonical || pCode === canonical)) ||
                 (pCanonical && (pCanonical === query || pCanonical === baseName)) ||
                 (canonical && pCanonical === canonical);
        });
        if (matchingParam) return s;
      }
    }

    return undefined;
  }

  private getStatus(value: number | string, range: LimsRange): ParsedInvestigation['status'] {
    if (value === '' || value === undefined || value === null || value === '-') return 'unknown';

    const analysis = analyzeResultValue(
      value,
      range.display_range || range.normalRange,
      range.low_value,
      range.high_value,
      range.critical_low,
      range.critical_high
    );

    if (analysis.status === 'CRITICAL') {
      return analysis.flag?.includes('H') ? 'critical-high' : 'critical-low';
    }
    if (analysis.status === 'ABNORMAL') {
      if (analysis.flag === 'L') return 'low';
      if (analysis.flag === 'H') return 'high';
      return 'high';
    }
    return analysis.status === 'NORMAL' ? 'normal' : 'unknown';
  }

  public findRange(serviceId: string, paramName: string, age?: number, sex?: string): LimsRange | undefined {
    const service = this.services.find(s => String(s.id) === String(serviceId));
    if (!service) return undefined;

    const query = normalizeSearchText(paramName);
    const baseName = normalizeSearchText(paramName.replace(/\(.*?\)/g, '').trim());
    const canonical = this.synonymsMap.get(query) || this.synonymsMap.get(baseName);

    const isMale = sex?.toLowerCase() === 'male' || sex?.toLowerCase() === 'm';
    const isFemale = sex?.toLowerCase() === 'female' || sex?.toLowerCase() === 'f';

    let matchedRange: LimsRange | undefined;

    let externalRanges = this.ranges.filter(r => String(r.service_id) === String(service.id));
    
    if (externalRanges.length > 0) {
      // Filter by sex/age
      const specificRanges = externalRanges.filter(r => {
        const rSex = r.sex?.toLowerCase();
        const sexMatch = !rSex || rSex === 'both' || rSex === 'any' || 
          (isMale && (rSex === 'male' || rSex === 'm')) || 
          (isFemale && (rSex === 'female' || rSex === 'f'));
        const ageMatch = !age || (age >= (r.min_age || 0) && age <= (r.max_age || 999));
        return sexMatch && ageMatch;
      });

      const targetPool = specificRanges.length > 0 ? specificRanges : externalRanges;

      if (service.result_schema && Array.isArray(service.result_schema) && service.result_schema.length > 0) {
        matchedRange = targetPool.find(r => {
          const rName = normalizeSearchText(r.parameter_name || '');
          const rBaseName = normalizeSearchText((r.parameter_name || '').replace(/\(.*?\)/g, '').trim());
          const rCanonical = this.synonymsMap.get(rName) || this.synonymsMap.get(rBaseName);
          
          return rName === query || 
                 rName === baseName || 
                 rBaseName === query ||
                 rBaseName === baseName ||
                 (canonical && (rName === canonical || rBaseName === canonical)) ||
                 (rCanonical && (rCanonical === query || rCanonical === baseName || (canonical && rCanonical === canonical)));
        });
      }
      
      // Only default to first range if it's a single-parameter service
      if (!matchedRange && (!service.result_schema || service.result_schema.length <= 1)) {
        matchedRange = targetPool[0];
      }
    }

    if (!matchedRange && service.result_schema && Array.isArray(service.result_schema)) {
      const schemaParam = service.result_schema.find(p => {
        const pName = normalizeSearchText(p.name || '');
        const pBaseName = normalizeSearchText((p.name || '').replace(/\(.*?\)/g, '').trim());
        const pCode = normalizeSearchText(p.parameterCode || '');
        
        const pCanonical = this.synonymsMap.get(pName) || this.synonymsMap.get(pBaseName) || this.synonymsMap.get(pCode);
        
        return pName === query || 
               pName === baseName ||
               pBaseName === query ||
               pBaseName === baseName ||
               pCode === query ||
               pCode === baseName ||
               (canonical && (pName === canonical || pBaseName === canonical || pCode === canonical)) ||
               (pCanonical && (pCanonical === query || pCanonical === baseName)) ||
               (canonical && pCanonical === canonical);
      });

      const finalParam = schemaParam || (service.result_schema.length === 1 ? service.result_schema[0] : undefined);

      if (finalParam) {
        matchedRange = {
          id: service.id + '-schema',
          service_id: service.id,
          parameter_name: finalParam.name,
          sex: 'both',
          min_age: 0,
          max_age: 999,
          age_unit: 'years',
          low_value: finalParam.minLimit,
          high_value: finalParam.maxLimit,
          critical_low: finalParam.criticalLow,
          critical_high: finalParam.criticalHigh,
          display_range: finalParam.normalRange,
        };
      }
    }

    return matchedRange;
  }

  public parse(text: string, patientMetadata?: { age?: number, sex?: string }): ParsedInvestigation[] {
    if (!text) return [];

    const lines = text.split('\n');
    const results: ParsedInvestigation[] = [];
    const age = patientMetadata?.age;
    const pSex = patientMetadata?.sex;

    const medicalKeywords = ['positive', 'negative', 'absent', 'present', 'nil', 'detected', 'reactive', 'non-reactive', 'normal', 'abnormal', 'reactive'];
    const keywordsPattern = medicalKeywords.join('|');

    for (const line of lines) {
      if (!line.trim()) continue;

      // Allow empty values if there is a colon or equals sign
      const regex = new RegExp(`([a-zA-Z0-9\\s\\-\\.\\/\\(\\)]+?)([:=])\\s*(${keywordsPattern}|(?:<|<=|>|>=)?\\s*\\d*\\.?\\d*)?`, 'gi');
      let match;

      while ((match = regex.exec(line)) !== null) {
        const rawName = match[1].trim();
        const rawValue = (match[3] || '').trim();
        
        if (rawName.length < 2 || !/[a-zA-Z0-9]/.test(rawName)) continue;
        
        const valNum = parseFloat(rawValue.replace(/[^\d\.]/g, ''));
        const value = rawValue === '' ? '' : (isNaN(valNum) ? rawValue : valNum);

        const service = this.findServiceByName(rawName);
        
        const stopwords = ['last', 'ref', 'normal', 'range', 'age', 'value', 'date', 'prev', 'previous', 'to', 'for', 'visit', 'at'];
        if (!service && stopwords.includes(rawName.toLowerCase())) continue;

        let status: ParsedInvestigation['status'] = 'unknown';
        const matchedRange = this.findRange(service?.id || '', rawName, age, pSex);
        
        if (matchedRange) {
          status = this.getStatus(value, matchedRange);
        }

        results.push({
          id: service?.id || '',
          name: matchedRange?.parameter_name || service?.name || rawName,
          value,
          status,
          range: matchedRange?.display_range || matchedRange?.normalRange || '',
          originalText: match[0],
          serviceId: service?.id
        });
      }
    }

    return results;
  }
}
