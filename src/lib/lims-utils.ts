
export interface ResultAnalysis {
  status: 'NORMAL' | 'ABNORMAL' | 'CRITICAL';
  flag?: 'H' | 'L' | 'CH' | 'CL' | 'A';
}

/**
 * Replicated exactly from LIMS (lab) project to ensure validation parity.
 */
export const analyzeResultValue = (
  value: string | number,
  range?: string,
  minLimit?: number,
  maxLimit?: number,
  criticalLow?: number,
  criticalHigh?: number
): ResultAnalysis => {
  if (value === undefined || value === null || value === '') return { status: 'NORMAL' };

  const valStr = String(value).trim().toLowerCase();
  const valNum = parseFloat(valStr);

  // 1. Critical Value Check (Highest Priority, strict numeric)
  if (!isNaN(valNum)) {
    const effLow = criticalLow === null ? undefined : criticalLow;
    const effHigh = criticalHigh === null ? undefined : criticalHigh;

    if (effLow !== undefined && valNum <= effLow) return { status: 'CRITICAL', flag: 'CL' };
    if (effHigh !== undefined && valNum >= effHigh) return { status: 'CRITICAL', flag: 'CH' };
  }

  // 2. Abnormal Check
  let isAbnormalBool = false;

  if (!isNaN(valNum)) {
    if (minLimit !== undefined && valNum < minLimit) isAbnormalBool = true;
    else if (maxLimit !== undefined && valNum > maxLimit) isAbnormalBool = true;
  }

  if (!isAbnormalBool && range) {
    const rangeStr = range.trim().toLowerCase();

    // Exact match
    if (valStr === rangeStr) return { status: 'NORMAL' };

    // Qualitative
    const normalKeywords = ['negative', 'absent', 'nil', 'not detected', 'non reactive', 'non-reactive', 'normal'];
    const abnormalKeywords = ['positive', 'present', 'detected', 'reactive', '+'];

    const isQualitativeRange = normalKeywords.some(kw => rangeStr.includes(kw)) || abnormalKeywords.some(kw => rangeStr.includes(kw));

    // 3. Ratio / Titer Check
    const titerMatch = rangeStr.match(/<\s*1:(\d+)/);
    const valTiterMatch = valStr.match(/1:(\d+)/);
    if (titerMatch && valTiterMatch) {
      const thresholdDenominator = parseInt(titerMatch[1]);
      const resultDenominator = parseInt(valTiterMatch[1]);
      if (resultDenominator >= thresholdDenominator) {
        return { status: 'ABNORMAL', flag: 'H' };
      } else {
        return { status: 'NORMAL' };
      }
    }

    if (isQualitativeRange) {
      const hasNormalWord = normalKeywords.some(kw => valStr === kw || valStr.includes(kw));
      const hasAbnormalWord = abnormalKeywords.some(kw => valStr.includes(kw));
      if (hasAbnormalWord) isAbnormalBool = true;
      else if (!hasNormalWord) {
        const rangeIsExclusionary = ['absent', 'negative', 'nil', 'not detected'].some(kw => rangeStr.includes(kw));
        if (rangeIsExclusionary && valStr !== '') isAbnormalBool = true;
      }
    } else {
      // Numeric Range
      const simpleRangeMatch = rangeStr.match(/^([0-9.]+)\s*-\s*([0-9.]+)/);
      if (simpleRangeMatch && !isNaN(valNum)) {
        const min = parseFloat(simpleRangeMatch[1]);
        const max = parseFloat(simpleRangeMatch[2]);
        if (valNum < min || valNum > max) isAbnormalBool = true;
      }

      // Inequality
      const upToMatch = rangeStr.match(/^(?:<|<=|less than|upto|up to|within)\s*([0-9.]+)/);
      if (upToMatch && !isNaN(valNum)) {
        const max = parseFloat(upToMatch[1]);
        if (valNum > max) isAbnormalBool = true;
      }
      
      const moreThanMatch = rangeStr.match(/^(?:>|>=|more than|above|greater than)\s*([0-9.]+)/);
      if (moreThanMatch && !isNaN(valNum)) {
        const min = parseFloat(moreThanMatch[1]);
        if (valNum < min) isAbnormalBool = true;
      }
    }
  }

  if (isAbnormalBool) {
    if (!isNaN(valNum) && range) {
      const simpleRangeMatch = range.match(/^([0-9.]+)\s*-\s*([0-9.]+)/);
      if (simpleRangeMatch) {
        const min = parseFloat(simpleRangeMatch[1]);
        const max = parseFloat(simpleRangeMatch[2]);
        if (valNum < min) return { status: 'ABNORMAL', flag: 'L' };
        if (valNum > max) return { status: 'ABNORMAL', flag: 'H' };
      }
    }
    return { status: 'ABNORMAL', flag: 'A' };
  }

  return { status: 'NORMAL' };
};
