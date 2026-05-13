import { ClinicalParser } from '../src/lib/clinical-parser';

// Mock data
const mockServices = [
  { id: '1', name: 'Hemoglobin', type: 'LAB' },
  { id: '2', name: 'C-Reactive Protein', type: 'LAB' },
  { id: '3', name: 'Fasting Blood Sugar', type: 'LAB' },
];

const mockRanges = [];

const parser = new ClinicalParser(mockServices, mockRanges);

const tests = [
  { input: 'Hb', expected: 'hemoglobin' },
  { input: 'Hgb', expected: 'hemoglobin' },
  { input: 'CRP', expected: 'creactiveprotein' },
  { input: 'FBS', expected: 'fastingbloodsugar' },
  { input: 'Unknown Test', expected: undefined },
];

console.log('Running ClinicalParser Normalization Tests...');
let passed = 0;

tests.forEach(({ input, expected }) => {
  const result = parser.getCanonicalName(input);
  if (result === expected) {
    console.log(`✅ PASS: "${input}" -> "${result}"`);
    passed++;
  } else {
    console.error(`❌ FAIL: "${input}" -> expected "${expected}", got "${result}"`);
  }
});

console.log(`\nResult: ${passed}/${tests.length} tests passed.`);

if (passed === tests.length) {
  process.exit(0);
} else {
  process.exit(1);
}
