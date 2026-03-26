import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let { month, year, day, dataType = 'day', includeMonthly = true, consultant_id } = await req.json();

    // Sanitize consultant_id (if passed as null string or empty)
    if (consultant_id === 'null' || consultant_id === 'undefined') consultant_id = null;
    if (consultant_id === '') consultant_id = null;

    const monthStartDate = new Date(year, month, 1).toISOString();
    const monthEndDate = new Date(year, month + 1, 1).toISOString();

    if (dataType === 'month') {
      let query = supabase
        .from('consultations')
        .select(`
          id,
          status,
          created_at,
          consultation_data,
          visit_type,
          location,
          language,
          procedure_fee,
          procedure_consultant_cut,
          referral_amount,
          consultant_id,
          patient:patients (
            id,
            name,
            dob,
            sex,
            phone,
            drive_id
          )
        `)
        .gte('created_at', monthStartDate)
        .lt('created_at', monthEndDate);

      if (consultant_id) {
        query = query.eq('consultant_id', consultant_id);
      }

      const { data: monthlyData, error: monthlyDataError } = await query.order('created_at', { ascending: false });

      if (monthlyDataError) throw monthlyDataError;

      return new Response(JSON.stringify({ monthlyData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Default 'day' data type
    let monthlyCount = null;
    let monthlyData = null;

    // Fetch In-Patient Admissions (Monthly)
    let monthlyAdmissionsCount = null;
    let monthlyAdmissions = null;

    if (includeMonthly) {
      let monthlyQuery = supabase
        .from('consultations')
        .select('consultation_data, visit_type, location, language, procedure_fee, procedure_consultant_cut, referral_amount, consultant_id')
        .gte('created_at', monthStartDate)
        .lt('created_at', monthEndDate);

      if (consultant_id) {
        monthlyQuery = monthlyQuery.eq('consultant_id', consultant_id);
      }

      const { data: mData, error: monthlyError } = await monthlyQuery;

      if (monthlyError) throw monthlyError;
      monthlyData = mData;
      monthlyCount = monthlyData.length;

      // Fetch Monthly Admissions
      let maQuery = supabase
        .from('in_patients')
        .select(`
          id,
          admission_date,
          status,
          room_number,
          patient:patients (
            name
          ),
          total_bill,
          consultant_cut,
          referred_by,
          referral_amount,
          consultant_id
        `)
        .gte('admission_date', monthStartDate)
        .lt('admission_date', monthEndDate);

      if (consultant_id) {
        maQuery = maQuery.eq('consultant_id', consultant_id);
      }

      const { data: maData, error: maError } = await maQuery;

      if (maError) throw maError;
      monthlyAdmissions = maData;
      monthlyAdmissionsCount = monthlyAdmissions.length;
    }

    const dayStartDate = new Date(year, month, day).toISOString();
    const dayEndDate = new Date(year, month, day + 1).toISOString();

    let dailyQuery = supabase
      .from('consultations')
      .select(`
        id,
        status,
        created_at,
        consultation_data,
        visit_type,
        location,
        language,
        procedure_fee,
        procedure_consultant_cut,
        referral_amount,
        consultant_id,
        patient:patients (
          id,
          name,
          dob,
          sex,
          phone,
          drive_id
        )
      `)
      .gte('created_at', dayStartDate)
      .lt('created_at', dayEndDate);

    if (consultant_id) {
      dailyQuery = dailyQuery.eq('consultant_id', consultant_id);
    }

    const { data: dailyData, error: dailyError } = await dailyQuery;

    if (dailyError) throw dailyError;

    // Fetch Daily Admissions
    let daQuery = supabase
      .from('in_patients')
      .select(`
        id,
        admission_date,
        status,
        room_number,
        patient:patients (
          name
        ),
        total_bill,
        consultant_cut,
        referred_by,
        referral_amount,
        consultant_id
      `)
      .gte('admission_date', dayStartDate)
      .lt('admission_date', dayEndDate);

    if (consultant_id) {
      daQuery = daQuery.eq('consultant_id', consultant_id);
    }

    const { data: dailyAdmissions, error: daError } = await daQuery;

    if (daError) throw daError;

    return new Response(JSON.stringify({
      monthlyCount,
      monthlyStats: monthlyData,
      dailyData,
      monthlyAdmissionsCount,
      monthlyAdmissions,
      dailyAdmissions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});