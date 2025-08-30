import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GuidePostForm, { GuideFormValues, TranslationValues } from '@/components/GuidePostForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const CreateGuidePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: GuideFormValues, translations: TranslationValues) => {
    setIsSubmitting(true);
    try {
      const { category_name, ...guideData } = values;

      // Check if category exists
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', category_name)
        .single();

      if (categoryError && categoryError.code !== 'PGRST116') { // PGRST116: no rows found
        throw categoryError;
      }

      let categoryId: number;
      if (category) {
        categoryId = category.id;
      } else {
        // Create new category
        const { data: newCategory, error: newCategoryError } = await supabase
          .from('categories')
          .insert({ name: category_name })
          .select('id')
          .single();

        if (newCategoryError) throw newCategoryError;
        categoryId = newCategory.id;
      }

      const guideToInsert = {
        ...guideData,
        category_id: categoryId,
        last_updated: new Date().toISOString(), // Add a default value for last_updated
      };

      const { data: newGuide, error } = await supabase
        .from('guides')
        .insert([guideToInsert])
        .select()
        .single();

      if (error) throw error;
      if (!newGuide) throw new Error("Failed to create guide.");

      // Insert translations
      const translationUpserts = [];
      for (const lang in translations) {
        translationUpserts.push({
          guide_id: newGuide.id,
          language: lang,
          title: translations[lang].title,
          description: translations[lang].description,
          content: translations[lang].content,
          next_steps: translations[lang].next_steps,
        });
      }

      if (translationUpserts.length > 0) {
        const { error: translationError } = await supabase
          .from('guide_translations')
          .insert(translationUpserts);
        if (translationError) throw translationError;
      }

      toast({
        title: "Guide created!",
        description: "Your new patient guide has been successfully created.",
      });

      navigate(`/guides/${newGuide.id}`);

    } catch (error) {
      console.error('Error creating guide:', error);
      toast({
        title: "Error",
        description: "There was an error creating the guide. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-heading font-bold text-primary mb-8">
              Create New Patient Guide
            </h1>
            <GuidePostForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateGuidePage;
