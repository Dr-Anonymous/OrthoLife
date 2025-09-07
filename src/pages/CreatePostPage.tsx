import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostForm, { PostFormValues } from '@/components/BlogPostForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const populateEmptyNextSteps = (values: PostFormValues, translations: { [lang: string]: { title?: string; excerpt?: string; content?: string; next_steps?: string; } }) => {
    // Handle English next_steps (main form)
    const updatedValues = { ...values };
    if (!values.next_steps || values.next_steps.trim() === '') {
      updatedValues.next_steps = t('forms.defaultNextSteps');
    }

    // Handle translations next_steps
    const updatedTranslations = { ...translations };
    Object.keys(translations).forEach(lang => {
      if (!translations[lang].next_steps || translations[lang].next_steps?.trim() === '') {
        updatedTranslations[lang] = {
          ...translations[lang],
          next_steps: t('forms.defaultNextSteps', { lng: lang })
        };
      }
    });

    return { updatedValues, updatedTranslations };
  };

  const handleSubmit = async (values: PostFormValues, translations: { [lang: string]: { title?: string; excerpt?: string; content?: string; next_steps?: string; } }) => {
    setIsSubmitting(true);
    try {
      // Populate empty next_steps with localized defaults
      const { updatedValues, updatedTranslations } = populateEmptyNextSteps(values, translations);

      const { category_name, ...postData } = updatedValues;

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

      const postToInsert = {
        ...postData,
        category_id: categoryId,
      };

      const { data: newPost, error } = await supabase
        .from('posts')
        .insert([postToInsert])
        .select()
        .single();

      if (error) throw error;
      if (!newPost) throw new Error("Failed to create post.");

      // Insert translations with populated next_steps
      const translationUpserts = [];
      for (const lang in updatedTranslations) {
        translationUpserts.push({
          post_id: newPost.id,
          language: lang,
          title: updatedTranslations[lang].title,
          excerpt: updatedTranslations[lang].excerpt,
          content: updatedTranslations[lang].content,
          next_steps: updatedTranslations[lang].next_steps,
        });
      }

      if (translationUpserts.length > 0) {
        const { error: translationError } = await supabase
          .from('post_translations')
          .insert(translationUpserts);
        if (translationError) throw translationError;
      }

      toast({
        title: "Post created!",
        description: "Your new blog post has been successfully created.",
      });

      navigate(`/blog/${newPost.id}`);

    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "There was an error creating the post. Please try again.",
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
              Create New Post
            </h1>
            <BlogPostForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreatePostPage;
