import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Share2, ArrowLeft, BookOpen, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generatePdf } from '@/lib/pdfUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Guide } from './PatientGuidesPage'; // Re-using the interface
import NextSteps from '@/components/NextSteps';
import { TableOfContents } from '@/components/TableOfContents';
import { generateTocAndInjectIds, TocItem } from '@/utils/toc';
import { applySeo, buildBreadcrumbJsonLd } from '@/utils/seo';
import { proxySupabaseUrl } from '@/utils/urlUtils';


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
  const [processedContent, setProcessedContent] = useState<string>('');
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const { toast } = useToast();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (guideId) {
      trackEvent({
        eventType: "page_view",
        path: location.pathname,
        user_phone: user?.phoneNumber,
        user_name: user?.displayName,
        details: { page: 'patient-guide', guideId: guideId },
      });
    }
  }, [location.pathname, guideId, user]);

  const handleDownloadPdf = async () => {
    if (!guide) return;
    setIsDownloading(true);
    try {
      const title = translatedGuide?.title || guide.title;
      await generatePdf(processedContent, title);
      toast({
        title: "Success",
        description: "Guide downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to download guide",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    const fetchGuide = async () => {
      if (!guideId) return;
      setLoading(true);
      setTranslatedGuide(null);

      try {
        const isNumericId = /^\d+$/.test(guideId);
        let query = supabase
          .from('guides')
          .select('*, categories(name)');

        if (isNumericId) {
          query = query.eq('id', parseInt(guideId));
        } else {
          query = query.eq('slug', guideId);
        }

        const { data, error: guideError } = await query.single();
        if (guideError) throw guideError;

        const guideData = data as unknown as Guide;
        setGuide(guideData);
        let translationData: TranslatedGuide | null = null;

        if (i18n.language !== 'en') {
          const { data: tgData, error: translationError } = await supabase
            .from('guide_translations')
            .select('*')
            .eq('guide_id', guideData.id)
            .eq('language', i18n.language)
            .single();

          if (translationError && translationError.code !== 'PGRST116') {
            throw translationError;
          }
          if (tgData) {
            translationData = tgData;
            setTranslatedGuide(tgData);
          }
        }

        // Process TOC early so there's no layout flashing
        const activeContent = (i18n.language !== 'en' && translationData)
          ? translationData.content
          : (guideData as any).content;

        const { processedHtml, tocItems: generatedToc } = generateTocAndInjectIds(activeContent);
        setProcessedContent(processedHtml);
        setTocItems(generatedToc);

      } catch (error) {
        console.error('Error fetching guide:', error);
        setGuide(null);
        setProcessedContent('');
        setTocItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGuide();
  }, [guideId, i18n.language]);

  useEffect(() => {
    if (!guideId) return;
    if (loading) return;

    if (!guide) {
      applySeo({
        title: 'Guide Not Found | OrthoLife',
        description: 'The requested patient guide could not be found.',
        canonicalPath: `/guides/${guideId}`,
        noindex: true
      });
      return;
    }

    const identifier = guide.slug || guide.id.toString();
    const canonicalPath = `/guides/${identifier}`;

    const title = translatedGuide?.title || guide.title;
    const description = translatedGuide?.description || guide.description;

    applySeo({
      title: `${title} | OrthoLife Patient Guide`,
      description,
      canonicalPath,
      image: proxySupabaseUrl(guide.cover_image_url),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'MedicalWebPage',
          name: title,
          description,
          url: `https://ortho.life${canonicalPath}`,
        },
        buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
          { name: title, path: canonicalPath }
        ])
      ]
    });

    // Signal pre-renderer that metadata is ready
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-prerender-ready', 'true');
    }
  }, [guide, guideId, loading, translatedGuide]);

  const handleShare = async () => {
    let path = window.location.pathname;
    if (i18n.language === 'te' && !path.startsWith('/te')) {
      path = `/te${path}`;
    } else if (i18n.language === 'en' && path.startsWith('/te')) {
      path = path.substring(3);
    }
    const shareUrl = `${window.location.origin}${path}`;

    const shareData = {
      title: translatedGuide?.title || guide?.title || '',
      text: translatedGuide?.title || guide?.title || '',
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
          <div className="max-w-6xl mx-auto">
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
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
                {/* Main Content */}
                <article className="pb-24 min-w-0">
                  <header className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <Badge>{guide.categories.name}</Badge>
                    </div>
                    <h1 className="text-4xl font-heading font-bold text-primary mb-4">
                      {translatedGuide?.title || guide.title}
                    </h1>
                    <div className="flex items-center text-muted-foreground flex-wrap">
                      <div className="flex items-center mr-6 mb-2">
                        <BookOpen size={16} className="mr-2" />
                        <span>{guide.pages} {t('guides.pages')}</span>
                      </div>
                      <div className="flex items-center mr-6 mb-2">
                        <Clock size={16} className="mr-2" />
                        <span>{guide.estimated_time.split(' ')[0]} {t('blog.minutesRead')}</span>
                      </div>
                    </div>
                  </header>

                  <img src={proxySupabaseUrl(guide.cover_image_url)} alt={translatedGuide?.title || guide.title} className="w-full h-auto rounded-lg mb-8" loading="lazy" />

                  {/* Always show TOC on mobile before the content if there are items */}
                  {tocItems.length > 0 && (
                    <div className="lg:hidden mb-8 bg-background p-6 rounded-lg shadow-sm border border-border">
                      <TableOfContents items={tocItems} />
                    </div>
                  )}

                  <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: processedContent }} />

                  <div className="mt-8">
                    <NextSteps nextStepsContent={translatedGuide?.next_steps || guide.next_steps || t('forms.defaultNextSteps')} />
                  </div>
                </article>

                {/* Sidebar Details (Desktop) */}
                <aside className="hidden lg:block space-y-6">
                  {tocItems.length > 0 && (
                    <div className="sticky top-28 bg-background p-6 rounded-lg shadow-sm border border-border">
                      <TableOfContents items={tocItems} />
                    </div>
                  )}
                </aside>
              </div>
            )}

            {!loading && guide && (
              <div className="fixed bottom-6 left-0 right-0 z-50 pointer-events-none">
                <div className="container mx-auto px-4">
                  <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
                      <div className="flex justify-center pointer-events-none">
                        <div className="flex items-center gap-2 md:gap-4 pointer-events-auto w-full max-w-md md:max-w-lg lg:max-w-xl">
                          <Button asChild variant="outline" className="flex-1 shadow-lg bg-background hover:bg-accent border-primary/20">
                            <Link to="/guides" className="flex items-center justify-center">
                              <ArrowLeft className="h-4 w-4 mr-2" />
                              <span className="hidden md:inline">{t('guides.back')}</span>
                              <span className="md:hidden">{t('common.back')}</span>
                            </Link>
                          </Button>
                          <Button onClick={handleShare} className="flex-1 shadow-lg">
                            <Share2 className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">{t('guides.share')}</span>
                            <span className="md:hidden">{t('common.share')}</span>
                          </Button>
                          <Button variant="outline" className="flex-1 flex items-center shadow-lg bg-background hover:bg-accent border-primary/20" onClick={handleDownloadPdf} disabled={isDownloading}>
                            {isDownloading ? (
                              '...'
                            ) : (
                              <>
                                <Download size={16} className="mr-2" />
                                <span className="hidden md:inline">{t('guides.downloadPdf', 'Download PDF')}</span>
                                <span className="md:hidden">PDF</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="hidden lg:block pointer-events-none"></div>
                    </div>
                  </div>
                </div>
              </div>
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
