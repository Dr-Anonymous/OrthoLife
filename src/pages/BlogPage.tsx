import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Clock, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const BlogPage = () => {
  const { t } = useLanguage();

  const blogPosts = [
    {
      id: 1,
      title: '5 Essential Tips for Maintaining Healthy Bones',
      excerpt: 'Learn about the key nutrients and exercises that keep your bones strong and healthy throughout life.',
      author: 'Dr. Sarah Wilson',
      date: '2024-01-15',
      readTime: '5 min read',
      category: 'Bone Health',
      image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop'
    },
    {
      id: 2,
      title: 'Understanding Osteoporosis: Prevention and Treatment',
      excerpt: 'A comprehensive guide to understanding osteoporosis, its risk factors, and modern treatment approaches.',
      author: 'Dr. Michael Johnson',
      date: '2024-01-12',
      readTime: '8 min read',
      category: 'Osteoporosis',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=500&h=300&fit=crop'
    },
    {
      id: 3,
      title: 'Post-Surgery Recovery: What to Expect',
      excerpt: 'Essential information about the recovery process after orthopedic surgery and how to optimize healing.',
      author: 'Dr. Emily Davis',
      date: '2024-01-10',
      readTime: '6 min read',
      category: 'Surgery Recovery',
      image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=500&h=300&fit=crop'
    },
    {
      id: 4,
      title: 'Managing Chronic Joint Pain Naturally',
      excerpt: 'Discover natural methods and lifestyle changes that can help reduce chronic joint pain and inflammation.',
      author: 'Dr. Robert Chen',
      date: '2024-01-08',
      readTime: '7 min read',
      category: 'Pain Management',
      image: 'https://images.unsplash.com/photo-1594824369069-c9a3dd6e2019?w=500&h=300&fit=crop'
    },
    {
      id: 5,
      title: 'The Role of Physical Therapy in Recovery',
      excerpt: 'Understanding how physical therapy accelerates healing and prevents future injuries.',
      author: 'Dr. Lisa Thompson',
      date: '2024-01-05',
      readTime: '5 min read',
      category: 'Physical Therapy',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=300&fit=crop'
    }
  ];

  const categories = [
    'All Posts',
    'Bone Health',
    'Osteoporosis', 
    'Surgery Recovery',
    'Pain Management',
    'Physical Therapy'
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-heading font-bold text-primary mb-4">
                {t('learn.blog.title', 'Health Blog')}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('learn.blog.subtitle', 'Latest health tips and medical insights')}
              </p>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={category === 'All Posts' ? 'default' : 'secondary'}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {category}
                </Badge>
              ))}
            </div>

            {/* Featured Post */}
            <Card className="mb-8 overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/2">
                  <img
                    src={blogPosts[0].image}
                    alt={blogPosts[0].title}
                    className="w-full h-64 md:h-full object-cover"
                  />
                </div>
                <div className="md:w-1/2 p-6">
                  <Badge className="mb-3">{blogPosts[0].category}</Badge>
                  <h2 className="text-2xl font-heading font-bold mb-3">
                    {blogPosts[0].title}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {blogPosts[0].excerpt}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <User size={16} className="mr-1" />
                    <span className="mr-4">{blogPosts[0].author}</span>
                    <Calendar size={16} className="mr-1" />
                    <span className="mr-4">{blogPosts[0].date}</span>
                    <Clock size={16} className="mr-1" />
                    <span>{blogPosts[0].readTime}</span>
                  </div>
                  <Button className="group">
                    Read More
                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Blog Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts.slice(1).map((post) => (
                <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">{post.category}</Badge>
                      <span className="text-xs text-muted-foreground">{post.readTime}</span>
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      {post.title}
                    </CardTitle>
                    <CardDescription>
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User size={14} className="mr-1" />
                      <span className="mr-3">{post.author}</span>
                      <Calendar size={14} className="mr-1" />
                      <span>{post.date}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More */}
            <div className="text-center mt-12">
              <Button variant="outline" size="lg">
                Load More Articles
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BlogPage;