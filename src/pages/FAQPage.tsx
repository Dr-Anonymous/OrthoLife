import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, HelpCircle, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { TranslatedText } from '@/components/TranslatedText';

const FAQPage = () => {
  const { t } = useLanguage();
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
    {
      id: '1',
      category: 'Appointments',
      question: 'How do I book an appointment online?',
      answer: 'You can easily book an appointment through our website by clicking on the "Book Appointment" button on the homepage. Select your preferred doctor, choose an available time slot, and fill in your details. You\'ll receive a confirmation email and SMS.'
    },
    {
      id: '2', 
      category: 'Appointments',
      question: 'Can I reschedule or cancel my appointment?',
      answer: 'Yes, you can reschedule or cancel your appointment up to 2 hours before the scheduled time. You can do this through the appointment link sent to your email or by calling our reception at 9866812555.'
    },
    {
      id: '3',
      category: 'Surgery',
      question: 'What should I expect before surgery?',
      answer: 'Before surgery, you\'ll have a pre-operative consultation where we\'ll review your medical history, conduct necessary tests, and provide detailed instructions about fasting, medications, and what to bring on the day of surgery.'
    },
    {
      id: '4',
      category: 'Surgery', 
      question: 'How long is the typical recovery time?',
      answer: 'Recovery time varies depending on the type of surgery and individual factors. Minor procedures may require 2-4 weeks, while major surgeries like joint replacement can take 3-6 months for full recovery. Your surgeon will provide specific timelines during your consultation.'
    },
    {
      id: '5',
      category: 'Recovery',
      question: 'What pain management options are available?',
      answer: 'We offer various pain management approaches including medications, physical therapy, hot/cold therapy, and in some cases, advanced techniques like nerve blocks or injections. Our pain management team will create a personalized plan for you.'
    },
    {
      id: '6',
      category: 'Recovery',
      question: 'When can I return to work after surgery?',
      answer: 'Return to work timing depends on your job requirements and type of surgery. Desk jobs may be possible within 1-2 weeks with modifications, while physical jobs may require 6-12 weeks. We\'ll provide specific work restrictions and clearance.'
    },
    {
      id: '7',
      category: 'Insurance',
      question: 'Which insurance plans do you accept?',
      answer: 'We accept most major insurance plans including government schemes. Please contact our billing department or check our website for a complete list of accepted insurance providers. We recommend verifying coverage before your visit.'
    },
    {
      id: '8',
      category: 'Insurance',
      question: 'What if my insurance doesn\'t cover the procedure?',
      answer: 'If your insurance doesn\'t cover a procedure, we offer flexible payment plans and can discuss alternative treatment options. Our financial counselors can help you understand costs and available payment options.'
    },
    {
      id: '9',
      category: 'Pain Management',
      question: 'Are there non-surgical options for chronic pain?',
      answer: 'Yes, we offer many non-surgical pain management options including physical therapy, injections, medications, lifestyle modifications, and alternative therapies. Many patients find significant relief without surgery.'
    },
    {
      id: '10',
      category: 'Physical Therapy',
      question: 'Do I need a referral for physical therapy?',
      answer: 'While some insurance plans require a physician referral, many allow direct access to physical therapy. Our team can help determine if you need a referral and assist with the process if required.'
    },
    {
      id: '11',
      category: 'Physical Therapy',
      question: 'How often will I need physical therapy sessions?',
      answer: 'Physical therapy frequency varies based on your condition and goals. Typically, sessions are 2-3 times per week initially, then reduced as you progress. Your therapist will adjust the schedule based on your recovery.'
    },
    {
      id: '12',
      category: 'Appointments',
      question: 'Do you offer telemedicine consultations?',
      answer: 'Yes, we offer telemedicine consultations for follow-up appointments, medication reviews, and certain initial consultations. This option provides convenient care from the comfort of your home.'
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-heading font-bold text-primary mb-4">
                {t('learn.faqs.title', 'Frequently Asked Questions')}
              </h1>
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
                    placeholder="Search for answers..."
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
                          <TranslatedText className="font-medium">{faq.question}</TranslatedText>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="ml-8 pt-2 pb-4 text-muted-foreground leading-relaxed">
                        <TranslatedText>{faq.answer}</TranslatedText>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {filteredFAQs.length === 0 && (
                  <div className="text-center py-8">
                    <HelpCircle className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <h3 className="text-lg font-semibold mb-2">No FAQs found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or selecting a different category.
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
                  Still Have Questions?
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Can't find the answer you're looking for? Our support team is here to help.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button className="flex items-center gap-2">
                    <Phone size={16} />
                    Call: 9866812555
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <MessageCircle size={16} />
                    WhatsApp Support
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