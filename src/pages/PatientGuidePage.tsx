import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Clock, Share2, ArrowLeft, BookOpen, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { generatePdf } from '@/lib/pdfUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Guide } from './PatientGuidesPage'; // Re-using the interface
import NextSteps from '@/components/NextSteps';

interface TranslatedGuide {
    title: string;
    description: string;
    content: string;
    next_steps?: string;
}

const PatientGuidePage = () => {
  const { guideId } = useParams<{ guideId: string }>();
  const { t, i18n } = useTranslation();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [translatedGuide, setTranslatedGuide] = useState<TranslatedGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    if (!guide) return;
    setIsDownloading(true);
    const contentToSave = translatedGuide?.content || guide.content;
    const titleToSave = translatedGuide?.title || guide.title;
    await generatePdf(contentToSave, titleToSave);
    setIsDownloading(false);
  };

  useEffect(() => {
    const fetchGuide = async () => {
      if (!guideId) return;
      setLoading(true);
      setTranslatedGuide(null); // Reset on language or guide change

      try {
        const { data: guideData, error: guideError } = await supabase
          .from('guides')
          .select('*, categories(name)')
          .eq('id', guideId)
          .single();

        if (guideError) throw guideError;
        setGuide(guideData);

        const { data: translationData, error: translationError } = await supabase
          .from('guide_translations')
          .select('*')
          .eq('guide_id', guideId)
          .eq('language', i18n.language)
          .single();

        if (translationError && translationError.code !== 'PGRST116') {
          throw translationError;
        }
        if (translationData) {
          setTranslatedGuide(translationData);
        }
      } catch (error) {
        console.error('Error fetching guide:', error);
        setGuide(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGuide();
  }, [guideId, i18n.language]);

    const handleShare = async () => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const shareUrl = i18n.language && i18n.language !== 'en'
      ? `${baseUrl}?lang=${i18n.language}`
      : baseUrl;

    const shareData = {
      title: translatedGuide?.title || guide.title,
      text: `Check out this patient guide from OrthoLife: ${translatedGuide?.title || guide.title}`,
      url: shareUrl,
    };
    try {
      if (navigator.share && guide) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link Copied!",
          description: "The guide link has been copied to your clipboard.",
        });
      }
    } catch (error) {
      console.error("Failed to share:", error);
      toast({
        title: "Error",
        description: "Could not share the guide.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {loading && (
              <div>
                <Skeleton className="h-10 w-3/4 mb-4" />
                <div className="flex items-center space-x-4 mb-4">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-96 w-full mb-8" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}

            {!loading && guide && (
              <article className="pb-24">
                <header className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <Badge>{guide.categories.name}</Badge>
                    <LanguageSwitcher />
                  </div>
                  <h1 className="text-4xl font-heading font-bold text-primary mb-4">
                    {translatedGuide?.title || guide.title}
                  </h1>
                  <div className="flex items-center text-muted-foreground flex-wrap">
                    <div className="flex items-center mr-6 mb-2">
                      <BookOpen size={16} className="mr-2" />
                      <span>{guide.pages} pages</span>
                    </div>
                    <div className="flex items-center mr-6 mb-2">
                      <Clock size={16} className="mr-2" />
                      <span>{guide.estimated_time}</span>
                    </div>
                  </div>
                </header>

                <img src={guide.cover_image_url} alt={translatedGuide?.title || guide.title} className="w-full h-auto rounded-lg mb-8" loading="lazy" />

                <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: translatedGuide?.content || guide.content }} />

                <NextSteps nextStepsContent={translatedGuide?.next_steps || guide.next_steps} />
        
                <div className="sticky bottom-0 p-4 border-t z-10 bg-background/80 backdrop-blur-sm">
                  <div className="flex flex-wrap justify-between items-center gap-4">
                    <Button asChild variant="outline">
                      <Link to="/patient-guides">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Guides
                      </Link>
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={handleShare}>
                          <Share2 className="mr-2 h-4 w-4" />
                          Share Guide
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2" onClick={handleDownloadPdf} disabled={isDownloading}>
                            {isDownloading ? 'Downloading...' : <><Download size={16} />{t('guides.downloadPdf', 'Download PDF')}</>}
                        </Button>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {!loading && !guide && (
              <div className="text-center py-16">
                <h2 className="text-2xl font-semibold mb-2">Guide not found</h2>
                <p className="text-muted-foreground">
                  The patient guide you are looking for does not exist.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PatientGuidePage;
