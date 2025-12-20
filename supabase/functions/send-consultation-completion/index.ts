
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
        // Logic adapted from DietAndExercisesCard.tsx
        // 1. Extract queries from advice
        // Logic adapted to support multiple guides and prioritize 'guide' keyword
        const queries: { query: string, isTelugu: boolean }[] = [];

        if (advice) {
            const lines = advice.split('\n').filter((line: string) => line.trim() !== '');

            for (const line of lines) {
                // Check for 'guide' keyword first as per new requirement
                const lowerLine = line.toLowerCase();
                if (lowerLine.includes('guide')) {
                    // Clean the line similar to frontend cleanAdviceLine
                    let cleaned = line.replace(/guide/gi, '');
                    cleaned = cleaned.replace(/^[:\-\s]+|[:\-\s]+$/g, '').trim();
                    cleaned = cleaned.replace(/\s+/g, ' ');
                    if (cleaned) queries.push({ query: cleaned, isTelugu: isTeluguText(line) || isTelugu });
                    continue; // Move to next line even if guide found- to get all instances of guide. 
                }

                // Legacy checks removed. Only 'guide' keyword is used.
            }
        }

        // 2. Find matching guide links
        const guideLinks: string[] = [];

        // Fetch all guides once (optimization)
        let guides: any[] = [];
        if (queries.length > 0) {
            const { data, error } = await supabase
                .from('guides')
                .select('id, title, description, categories(name), guide_translations(language, title, description)');
            if (!error && data) guides = data;
        }

        for (const q of queries) {
            const { query, isTelugu: searchInTelugu } = q;

            if (guides.length > 0) {
                const term = query.trim();
                const termLower = searchInTelugu ? term : term.toLowerCase();

                const searchWords = term.split(/\s+/).filter(w => w.length > 0);

                if (searchWords.length > 0) {
                    const scoredGuides = guides.map((guide: any) => {
                        let score = 0;
                        let title = '';
                        let description = '';
                        const category = guide.categories?.name?.toLowerCase() || '';

                        if (searchInTelugu) {
                            const translation = guide.guide_translations.find((t: any) => t.language === 'te');
                            if (translation) {
                                title = translation.title;
                                description = translation.description;
                            } else {
                                return { guide, score: 0 };
                            }
                        } else {
                            title = guide.title.toLowerCase();
                            description = guide.description?.toLowerCase() || '';
                        }

                        if (title.includes(termLower)) score += 100;
                        if (description.includes(termLower)) score += 50;

                        searchWords.forEach(word => {
                            const wordCompare = searchInTelugu ? word : word.toLowerCase();
                            if (title.includes(wordCompare)) score += 10;
                            if (description.includes(wordCompare)) score += 5;
                            if (category.includes(word.toLowerCase())) score += 2;
                        });

                        return { guide, score };
                    });

                    scoredGuides.sort((a: any, b: any) => b.score - a.score);
                    const bestMatch = scoredGuides[0];
                    const langPrefix = isTelugu ? '/te' : '';

                    if (bestMatch && bestMatch.score > 0) {
                        // Avoid duplicates if multiple lines match same guide?
                        const link = `https://ortho.life${langPrefix}/guides/${bestMatch.guide.id}`;
                        if (!guideLinks.includes(link)) {
                            guideLinks.push(link);
                        }
                    }
                }
            }
        }

        // 3. Construct Message
        let message = '';

        if (isTelugu) {
            message = `🙏 నమస్కారం ${patientName},\nడాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరితో మీ కన్సల్టేషన్ పూర్తయింది 🎉.\n\nమీరు ఇప్పుడు-\n- మీ ప్రిస్క్రిప్షన్‌ను 📋 డౌన్లోడ్ చేసుకోవచ్చు-\n\nhttps://ortho.life/p/${patientPhone}`;

            if (guideLinks.length > 0) {
                // Join multiple links with newlines
                const linksText = guideLinks.join('\n\n');
                message += `\n\n- ఆహారం 🍚 & వ్యాయామ 🧘‍♀️ సలహాలు తెలుసుకోవచ్చు-\n\n${linksText}`;
            }
        } else {
            message = `👋 Hi ${patientName},\nYour consultation with Dr Samuel Manoj Cherukuri has concluded 🎉.\n\nYou can now- \n- Download your prescription 📋-\n\nhttps://ortho.life/p/${patientPhone}`;

            if (guideLinks.length > 0) {
                const linksText = guideLinks.join('\n\n');
                message += `\n\n- Read diet 🍚 & exercise 🧘 advice-\n\n${linksText}`;
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
