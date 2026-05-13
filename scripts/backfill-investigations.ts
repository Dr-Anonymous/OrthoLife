import { createClient } from '@supabase/supabase-js';
import { ClinicalParser } from '../src/lib/clinical-parser';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

async function backfill() {
  console.log('🚀 Starting Investigations Backfill...');

  // 1. Fetch LIMS Catalog from external LIMS project
  console.log('📡 Fetching LIMS catalog...');
  const LIMS_URL = 'https://fkfocqqszalvplvqsskb.supabase.co/functions/v1/export-catalog';
  const catalogRes = await fetch(LIMS_URL);
  if (!catalogRes.ok) {
      console.error('❌ Failed to fetch LIMS catalog:', catalogRes.status);
      return;
  }
  const { services, ranges } = await catalogRes.json();

  const parser = new ClinicalParser(services || [], ranges || []);

  // 2. Fetch all consultations with unparsed investigations (version < 1)
  console.log('🔎 Querying unparsed consultations...');
  const { data: consultations, error } = await supabase
    .from('consultations')
    .select('id, investigations, patients(sex, dob)')
    .not('investigations', 'is', null)
    .lt('parser_version', 1);

  if (error) {
    console.error('❌ Error fetching consultations:', error);
    return;
  }

  console.log(`📦 Found ${consultations?.length} consultations to parse.`);

  if (!consultations || consultations.length === 0) return;

  // 3. Process in batches
  const batchSize = 50;
  for (let i = 0; i < consultations.length; i += batchSize) {
    const batch = consultations.slice(i, i + batchSize);
    console.log(`⏳ Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(consultations.length / batchSize)}...`);

    const updates = batch.map(c => {
      // Fix #5: Parse ONLY investigations (exclude radiology findings)
      // Fix #2: Pass metadata object instead of bare string
      const patient = c.patients as { sex: 'M' | 'F' | 'O' | 'Other' | 'Male' | 'Female' | 'Unknown', dob: string } | null;
      const parsed = parser.parse(c.investigations || '', {
        sex: patient?.sex,
        age: patient?.dob ? calculateAge(new Date(patient.dob)) : undefined
      });
      
      return supabase
        .from('consultations')
        .update({
          investigations_parsed: parsed,
          parser_version: 1
        })
        .eq('id', c.id);
    });

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
        console.warn(`⚠️ Warning: ${errors.length} updates in this batch failed.`);
    }
  }

  console.log('✅ Backfill completed successfully.');
}

backfill();
