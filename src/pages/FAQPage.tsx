import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, HelpCircle, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { applySeo, buildBreadcrumbJsonLd } from '@/utils/seo';

interface Category {
  id: number;
  name: string;
}

interface FAQ {
  id: number;
  question_key: string;
  answer_key: string;
  categories: { name: string };
}

const FAQPage = () => {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<Category[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) console.error('Error fetching categories:', error);
      else setCategories(data || []);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchFAQs = async () => {
      setLoading(true);
      let query = supabase.from('faqs').select('*, categories(name)');

      if (selectedCategory !== 'All') {
        const category = categories.find(cat => cat.name === selectedCategory);
        if (category) {
          query = query.eq('category_id', category.id);
        }
      }

      const { data, error } = await query;
      if (error) console.error('Error fetching FAQs:', error);
      else setFaqs(data || []);
      setLoading(false);
    };

    if (categories.length > 0) {
      fetchFAQs();
    } else if (selectedCategory === 'All') {
      fetchFAQs();
    }
  }, [selectedCategory, categories]);

  const filteredFAQs = faqs.filter(faq =>
    searchQuery === '' ||
    t(faq.question_key).toLowerCase().includes(searchQuery.toLowerCase()) ||
    t(faq.answer_key).toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    applySeo({
      title: i18n.language === 'te'
        ? 'Orthopaedic FAQs | Telugu Support | OrthoLife'
        : 'Orthopaedic FAQs | Joint Pain, Fractures, Surgery Recovery | OrthoLife',
      description: i18n.language === 'te'
        ? 'Find common orthopaedic FAQs in Telugu for fracture treatment, arthroscopy, joint pain, and recovery support.'
        : 'Find answers to common orthopaedic questions about fractures, joint pain, surgery, rehabilitation, and recovery at OrthoLife.',
      canonicalPath: '/faqs',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.slice(0, 25).map((faq) => ({
            '@type': 'Question',
            name: t(faq.question_key),
            acceptedAnswer: {
              '@type': 'Answer',
              text: t(faq.answer_key)
            }
          }))
        },
        buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'FAQs', path: '/faqs' }
        ])
      ]
    });
  }, [faqs, i18n.language, t]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex justify-center items-center gap-4 mb-4">
                <h1 className="text-4xl font-heading font-bold text-primary">
                  {t('learn.faqs.title', 'Frequently Asked Questions')}
                </h1>
                <LanguageSwitcher />
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('learn.faqs.subtitle', 'Quick answers to common health questions')}
              </p>
            </div>

            {/* Search Bar */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                  <Input
                    placeholder={t('faq.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <Badge
                key="All"
                variant={'All' === selectedCategory ? 'default' : 'secondary'}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setSelectedCategory('All')}
              >
                All
              </Badge>
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  variant={category.name === selectedCategory ? 'default' : 'secondary'}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => setSelectedCategory(category.name)}
                >
                  {category.name}
                </Badge>
              ))}
            </div>

            {/* FAQ Accordion */}
            <Card>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="space-y-4">
                    {filteredFAQs.map((faq) => (
                      <AccordionItem key={faq.id} value={String(faq.id)} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline text-left">
                          <div className="flex items-start gap-3">
                            <HelpCircle className="text-primary mt-1 shrink-0" size={20} />
                            <span className="font-medium">{t(faq.question_key)}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="ml-8 pt-2 pb-4 text-muted-foreground leading-relaxed">
                          {t(faq.answer_key)}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}

                {!loading && filteredFAQs.length === 0 && (
                  <div className="text-center py-8">
                    <HelpCircle className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <h3 className="text-lg font-semibold mb-2">{t('faq.noFaqsFound')}</h3>
                    <p className="text-muted-foreground">
                      {t('faq.noFaqsDescription')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card className="mt-8 bg-primary/5 border-primary/20">
              <CardContent className="text-center py-8">
                <MessageCircle className="mx-auto mb-4 text-primary" size={48} />
                <h3 className="text-2xl font-heading font-bold mb-2">
                  {t('faq.stillHaveQuestions')}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {t('faq.supportMessage')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={(e) => { e.preventDefault(); window.location.href = 'tel:+919983849838'; }} className="flex items-center gap-2">
                    <Phone size={16} />
                    {t('faq.call')}
                  </Button>
                  <Button onClick={(e) => { e.preventDefault(); window.location.href = 'https://wa.me/919983849838?text=Hi.%20I%20have%20a%20question.'; }} variant="outline" className="flex items-center gap-2">
                    <MessageCircle size={16} />
                    {t('faq.whatsapp')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQPage;
