import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { TranslatedText } from '@/components/TranslatedText';
import { useTranslatedContent } from '@/hooks/useTranslatedContent';
import { Skeleton } from '@/components/ui/skeleton';

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

const TranslatedContent = ({ htmlContent }: { htmlContent: string }) => {
  const { text: translatedHtml, isLoading } = useTranslatedContent(htmlContent);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  return <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: translatedHtml }} />;
};

const BlogPostPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const { t } = useLanguage();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

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
    const fetchPost = async () => {
      if (!postId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*, categories(name)') 
        .eq('id', postId)
        .single();

      if (error) {
        console.error('Error fetching post:', error);
        setPost(null);
      } else {
        setPost(data);
      }
      setLoading(false);
    };

    fetchPost();
  }, [postId]);

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
                  <Badge className="mb-4"><TranslatedText>{post.categories.name}</TranslatedText></Badge>
                  <h1 className="text-4xl font-heading font-bold text-primary mb-4">
                    <TranslatedText>{post.title}</TranslatedText>
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
                
                <img src={post.image_url} alt={post.title} className="w-full h-auto rounded-lg mb-8" />

                <TranslatedContent htmlContent={post.content} />
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
