import { normalizeSearchText } from './utils';
import { analyzeResultValue } from './lims-utils';
import { ParsedInvestigation } from '@/types/consultation';

export interface LimsService {
  id: string;
  name: string;
  type: string; // 'LAB', 'SCAN', 'PACKAGE', 'CONSULTANT'
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
  criticalAlertMessage?: string;
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
      'Glycated Hemoglobin': ['HbA1c', 'A1c', 'HbA1C', 'Hb A1c', 'Hb A1C', 'Glycosylated Hemoglobin', 'Hba1c (Glycosylated Haemoglobin)', 'GLYCOSYLATED HAEMOGLOBIN (A1C)', 'GLYCOSYLATED HAEMOGLOBIN', 'GHB'],
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

    // 1. Try exact matches first
    const exactMatch = this.services.find(s => {
      const sName = normalizeSearchText(s.name);
      return sName === query || (canonical && sName === canonical);
    });
    if (exactMatch) return exactMatch;

    // 2. Try canonical/synonym matches on the service record itself
    const synonymMatch = this.services.find(s => {
      const sName = normalizeSearchText(s.name);
      const sCanonical = this.synonymsMap.get(sName);
      return (canonical && sCanonical === canonical);
    });
    if (synonymMatch) return synonymMatch;

    // 3. Try base name match (stripped of parentheses)
    const baseMatch = this.services.find(s => {
      const sName = normalizeSearchText(s.name);
      return sName === baseName;
    });
    if (baseMatch) return baseMatch;

    // 4. Check within result_schema of all services (Packages)
    for (const s of this.services) {
      if (s.result_schema && Array.isArray(s.result_schema)) {
        const matchingParam = s.result_schema.find(p => {
          const pName = normalizeSearchText(p.name || '');
          const pBaseName = normalizeSearchText((p.name || '').replace(/\(.*?\)/g, '').trim());
          const pCode = normalizeSearchText(p.parameterCode || '');
          
          const pCanonical = this.synonymsMap.get(pName) || this.synonymsMap.get(pBaseName) || this.synonymsMap.get(pCode);
          
          return pName === query || 
                 pName === baseName ||
                 pCode === query ||
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

    if (service.result_schema && Array.isArray(service.result_schema)) {
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
        const schemaRange: LimsRange = {
          id: (matchedRange?.id || service.id) + '-schema',
          service_id: service.id,
          parameter_name: finalParam.name || paramName,
          sex: matchedRange?.sex || 'both',
          min_age: matchedRange?.min_age || 0,
          max_age: matchedRange?.max_age || 999,
          age_unit: matchedRange?.age_unit || 'years',
          low_value: finalParam.minLimit ?? finalParam.low_value ?? finalParam.min_limit ?? finalParam.min_value,
          high_value: finalParam.maxLimit ?? finalParam.high_value ?? finalParam.max_limit ?? finalParam.max_value,
          critical_low: finalParam.criticalLow ?? finalParam.critical_low,
          critical_high: finalParam.criticalHigh ?? finalParam.critical_high,
          display_range: finalParam.normalRange ?? finalParam.display_range ?? finalParam.range,
          criticalAlertMessage: finalParam.criticalAlertMessage ?? finalParam.critical_alert_message,
        };

        if (matchedRange) {
           matchedRange = {
             ...matchedRange,
             critical_low: matchedRange.critical_low ?? schemaRange.critical_low,
             critical_high: matchedRange.critical_high ?? schemaRange.critical_high,
             criticalAlertMessage: matchedRange.criticalAlertMessage || schemaRange.criticalAlertMessage,
           };
        } else {
           matchedRange = schemaRange;
        }
      }
    }

    // Final filter for display_range if it contains both M and F info
    // This MUST run even if matchedRange was found via schema above
    if (matchedRange?.display_range && (matchedRange.display_range.includes('(M)') || matchedRange.display_range.includes('(F)'))) {
      const isMale = sex?.toLowerCase() === 'male' || sex?.toLowerCase() === 'm';
      const isFemale = sex?.toLowerCase() === 'female' || sex?.toLowerCase() === 'f';
      
      const mMatch = matchedRange.display_range.match(/([0-9\.\- ]+)\(M\)/);
      const fMatch = matchedRange.display_range.match(/([0-9\.\- ]+)\(F\)/);
      
      if (isMale && mMatch) return { ...matchedRange, display_range: mMatch[1].trim() };
      if (isFemale && fMatch) return { ...matchedRange, display_range: fMatch[1].trim() };
    }

    return matchedRange;
  }

  public parse(text: string, patientMetadata?: { age?: number, sex?: string }): ParsedInvestigation[] {
    if (!text) return [];

    const results: ParsedInvestigation[] = [];
    const age = patientMetadata?.age;
    const pSex = patientMetadata?.sex;

    const medicalKeywords = [
      'positive', 'negative', 'absent', 'present', 'nil', 'detected', 
      'reactive', 'non-reactive', 'normal', 'abnormal', 'noted', 'seen',
      'observed', 'visualized', 'fracture', 'effusion', 'degeneration',
      'metastasized', 'stable', 'unchanged', 'improved'
    ];
    const keywordsPattern = medicalKeywords.join('|');

    // 1. Pre-parse the entire text to find all explicit results and their metadata.
    const allResults: ParsedInvestigation[] = [];
    const lines = text.split('\n');
    
    let currentDateContext: string | undefined = undefined;
    const dateHeaderRegex = /^\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})[:]?\s*$/;
    
    let tempOffset = 0;
    lines.forEach((line, lineIdx) => {
      const dateMatch = line.match(dateHeaderRegex);
      if (dateMatch) {
        currentDateContext = dateMatch[1];
        tempOffset += line.length + 1;
        return;
      }

      // Improved regex: less greedy on commas, and better lookahead
      // This regex handles "Name: Value", "Name = Value", "Name - Value"
      // Ultimate Simplification: One test per line. 
      // Captures the first "Name: Value" pattern and treats the rest of the line as the value.
      const regex = new RegExp(`^\\s*([a-zA-Z0-9\\s\\-\\.\\/\\(\\)\\&]+?)([:=])\\s*(.*)$`, 'gi');
      
      let m;
      let matchedIndices = new Set<number>();

      while ((m = regex.exec(line)) !== null) {
        const rawName = m[1].trim();
        const rawValue = (m[3] || '').trim().replace(/[,;]$/, ''); // Remove trailing comma/semicolon
        if (rawName.length < 2 || !/[a-zA-Z0-9]/.test(rawName)) continue;

        const cleanValue = rawValue.replace(/\s+/g, '');
        const isNumeric = /^[<>=]?\d*\.?\d+$/.test(cleanValue);
        const valNum = isNumeric ? parseFloat(cleanValue.replace(/[<>=]/g, '')) : NaN;
        const value = isNumeric ? valNum : rawValue;

        const service = this.findServiceByName(rawName);
        const stopwords = ['last', 'ref', 'normal', 'range', 'age', 'value', 'date', 'prev', 'previous', 'to', 'for', 'visit', 'at'];
        if (!service && stopwords.includes(rawName.toLowerCase())) continue;

        const matchedRange = this.findRange(service?.id || '', rawName, age, pSex);
        let status: ParsedInvestigation['status'] = 'unknown';
        if (matchedRange) {
          status = this.getStatus(value, matchedRange);
        }

        allResults.push({
          id: service?.id || '',
          name: matchedRange?.parameter_name || service?.name || rawName,
          value,
          status,
          range: matchedRange?.display_range || matchedRange?.normalRange || '',
          criticalAlert: (status === 'critical-high' || status === 'critical-low') ? matchedRange?.criticalAlertMessage : undefined,
          originalText: m[0],
          startIndex: tempOffset + m.index,
          endIndex: tempOffset + m.index + m[0].length,
          serviceId: service?.id,
          date: currentDateContext
        });

        for (let i = m.index; i < m.index + m[0].length; i++) matchedIndices.add(i);
      }

      // 2. Fallback: Look for "Name Value" pairs for known synonyms (e.g., "FBS 120")
      // Split remaining parts of the line by spaces/commas and check for known terms
      const remainingText = line.split('').map((char, i) => matchedIndices.has(i) ? ' ' : char).join('');
      const tokens = remainingText.split(/[\s,]+/);
      
      for (let i = 0; i < tokens.length - 1; i++) {
        const token = tokens[i].trim();
        if (token.length < 2) continue;
        
        let nextToken = (tokens[i+1] || '').trim();
        let tokenSkipCount = 1;

        // Skip lone hyphen if present (e.g., "Hb - 12")
        if (nextToken === '-' && tokens[i+2]) {
          nextToken = tokens[i+2].trim();
          tokenSkipCount = 2;
        }

        const service = this.findServiceByName(token);
        if (service) {
          // Check if next token is a value (numeric or status keyword)
          const isNumeric = /^[<>=]?\d*\.?\d+$/.test(nextToken);
          const isStatus = ['positive', 'negative', 'reactive', 'nil', 'normal', 'abnormal'].includes(nextToken.toLowerCase());
          
          if (isNumeric || isStatus) {
            const value = isNumeric ? parseFloat(nextToken.replace(/[<>=]/g, '')) : nextToken;
            const matchedRange = this.findRange(service.id, token, age, pSex);
            let status: ParsedInvestigation['status'] = 'unknown';
            if (matchedRange) {
              status = this.getStatus(value, matchedRange);
            }

            allResults.push({
              id: service.id,
              name: matchedRange?.parameter_name || service.name,
              value,
              status,
              range: matchedRange?.display_range || matchedRange?.normalRange || '',
              criticalAlert: (status === 'critical-high' || status === 'critical-low') ? matchedRange?.criticalAlertMessage : undefined,
              originalText: tokenSkipCount === 2 ? `${token} - ${nextToken}` : `${token} ${nextToken}`,
              startIndex: tempOffset + line.indexOf(token),
              endIndex: tempOffset + line.indexOf(nextToken) + nextToken.length,
              serviceId: service.id,
              date: currentDateContext
            });
            i += tokenSkipCount; 
            break; // One test per line
          }
        }
      }
      tempOffset += line.length + 1;
    });

    const finalResults: ParsedInvestigation[] = [];
    const claimedExplicitIndices = new Set<number>();

    // 2. Second pass: Build final results, expanding packages and claiming explicit results
    allResults.forEach((res, resIdx) => {
      if (claimedExplicitIndices.has(resIdx)) return;

      const service = this.services.find(s => s.id === res.serviceId);
      const isPackage = (service?.type?.toUpperCase() === 'PACKAGE' || (service?.result_schema && service.result_schema.length > 1));
      const isPlaceholder = res.value === '-' || res.value === '';
      const isExactServiceMatch = service && normalizeSearchText(service.name) === normalizeSearchText(res.originalText.split(/[:=]|\s-\s|(?<=[a-zA-Z0-9])-(?=\s)/)[0].trim());

      if (isExactServiceMatch && isPackage && isPlaceholder) {
        // Expand this package!
        service?.result_schema?.forEach((param: any) => {
          const pCanonical = this.getCanonicalName(param.name) || normalizeSearchText(param.name);
          
          // Look for an explicit result for this parameter elsewhere in the text
          const explicitIdx = allResults.findIndex((r, idx) => 
            idx !== resIdx && 
            !claimedExplicitIndices.has(idx) && 
            (this.getCanonicalName(r.name) === pCanonical || normalizeSearchText(r.name) === pCanonical)
          );

          if (explicitIdx !== -1) {
            finalResults.push(allResults[explicitIdx]);
            claimedExplicitIndices.add(explicitIdx);
          } else {
            // Add as placeholder
            const subService = this.findServiceByName(param.name);
            const matchedRange = this.findRange(subService?.id || service.id, param.name, age, pSex);
            finalResults.push({
              id: subService?.id || service.id,
              name: matchedRange?.parameter_name || param.name,
              value: '-',
              status: 'unknown',
              range: matchedRange?.display_range || matchedRange?.normalRange || '',
              criticalAlert: undefined,
              originalText: undefined, 
              startIndex: undefined,     
              endIndex: undefined,
              serviceId: subService?.id || service.id
            });
          }
        });
        claimedExplicitIndices.add(resIdx);
      } else {
        finalResults.push(res);
        claimedExplicitIndices.add(resIdx);
      }
    });

    return finalResults;
  }
}
