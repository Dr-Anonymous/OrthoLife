import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Clock, Share2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface Post {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  author: string;
  created_at: string;
  read_time_minutes: number;
  image_url: string;
  categories: { name: string };
}

interface TranslatedPost {
    title: string;
    content: string;
    excerpt: string;
}

const BlogPostPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const { i18n } = useTranslation();
  const [post, setPost] = useState<Post | null>(null);
  const [translatedPost, setTranslatedPost] = useState<TranslatedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const handleShare = async () => {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const shareUrl = i18n.language && i18n.language !== 'en'
    ? `${baseUrl}?lang=${i18n.language}`
    : baseUrl;
    
    const shareData = {
      title: translatedPost?.title || post.title,
      text: `Check out this article from OrthoLife: ${translatedPost?.title || post.title}`,
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

  // Helper function to strip HTML tags and truncate text
  const createExcerpt = (content: string, maxLength: number = 160): string => {
    const stripped = content.replace(/<[^>]*>/g, '');
    return stripped.length > maxLength 
      ? stripped.substring(0, maxLength).trim() + '...' 
      : stripped;
  };

  // Function to set meta tag
  const setMetaTag = (name: string, content: string) => {
    let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  };

  // Function to set Open Graph meta tag
  const setOGMetaTag = (property: string, content: string) => {
    let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    meta.content = content;
  };

  useEffect(() => {
    const fetchPostAndTranslations = async () => {
      if (!postId) return;
      setLoading(true);
      setTranslatedPost(null); // Reset translations when post or language changes

      try {
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('*, categories(name)')
          .eq('id', postId)
          .single();

        if (postError) throw postError;
        setPost(postData);

        if (i18n.language !== 'en') {
          const { data: translationData, error: translationError } = await supabase
            .from('post_translations')
            .select('*')
            .eq('post_id', postId)
            .eq('language', i18n.language)
            .single();

          if (translationError && translationError.code !== 'PGRST116') {
            throw translationError;
          }
          if (translationData) {
            setTranslatedPost(translationData);
          }
        }
      } catch (error) {
        console.error('Error fetching post data:', error);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPostAndTranslations();
  }, [postId, i18n.language]);

  // Effect to update document title and meta tags when post loads
  useEffect(() => {
    if (post) {
      // Set page title
      document.title = `${post.title} | OrthoLife`;
      
      // Generate meta description
      const metaDescription = post.excerpt || createExcerpt(post.content);
      
      // Set basic meta tags
      setMetaTag('description', metaDescription);
      
      // Set Open Graph tags
      setOGMetaTag('og:title', post.title);
      setOGMetaTag('og:description', metaDescription);
      setOGMetaTag('og:image', post.image_url);
      setOGMetaTag('og:type', 'article');
      
      // Set Twitter Card tags
      setMetaTag('twitter:card', 'summary_large_image');
      setMetaTag('twitter:title', post.title);
      setMetaTag('twitter:description', metaDescription);
      setMetaTag('twitter:image', post.image_url);
      
      // Set article-specific meta tags
      setOGMetaTag('article:author', post.author);
      setOGMetaTag('article:published_time', post.created_at);
    } else if (!loading) {
      // Reset title when post not found
      document.title = 'Post Not Found | OrthoLife';
      setMetaTag('description', 'The requested blog post could not be found.');
    }

    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = 'OrthoLife';
    };
  }, [post, loading]);

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
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-96 w-full mb-8" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}
            
            {!loading && post && (
              <article>
                <header className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <Badge>{post.categories.name}</Badge>
                    <LanguageSwitcher />
                  </div>
                  <h1 className="text-4xl font-heading font-bold text-primary mb-4">
                    {translatedPost?.title || post.title}
                  </h1>
                  <div className="flex items-center text-muted-foreground flex-wrap">
                    <div className="flex items-center mr-6 mb-2">
                      <User size={16} className="mr-2" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center mr-6 mb-2">
                      <Calendar size={16} className="mr-2" />
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center mb-2">
                      <Clock size={16} className="mr-2" />
                      <span>{post.read_time_minutes} min read</span>
                    </div>
                  </div>
                </header>
                
                <img src={post.image_url} alt={translatedPost?.title || post.title} className="w-full h-auto rounded-lg mb-8" loading="lazy" />

                <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: translatedPost?.content || post.content }} />

                <div className="mt-8 pt-8 border-t">
                  <div className="flex justify-between items-center">
                    <Button asChild variant="outline">
                      <Link to="/blog">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Blog
                      </Link>
                    </Button>
                    <Button onClick={handleShare}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Article
                    </Button>
                  </div>
                </div>
              </article>
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
