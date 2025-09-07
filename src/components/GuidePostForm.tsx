import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from './RichTextEditor';
import { supabase } from '@/integrations/supabase/client';
import { GuideCategory } from '@/pages/PatientGuidesPage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const guideFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  content: z.string().min(1, "Content is required"),
  cover_image_url: z.string().url("Please enter a valid URL"),
  pages: z.coerce.number().int().positive("Must be a positive number"),
  estimated_time: z.string().min(1, "Estimated time is required"),
  category_name: z.string().min(1, "Category is required"),
  next_steps: z.string().optional(),
});

export type GuideFormValues = z.infer<typeof guideFormSchema>;

export interface TranslationValues {
  [lang:string]: {
    title?: string;
    description?: string;
    content?: string;
    next_steps?: string;
  };
}

interface GuidePostFormProps {
  initialData?: Partial<GuideFormValues>;
  translations?: TranslationValues;
  onSubmit: (values: GuideFormValues, translations: TranslationValues) => void;
  isSubmitting: boolean;
}

const GuidePostForm: React.FC<GuidePostFormProps> = ({ initialData, translations, onSubmit, isSubmitting }) => {
  const [categories, setCategories] = useState<GuideCategory[]>([]);
  const [translationValues, setTranslationValues] = useState<TranslationValues>({});
  const { t } = useTranslation();

  const form = useForm<GuideFormValues>({
    resolver: zodResolver(guideFormSchema),
    defaultValues: initialData || {},
  });

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) {
        console.error('Error fetching categories:', error);
      } else {
        setCategories(data || []);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
    if (translations) {
      setTranslationValues(translations);
    }
  }, [initialData, translations, form]);

  const handleTranslationChange = (lang: string, field: 'title' | 'description' | 'content', value: string) => {
    setTranslationValues(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      }
    }));
  };

  const handleFormSubmit = (values: GuideFormValues) => {
    const finalValues = { ...values };
    if (!finalValues.next_steps || finalValues.next_steps === '<p></p>') {
      finalValues.next_steps = t('whatsNextDefault');
    }
    onSubmit(finalValues, translationValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <Tabs defaultValue="english" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sticky top-16 z-20 bg-background">
            <TabsTrigger value="english">English</TabsTrigger>
            <TabsTrigger value="telugu">Telugu</TabsTrigger>
          </TabsList>
          <TabsContent value="english" className="space-y-8 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter guide title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter a short description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      content={field.value || ''}
                      onChange={(content) => {
                        if (content === '<p></p>') {
                          field.onChange('');
                        } else {
                          field.onChange(content);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="next_steps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Steps</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      content={field.value || ''}
                      onChange={(content) => {
                        if (content === '<p></p>') {
                          field.onChange('');
                        } else {
                          field.onChange(content);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="telugu" className="space-y-8 pt-4">
            <FormItem>
              <FormLabel>Translated Title (Telugu)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter Telugu title"
                  value={translationValues.te?.title || ''}
                  onChange={(e) => handleTranslationChange('te', 'title', e.target.value)}
                />
              </FormControl>
            </FormItem>
            <FormItem>
              <FormLabel>Translated Description (Telugu)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter Telugu description"
                  value={translationValues.te?.description || ''}
                  onChange={(e) => handleTranslationChange('te', 'description', e.target.value)}
                />
              </FormControl>
            </FormItem>
            <FormItem>
              <FormLabel>Translated Content (Telugu)</FormLabel>
              <FormControl>
                <RichTextEditor
                  content={translationValues.te?.content || ''}
                  onChange={(value) => handleTranslationChange('te', 'content', value)}
                />
              </FormControl>
            </FormItem>
            <FormItem>
              <FormLabel>Translated Next Steps (Telugu)</FormLabel>
              <FormControl>
                <RichTextEditor
                  content={translationValues.te?.next_steps || ''}
                  onChange={(value) => {
                    if (value === '<p></p>') {
                      handleTranslationChange('te', 'next_steps', '');
                    } else {
                      handleTranslationChange('te', 'next_steps', value);
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          </TabsContent>
        </Tabs>

        <div className="space-y-8 pt-8 border-t">
          <FormField
            control={form.control}
            name="cover_image_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cover Image URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/image.jpg" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pages"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pages</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 12" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estimated_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Time</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 15 min read" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <>
                    <Input list="category-suggestions" placeholder="Select or create a category" {...field} />
                    <datalist id="category-suggestions">
                      {categories.map((category) => (
                        <option key={category.id} value={category.name} />
                      ))}
                    </datalist>
                  </>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Guide'}
        </Button>
      </form>
    </Form>
  );
};

export default GuidePostForm;
