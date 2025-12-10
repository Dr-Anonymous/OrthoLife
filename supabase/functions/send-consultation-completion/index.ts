
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

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { patientName, patientPhone, advice, isTelugu } = await req.json()

        if (!patientName || !patientPhone) {
            throw new Error('Missing patientName or patientPhone')
        }

        // 1. Extract query from advice
        // Advice is always in English per user feedback
        let query = '';

        if (advice) {
            const lines = advice.split('\n').filter((line: string) => line.trim() !== '');

            for (const line of lines) {
                const lowerLine = line.toLowerCase();
                // Check for key terms
                const hasDiet = lowerLine.includes('diet');
                const hasExercises = lowerLine.includes('exercise');

                if (hasDiet || hasExercises) {
                    // Clean up the query similar to frontend
                    query = line.replace(/[\(\[].*?[\)\]]/g, "").replace(/[.\s]+$/, "").trim();
                    break; // Use the first matching line
                }
            }
        }

        // 2. Find matching guide link
        // Default is null - if no guide found, we stop message at prescription logic
        let guideLink = null;

        if (query) {
            // Fetch all guides to perform scoring
            const { data: guides, error } = await supabase
                .from('guides')
                .select('id, title, description, categories(name)');

            if (!error && guides && guides.length > 0) {
                const term = query.trim();
                const termLower = term.toLowerCase();

                // Remove stopwords 'exercises', 'diet' from scoring for better relevance
                const searchWords = term.split(/\s+/).filter(w => {
                    const lowerW = w.toLowerCase();
                    return w.length > 0 && !['exercises', 'diet'].includes(lowerW);
                });

                if (searchWords.length > 0) {
                    const scoredGuides = guides.map((guide: any) => {
                        let score = 0;
                        let title = guide.title.toLowerCase();
                        let description = guide.description?.toLowerCase() || '';
                        const category = guide.categories?.name?.toLowerCase() || '';

                        if (title.includes(termLower)) score += 100;
                        if (description.includes(termLower)) score += 50;

                        searchWords.forEach(word => {
                            const wordLower = word.toLowerCase();
                            if (title.includes(wordLower)) score += 10;
                            if (description.includes(wordLower)) score += 5;
                            if (category.includes(wordLower)) score += 2;
                        });

                        return { guide, score };
                    });

                    // Sort by score
                    scoredGuides.sort((a: any, b: any) => b.score - a.score);

                    const bestMatch = scoredGuides[0];
                    const langPrefix = isTelugu ? '/te' : '';

                    if (bestMatch && bestMatch.score > 0) {
                        guideLink = `https://ortho.life${langPrefix}/guides/${bestMatch.guide.id}`;
                    }
                    // Else stays null - "Then stop the message at prescription link."
                }
            }
        }

        // 3. Construct Message
        let message = '';

        if (isTelugu) {
            message = `🙏 నమస్కారం ${patientName},\nడాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరితో మీ కన్సల్టేషన్ పూర్తయింది 🎉.\n\nమీరు ఇప్పుడు-\n- మీ ప్రిస్క్రిప్షన్‌ను 📋 డౌన్లోడ్ చేసుకోవచ్చు-\n\nhttps://ortho.life/p/${patientPhone}`;

            if (guideLink) {
                message += `\n\n- ఆహారం 🍚 & వ్యాయామ 🧘‍♀️ సలహాలు తెలుసుకోవచ్చు\n- మందులు 💊 & పరీక్షలు 🧪 ఆర్డర్ చేయవచ్చు-\n\n${guideLink}`;
            }
        } else {
            message = `👋 Hi ${patientName},\nYour consultation with Dr Samuel Manoj Cherukuri has concluded 🎉.\n\nYou can now- \n- Download your prescription 📋-\n\nhttps://ortho.life/p/${patientPhone}`;

            if (guideLink) {
                message += `\n\n- Read diet 🍚 & exercise 🧘‍♀️ advice \n- Order medicines 💊 & tests 🧪 at-\n\n${guideLink}`;
            }
        }

        // 4. Send Message
        const result = await sendWhatsAppMessage(patientPhone, message)

        if (!result) {
            throw new Error("Failed to send WhatsApp message via shared helper.")
        }

        return new Response(
            JSON.stringify({ success: true, data: result, linkUsed: guideLink }),
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
