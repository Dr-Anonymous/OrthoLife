import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import Header from '@/components/Header';
import { isTelugu } from '@/lib/languageUtils';
import { useDebounce } from '@/hooks/useDebounce';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

// Define types for our data
export interface Category {
  id: number;
  name: string;
}

export interface Post {
  id: number;
  title: string;
  excerpt: string;
  read_time_minutes: number;
  category_id: number;
  image_url: string;
  categories: { name: string };
  post_translations: { title: string; excerpt: string; }[];
}

const BlogPage = () => {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [noResults, setNoResults] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent({
      eventType: "page_view",
      path: location.pathname,
    });
  }, [location.pathname]);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (debouncedSearchTerm) {
      params.set('q', debouncedSearchTerm);
    } else {
      params.delete('q');
    }
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [debouncedSearchTerm, location.pathname, navigate]);

  const POSTS_PER_PAGE = 5; // 1 featured + 4 in grid

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

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      
      setLoading(true);

      let query = supabase
        .from('posts')
        .select('*, categories(name), post_translations(*)');

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching posts:', error);
        setPosts([]);
      } else {
        setPosts(data || []);
      }
      setLoading(false);
    };

    fetchPosts();
  }, [selectedCategory]);

  const handleCategoryClick = (categoryId: number | null) => {
    if (categoryId === null) {
    // Already on "All" → do nothing
    if (selectedCategory === null) return;
    // Switching from a category → reset to All
    setSelectedCategory(null);
    } else if (categoryId === selectedCategory) {
      // Clicking the same category again → reset to All
      setSelectedCategory(null);
    } else {
      // Switching to a new category
      setSelectedCategory(categoryId);
    }

    
    setPosts([]);
  };

  const getTranslatedPost = (post: Post, lang: string) => {
    if (lang === 'en') {
      return { title: post.title, excerpt: post.excerpt };
    }
    const translation = post.post_translations.find((t: any) => t.language === lang);
    return {
      title: translation?.title || post.title,
      excerpt: translation?.excerpt || post.excerpt,
    };
  };


  useEffect(() => {
    if (searchTerm.trim() && filteredPosts.length === 0) {
      setNoResults(true);
    } else {
      setNoResults(false);
    }
  }, [searchTerm, filteredPosts.length]);

  const displayedPosts = noResults ? posts : filteredPosts;

  const filteredPosts = useMemo(() => {
    if (!searchTerm.trim()) {
      return posts;
    }

    const searchInTelugu = isTelugu(searchTerm);
    const effectiveSearchTerm = searchInTelugu ? searchTerm : searchTerm.toLowerCase();

    return posts.filter((post) => {
      let title = '';
      let excerpt = '';

      if (searchInTelugu) {
        const translation = post.post_translations.find((t: any) => t.language === 'te');
        title = translation?.title || '';
        excerpt = translation?.excerpt || '';
      } else {
        title = post.title.toLowerCase();
        excerpt = post.excerpt.toLowerCase();
      }

      return (
        title.includes(effectiveSearchTerm) ||
        excerpt.includes(effectiveSearchTerm)
      );
    });
  }, [posts, searchTerm]);

  const featuredPost = displayedPosts[0];
  const otherPosts = displayedPosts.slice(1);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex justify-center items-center gap-4 mb-4">
                <h1 className="text-4xl font-heading font-bold text-primary">
                  {t('learn.blog.title', 'Health Blog')}
                </h1>
                <LanguageSwitcher />
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('learn.blog.subtitle', 'Latest health tips and medical insights')}
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('learn.guides.searchPlaceholder', 'Search for a blog post...')}
                  className="w-full pl-10 py-6 text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {noResults && (
              <div className="text-center mb-8">
                <p className="text-lg text-red-500">
                  {t('learn.guides.noResults', 'No results found for your search.')}
                </p>
                <p className="text-muted-foreground">
                  {t('learn.guides.showingAll', 'Showing all posts instead.')}
                </p>
              </div>
            )}

            {/* Categories */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <Badge
                key="all"
                variant={selectedCategory === null ? 'default' : 'secondary'}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleCategoryClick(null)}
              >
                All Posts
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
            {loading && filteredPosts.length === 0 && (
              <div>
                <Card className="mb-8 overflow-hidden">
                  <div className="md:flex">
                    <div className="md:w-1/2">
                      <Skeleton className="w-full h-64 md:h-full" />
                    </div>
                    <div className="md:w-1/2 p-6">
                      <Skeleton className="h-4 w-1/4 mb-3" />
                      <Skeleton className="h-8 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-4" />
                      <div className="flex items-center text-sm text-muted-foreground mb-4">
                        <Skeleton className="h-4 w-24 mr-4" />
                        <Skeleton className="h-4 w-24 mr-4" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-10 w-32" />
                    </div>
                  </div>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <Skeleton className="h-40 w-full" />
                      <CardHeader>
                        <Skeleton className="h-4 w-1/3 mb-2" />
                        <Skeleton className="h-6 w-full mb-2" />
                        <Skeleton className="h-4 w-full" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            {!loading && filteredPosts.length === 0 && (
              <div className="text-center py-16">
                <h2 className="text-2xl font-semibold mb-2">No posts found</h2>
                <p className="text-muted-foreground">
                  There are no blog posts in this category yet. Please check back later.
                </p>
              </div>
            )}
            
            {filteredPosts.length > 0 && (
              <>
                {/* Featured Post */}
                <Card className="mb-8 overflow-hidden">
                  <div className="md:flex">
                    <div className="md:w-1/2">
                      <img
                        src={featuredPost.image_url}
                        alt={featuredPost.title}
                        className="w-full h-64 md:h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="md:w-1/2 p-6 flex flex-col justify-center">
                      <Badge className="mb-3 w-fit">{featuredPost.categories.name}</Badge>
                      <h2 className="text-2xl font-heading font-bold mb-3">
                        {getTranslatedPost(featuredPost, i18n.language).title}
                      </h2>
                      <p className="text-muted-foreground mb-4">
                        {getTranslatedPost(featuredPost, i18n.language).excerpt}
                      </p>
                      <div className="flex items-center text-sm text-muted-foreground mb-4 flex-wrap">
                        <Clock size={16} className="mr-1" />
                        <span>{featuredPost.read_time_minutes} min read</span>
                      </div>
                      <Link to={`/blog/${featuredPost.id}`}>
                        <Button className="group w-fit">
                          Read More
                          <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>

                {/* Blog Posts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherPosts.map((post) => (
                    <Link to={`/blog/${post.id}`} key={post.id}>
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={post.image_url}
                            alt={post.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary">{post.categories.name}</Badge>
                            <span className="text-xs text-muted-foreground">{post.read_time_minutes} min read</span>
                          </div>
                          <CardTitle className="text-lg leading-tight">
                            {getTranslatedPost(post, i18n.language).title}
                          </CardTitle>
                          <CardDescription>
                            {getTranslatedPost(post, i18n.language).excerpt}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>

              </>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BlogPage;
