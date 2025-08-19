import React, { useState } from 'react';
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

const FAQPage = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const faqCategories = [
    'All',
    'Appointments',
    'Surgery',
    'Recovery',
    'Insurance',
    'Pain Management',
    'Physical Therapy'
  ];

  const faqs = [
    { id: '1', category: 'Appointments', qKey: 'faq.q1.question', aKey: 'faq.q1.answer' },
    { id: '2', category: 'Appointments', qKey: 'faq.q2.question', aKey: 'faq.q2.answer' },
    { id: '3', category: 'Surgery', qKey: 'faq.q3.question', aKey: 'faq.q3.answer' },
    { id: '4', category: 'Surgery', qKey: 'faq.q4.question', aKey: 'faq.q4.answer' },
    { id: '5', category: 'Recovery', qKey: 'faq.q5.question', aKey: 'faq.q5.answer' },
    { id: '6', category: 'Recovery', qKey: 'faq.q6.question', aKey: 'faq.q6.answer' },
    { id: '7', category: 'Insurance', qKey: 'faq.q7.question', aKey: 'faq.q7.answer' },
    { id: '8', category: 'Insurance', qKey: 'faq.q8.question', aKey: 'faq.q8.answer' },
    { id: '9', category: 'Pain Management', qKey: 'faq.q9.question', aKey: 'faq.q9.answer' },
    { id: '10', category: 'Physical Therapy', qKey: 'faq.q10.question', aKey: 'faq.q10.answer' },
    { id: '11', category: 'Physical Therapy', qKey: 'faq.q11.question', aKey: 'faq.q11.answer' },
    { id: '12', category: 'Appointments', qKey: 'faq.q12.question', aKey: 'faq.q12.answer' },
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      t(faq.qKey).toLowerCase().includes(searchQuery.toLowerCase()) ||
      t(faq.aKey).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
              {faqCategories.map((category) => (
                <Badge
                  key={category}
                  variant={category === selectedCategory ? 'default' : 'secondary'}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>

            {/* FAQ Accordion */}
            <Card>
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="space-y-4">
                  {filteredFAQs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline text-left">
                        <div className="flex items-start gap-3">
                          <HelpCircle className="text-primary mt-1 shrink-0" size={20} />
                          <span className="font-medium">{t(faq.qKey)}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="ml-8 pt-2 pb-4 text-muted-foreground leading-relaxed">
                        {t(faq.aKey)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {filteredFAQs.length === 0 && (
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
                  <Button className="flex items-center gap-2">
                    <Phone size={16} />
                    {t('faq.call')}
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
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