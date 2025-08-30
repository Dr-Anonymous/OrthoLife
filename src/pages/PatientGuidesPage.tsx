import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Download, Eye, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePdf } from '@/lib/pdfUtils';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export interface GuideCategory {
  id: number;
  name: string;
}

export interface Guide {
  id: number;
  title: string;
  description: string;
  category_id: number;
  pages: number;
  last_updated: string;
  estimated_time: string;
  cover_image_url: string;
  categories: { name: string };
  next_steps?: string;
  guide_translations: {
    language: string;
    title: string;
    description: string;
    content: string;
  }[];
}

const PatientGuidesPage = () => {
  const { t, i18n } = useTranslation();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [categories, setCategories] = useState<GuideCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownloadPdf = async (guideId: number) => {
    setDownloadingId(guideId);
    try {
        const { data: guide, error } = await supabase
            .from('guides')
            .select('title, content, guide_translations(*)')
            .eq('id', guideId)
            .single();

        if (error) throw error;
        if (guide) {
            const translation = guide.guide_translations.find(t => t.language === i18n.language);
            const contentToSave = translation?.content || guide.content;
            const titleToSave = translation?.title || guide.title;
            await generatePdf(contentToSave, titleToSave);
        }
    } catch (error) {
        console.error("Error fetching guide content for PDF:", error);
    } finally {
        setDownloadingId(null);
    }
  };

  // Fetch categories
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

  // Fetch guides
  useEffect(() => {
    const fetchGuides = async () => {
      setLoading(true);

      let query = supabase
        .from('guides')
        .select('*, categories(name), guide_translations(*)');

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      query = query.order('last_updated', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching guides:', error);
        setGuides([]);
      } else {
        setGuides(data || []);
      }
      setLoading(false);
    };

    fetchGuides();
  }, [selectedCategory]);

  const handleCategoryClick = (categoryId: number | null) => {
    if (categoryId === selectedCategory) {
      // Clicking the same category again → reset to All
      setSelectedCategory(null);
    } else {
      // Switching to a new category or from All
      setSelectedCategory(categoryId);
    }
    setGuides([]); // Clear old guides immediately
  };

  const getTranslatedGuide = (guide: Guide, lang: string) => {
    if (lang === 'en') {
      return { title: guide.title, description: guide.description };
    }
    const translation = guide.guide_translations.find(t => t.language === lang);
    return {
      title: translation?.title || guide.title,
      description: translation?.description || guide.description,
    };
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex justify-center items-center gap-4 mb-4">
                <h1 className="text-4xl font-heading font-bold text-primary">
                  {t('learn.guides.title', 'Health Guides')}
                </h1>
                <LanguageSwitcher />
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('learn.guides.subtitle', 'Comprehensive guides for better health management')}
              </p>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <Badge
                key="all"
                variant={selectedCategory === null ? 'default' : 'secondary'}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleCategoryClick(null)}
              >
                All Guides
              </Badge>
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'secondary'}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handleCategoryClick(category.id)}
                >
                  {category.name}
                </Badge>
              ))}
            </div>

            {/* Loading Skeleton */}
            {loading && guides.length === 0 && (
              <div>
                {/* Skeleton for Featured Guide */}
                <Card className="mb-8 overflow-hidden">
                  <div className="md:flex">
                    <div className="md:w-1/3">
                      <Skeleton className="w-full h-64 md:h-full" />
                    </div>
                    <div className="md:w-2/3 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                      <Skeleton className="h-8 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-5/6 mb-6" />
                      <div className="flex items-center text-sm text-muted-foreground mb-6 space-x-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <div className="flex gap-3">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-32" />
                      </div>
                    </div>
                  </div>
                </Card>
                {/* Skeleton for Guides Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <Skeleton className="h-40 w-full" />
                      <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-24" />
                        </div>
                        <Skeleton className="h-6 w-full mb-2" />
                        <Skeleton className="h-4 w-full" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-8 w-24" />
                          <Skeleton className="h-8 w-24" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && guides.length === 0 && (
              <div className="text-center py-16">
                <BookOpen className="mx-auto mb-4 text-primary" size={48} />
                <h2 className="text-2xl font-semibold mb-2">No guides found</h2>
                <p className="text-muted-foreground">
                  There are no patient guides in this category yet. Please check back later.
                </p>
              </div>
            )}

            {/* Featured Guide & Grid */}
            {guides.length > 0 && (
              <>
                <Card className="mb-8 overflow-hidden bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                  <div className="md:flex">
                    <div className="md:w-1/3">
                      <img
                        src={guides[0].cover_image_url}
                        alt={guides[0].title}
                        className="w-full h-64 md:h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="md:w-2/3 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge>{guides[0].categories.name}</Badge>
                        <span className="text-sm text-muted-foreground">{t('guides.featured')}</span>
                      </div>
                      <h2 className="text-2xl font-heading font-bold mb-3">
                        {getTranslatedGuide(guides[0], i18n.language).title}
                      </h2>
                      <p className="text-muted-foreground mb-4">
                        {getTranslatedGuide(guides[0], i18n.language).description}
                      </p>
                      <div className="flex items-center text-sm text-muted-foreground mb-6 space-x-4">
                        <div className="flex items-center">
                          <BookOpen size={16} className="mr-1" />
                          <span>{guides[0].pages} pages</span>
                        </div>
                        <div className="flex items-center">
                          <Clock size={16} className="mr-1" />
                          <span>{guides[0].estimated_time}</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button asChild className="flex items-center gap-2">
                          <Link to={`/guides/${guides[0].id}`}>
                            <Eye size={16} />
                            {t('guides.readOnline')}
                          </Link>
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2" onClick={() => handleDownloadPdf(guides[0].id)} disabled={downloadingId === guides[0].id}>
                          {downloadingId === guides[0].id ? 'Downloading...' : <><Download size={16} />{t('guides.downloadPdf')}</>}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {guides.slice(1).map((guide) => (
                    <Link to={`/guides/${guide.id}`} key={guide.id} className="group">
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={guide.cover_image_url}
                            alt={guide.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        <CardHeader>
                          <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{guide.categories.name}</Badge>
                          </div>
                          <CardTitle className="text-lg leading-tight">
                            {getTranslatedGuide(guide, i18n.language).title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {getTranslatedGuide(guide, i18n.language).description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="mt-auto flex flex-col">
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                            <div className="flex items-center space-x-3">
                              <span className="flex items-center">
                                <BookOpen size={14} className="mr-1" />
                                {guide.pages}p
                              </span>
                              <span className="flex items-center">
                                <Clock size={14} className="mr-1" />
                                {guide.estimated_time.split(' ')[0]}m
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-auto">
                            <Button asChild size="sm" className="flex-1">
                              <Link to={`/guides/${guide.id}`}>
                                <Eye size={14} className="mr-1" />
                                {t('guides.read')}
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownloadPdf(guide.id); }} disabled={downloadingId === guide.id}>
                              {downloadingId === guide.id ? '...' : <><Download size={14} className="mr-1" />{t('guides.pdf')}</>}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Call to Action */}
            <Card className="mt-12 bg-primary/5 border-primary/20">
              <CardContent className="text-center py-8">
                <BookOpen className="mx-auto mb-4 text-primary" size={48} />
                <h3 className="text-2xl font-heading font-bold mb-2">
                  {t('guides.customGuide.title')}
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  {t('guides.customGuide.description')}
                </p>
                <Button size="lg">
                  {t('guides.customGuide.button')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PatientGuidesPage;
