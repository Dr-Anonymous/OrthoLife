import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2, Clock, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import NextSteps from '@/components/NextSteps';
import { TableOfContents } from '@/components/TableOfContents';
import { generateTocAndInjectIds, TocItem } from '@/utils/toc';
import { applySeo, buildBreadcrumbJsonLd } from '@/utils/seo';

interface Post {
  id: number;
  slug?: string;
  title: string;
  content: string;
  excerpt?: string;
  read_time_minutes: number;
  image_url: string;
  categories: { name: string };
  next_steps?: string;
  created_at?: string;
  updated_at?: string;
}

interface TranslatedPost {
  title: string;
  content: string;
  excerpt: string;
  next_steps?: string;
}

const stripHtml = (html: string, maxLength = 160) => {
  const plainText = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, maxLength - 1).trim()}...`;
};

const BlogPostPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const { t, i18n } = useTranslation();
  const [post, setPost] = useState<Post | null>(null);
  const [translatedPost, setTranslatedPost] = useState<TranslatedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [processedContent, setProcessedContent] = useState<string>('');
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const { toast } = useToast();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (postId) {
      trackEvent({
        eventType: "page_view",
        path: location.pathname,
        user_phone: user?.phoneNumber,
        user_name: user?.displayName,
        details: { page: 'blog-post', postId: postId },
      });
    }
  }, [location.pathname, postId, user]);

  const handleShare = async () => {
    let path = window.location.pathname;
    if (i18n.language === 'te' && !path.startsWith('/te')) {
      path = `/te${path}`;
    } else if (i18n.language === 'en' && path.startsWith('/te')) {
      path = path.substring(3);
    }
    const shareUrl = `${window.location.origin}${path}`;

    const shareData = {
      title: translatedPost?.title || post?.title || '',
      text: translatedPost?.title || post?.title || '',
      url: shareUrl,
    };
    try {
      if (navigator.share && post) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link Copied!",
          description: "The article link has been copied to your clipboard.",
        });
      }
    } catch (error) {
      console.error("Failed to share:", error);
      toast({
        title: "Error",
        description: "Could not share the article.",
        variant: "destructive",
      });
    }
  };


  useEffect(() => {
    const fetchPostAndTranslations = async () => {
      if (!postId) return;
      setLoading(true);
      setTranslatedPost(null); // Reset translations when post or language changes

      try {
        const isNumericId = /^\d+$/.test(postId);
        let query = supabase
          .from('posts')
          .select('*, categories(name)')

        if (isNumericId) {
          query = query.eq('id', parseInt(postId));
        } else {
          query = query.eq('slug', postId);
        }

        const { data: postData, error: postError } = await query.single();
        if (postError) throw postError;
        setPost(postData);

        const numericPostId = postData.id;
        let translationData = null;

        if (i18n.language !== 'en') {
          const { data, error: translationError } = await supabase
            .from('post_translations')
            .select('*')
            .eq('post_id', numericPostId)
            .eq('language', i18n.language)
            .single();

          if (translationError && translationError.code !== 'PGRST116') {
            throw translationError;
          }
          if (data) {
            translationData = data;
            setTranslatedPost(data);
          }
        }

        // Process TOC early so there's no layout flashing
        const activeContent = (i18n.language !== 'en' && translationData)
          ? translationData.content
          : postData.content;

        const { processedHtml, tocItems: generatedToc } = generateTocAndInjectIds(activeContent);
        setProcessedContent(processedHtml);
        setTocItems(generatedToc);

      } catch (error) {
        console.error('Error fetching post data:', error);
        setPost(null);
        setProcessedContent('');
        setTocItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPostAndTranslations();
  }, [postId, i18n.language]);

  useEffect(() => {
    if (!postId) return;
    if (loading) return;

    const identifier = post?.slug || postId;
    const canonicalPath = `/blog/${identifier}`;

    if (!post) {
      applySeo({
        title: 'Blog Post Not Found | OrthoLife',
        description: 'The requested orthopaedic blog post could not be found.',
        canonicalPath,
        noindex: true
      });
      return;
    }

    const title = translatedPost?.title || post.title;
    const descriptionSource = translatedPost?.excerpt || post.excerpt || post.content;
    const description = stripHtml(descriptionSource);

    applySeo({
      title: `${title} | OrthoLife Blog`,
      description,
      canonicalPath,
      ogType: 'article',
      image: post.image_url,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: title,
          description,
          image: post.image_url ? [post.image_url] : undefined,
          datePublished: post.created_at,
          dateModified: post.updated_at || post.created_at,
          articleSection: post.categories?.name || 'Orthopaedics',
          author: {
            '@type': 'Person',
            name: 'Dr. Samuel Manoj Cherukuri'
          },
          publisher: {
            '@type': 'Organization',
            name: 'OrthoLife',
            logo: {
              '@type': 'ImageObject',
              url: 'https://ortho.life/favicon/android-chrome-512x512.png'
            }
          },
          mainEntityOfPage: `https://ortho.life${canonicalPath}`
        },
        buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: title, path: canonicalPath }
        ])
      ]
    });
  }, [loading, post, postId, translatedPost]);


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
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-96 w-full mb-8" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}

            {!loading && post && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
                {/* Main Content */}
                <article className="pb-24 min-w-0">
                  <header className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <Badge>{post.categories.name}</Badge>
                    </div>
                    <h1 className="text-4xl font-heading font-bold text-primary mb-4">
                      {translatedPost?.title || post.title}
                    </h1>
                    <div className="flex items-center text-muted-foreground flex-wrap">
                      <div className="flex items-center mb-2">
                        <Clock size={16} className="mr-2" />
                        <span>{post.read_time_minutes} {t('blog.minutesRead')}</span>
                      </div>
                    </div>
                  </header>

                  <img src={post.image_url} alt={translatedPost?.title || post.title} className="w-full h-auto rounded-lg mb-8" loading="lazy" />

                  {/* Always show TOC on mobile before the content if there are items */}
                  {tocItems.length > 0 && (
                    <div className="lg:hidden mb-8 bg-background p-6 rounded-lg shadow-sm border border-border">
                      <TableOfContents items={tocItems} />
                    </div>
                  )}

                  <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: processedContent }} />

                  <div className="mt-8">
                    <NextSteps nextStepsContent={translatedPost?.next_steps || post.next_steps || t('forms.defaultNextSteps')} />
                  </div>
                </article>

                {/* Sidebar Details (Desktop) */}
                {tocItems.length > 0 && (
                  <aside className="hidden lg:block">
                    <div className="sticky top-28 bg-background p-6 rounded-lg shadow-sm border border-border">
                      <TableOfContents items={tocItems} />
                    </div>
                  </aside>
                )}
              </div>
            )}

            {!loading && post && (
              <div className="fixed bottom-6 left-0 right-0 z-50 pointer-events-none">
                <div className="container mx-auto px-4">
                  <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
                      <div className="flex justify-center pointer-events-none">
                        <div className="flex items-center gap-2 md:gap-4 pointer-events-auto w-full max-w-md md:max-w-lg">
                          <Button asChild variant="outline" className="flex-1 shadow-lg bg-background hover:bg-accent border-primary/20">
                            <Link to="/blog" className="flex items-center justify-center">
                              <ArrowLeft className="mr-2 h-4 w-4" />
                              <span className="hidden md:inline">{t('blog.back')}</span>
                              <span className="md:hidden">{t('common.back')}</span>
                            </Link>
                          </Button>
                          <Button onClick={handleShare} className="flex-1 shadow-lg">
                            <Share2 className="mr-2 h-4 w-4" />
                            <span className="hidden md:inline">{t('blog.share')}</span>
                            <span className="md:hidden">{t('common.share')}</span>
                          </Button>
                        </div>
                      </div>
                      <div className="hidden lg:block pointer-events-none"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!loading && !post && (
              <div className="text-center py-16">
                <h2 className="text-2xl font-semibold mb-2">Post not found</h2>
                <p className="text-muted-foreground">
                  The blog post you are looking for does not exist.
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

export default BlogPostPage;
