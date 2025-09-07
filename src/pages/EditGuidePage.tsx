import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GuidePostForm, { GuideFormValues } from '@/components/GuidePostForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface TranslationValues {
  [lang: string]: {
    title?: string;
    description?: string;
    content?: string;
    next_steps?: string;
  };
}

const EditGuidePage = () => {
  const navigate = useNavigate();
  const { guideId } = useParams<{ guideId: string }>();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialData, setInitialData] = useState<Partial<GuideFormValues> | null>(null);
  const [translations, setTranslations] = useState<TranslationValues | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGuideData = async () => {
      if (!guideId) return;
      setLoading(true);
      try {
        // Fetch main guide data
        const { data: guideData, error: guideError } = await supabase
          .from('guides')
          .select('*, categories(name)')
          .eq('id', guideId)
          .single();
        if (guideError) throw guideError;

        // Fetch translations
        const { data: translationData, error: translationError } = await supabase
          .from('guide_translations')
          .select('*')
          .eq('guide_id', guideId);
        if (translationError) throw translationError;

        const initialFormValues: Partial<GuideFormValues> = {
          ...guideData,
          category_name: guideData.categories.name,
        };
        setInitialData(initialFormValues);

        const initialTranslations = translationData.reduce((acc, t) => {
          acc[t.language] = { title: t.title, description: t.description, content: t.content, next_steps: t.next_steps };
          return acc;
        }, {});
        setTranslations(initialTranslations);

      } catch (error) {
        console.error('Error fetching guide data:', error);
        toast({ title: "Error", description: "Failed to fetch guide data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchGuideData();
  }, [guideId, toast]);

  const handleSubmit = async (values: GuideFormValues, newTranslations: TranslationValues) => {
    setIsSubmitting(true);
    try {
      const { category_name, ...guideData } = values;

      // ... (Category lookup/creation logic - same as in CreateGuidePage)
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', category_name)
        .single();
      if (categoryError && categoryError.code !== 'PGRST116') throw categoryError;
      const categoryId = category ? category.id : (await supabase.from('categories').insert({ name: category_name }).select('id').single()).data!.id;

      // Update main guide
      const { error: updateError } = await supabase
        .from('guides')
        .update({ ...guideData, category_id: categoryId, last_updated: new Date().toISOString() })
        .eq('id', guideId);
      if (updateError) throw updateError;

      // Upsert translations
      const processedTranslations = { ...newTranslations };

      for (const lang in processedTranslations) {
        const nextSteps = processedTranslations[lang].next_steps;
        if (!nextSteps || nextSteps.trim() === '<p></p>' || nextSteps.trim() === '') {
          processedTranslations[lang].next_steps = t('forms.defaultNextSteps', { lng: lang });
        }
      }

      const translationUpserts = Object.keys(processedTranslations)
        .map(lang => {
          const translation = processedTranslations[lang];
          if (translation.title || translation.description || translation.content || translation.next_steps) {
            return {
              guide_id: guideId,
              language: lang,
              title: translation.title,
              description: translation.description,
              content: translation.content,
              next_steps: translation.next_steps,
            };
          }
          return null;
        })
        .filter(Boolean);

      if (translationUpserts.length > 0) {
        const { error: translationError } = await supabase
          .from('guide_translations')
          .upsert(translationUpserts, { onConflict: 'guide_id, language' });
        if (translationError) throw translationError;
      }

      toast({
        title: "Guide updated!",
        description: "The patient guide has been successfully updated.",
      });
      navigate(`/guides/${guideId}`);

    } catch (error) {
      console.error('Error updating guide:', error);
      toast({
        title: "Error",
        description: "There was an error updating the guide. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-muted/50 pt-20">
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Skeleton className="h-8 w-1/2 mb-8" />
            <div className="space-y-8">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-heading font-bold text-primary mb-8">
              Edit Patient Guide
            </h1>
            {initialData && (
              <GuidePostForm
                initialData={initialData}
                translations={translations}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EditGuidePage;
