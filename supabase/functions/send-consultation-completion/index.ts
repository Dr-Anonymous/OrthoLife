
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, sendWhatsAppMessage } from "../_shared/whatsapp.ts"

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const isTeluguText = (text: string): boolean => {
    const teluguRegex = /[\u0C00-\u0C7F]/;
    return teluguRegex.test(text);
};

interface Guide {
    id: number;
    title: string;
    description: string;
    categories: { name: string };
    guide_translations: {
        language: string;
        title: string;
        description: string;
    }[];
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { patientName, patientPhone, advice, isTelugu, guideLinks: providedGuideLinks } = await req.json()

        if (!patientName || !patientPhone) {
            throw new Error('Missing patientName or patientPhone')
        }

        // 2. Find matching guide links
        let guideLinks: string[] = [];

        if (providedGuideLinks && Array.isArray(providedGuideLinks)) {
            guideLinks = providedGuideLinks;
        }

        // 3. Construct Message
        let message = '';

        if (isTelugu) {
            if (guideLinks.length > 0) {
                const linksText = guideLinks.join('\n\n');
                message = `🙏 నమస్కారం ${patientName},\nడాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరితో మీ కన్సల్టేషన్ పూర్తయింది 🎉.\n\nమీరు ఇప్పుడు-\n- మీ ప్రిస్క్రిప్షన్‌ను 📋 డౌన్లోడ్ చేసుకోవచ్చు-\n\nhttps://ortho.life/p/${patientPhone}\n\n- ఆహారం 🍚 & వ్యాయామ 🧘‍♀️ సలహాలు తెలుసుకోవచ్చు-\n\n${linksText}`;
            } else {
                message = `🙏 నమస్కారం ${patientName},\nడాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరితో మీ కన్సల్టేషన్ పూర్తయింది 🎉.\n\nమీ ప్రిస్క్రిప్షన్‌ను 📋 డౌన్లోడ్ చేసుకోవచ్చు-\n\nhttps://ortho.life/p/${patientPhone}`;
            }
        } else {
            if (guideLinks.length > 0) {
                const linksText = guideLinks.join('\n\n');
                message = `👋 Hi ${patientName},\nYour consultation with Dr Samuel Manoj Cherukuri has concluded 🎉.\n\nYou can now- \n- Download your prescription 📋-\n\nhttps://ortho.life/p/${patientPhone}\n\n- Read diet 🍚 & exercise 🧘 advice-\n\n${linksText}`;
            } else {
                message = `👋 Hi ${patientName},\nYour consultation with Dr Samuel Manoj Cherukuri has concluded 🎉.\n\nDownload your prescription 📋-\n\nhttps://ortho.life/p/${patientPhone}`;
            }
        }

        // 4. Send Message
        const result = await sendWhatsAppMessage(patientPhone, message)

        if (!result) {
            throw new Error("Failed to send WhatsApp message via shared helper.")
        }

        return new Response(
            JSON.stringify({ success: true, data: result, linksUsed: guideLinks }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
