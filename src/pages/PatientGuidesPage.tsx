import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Download, Eye, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TranslatedText } from '@/components/TranslatedText';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const PatientGuidesPage = () => {
  const { t } = useLanguage();

  const guides = [
    {
      id: 1,
      title: 'Pre-Surgery Preparation Guide',
      description: 'Complete guide on how to prepare for orthopedic surgery, including diet, medications, and what to expect.',
      category: 'Surgery',
      pages: 12,
      downloadCount: 1250,
      lastUpdated: '2024-01-15',
      difficulty: 'Beginner',
      estimatedTime: '15 min read',
      coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop'
    },
    {
      id: 2,
      title: 'Post-Operative Recovery Manual',
      description: 'Comprehensive recovery guide including exercises, pain management, and milestone tracking.',
      category: 'Recovery',
      pages: 24,
      downloadCount: 980,
      lastUpdated: '2024-01-12',
      difficulty: 'Intermediate',
      estimatedTime: '25 min read',
      coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop'
    },
    {
      id: 3,
      title: 'Managing Chronic Pain',
      description: 'Practical strategies for living with chronic orthopedic pain and improving quality of life.',
      category: 'Pain Management',
      pages: 18,
      downloadCount: 2100,
      lastUpdated: '2024-01-10',
      difficulty: 'Beginner',
      estimatedTime: '20 min read',
      coverImage: 'https://images.unsplash.com/photo-1594824369069-c9a3dd6e2019?w=400&h=300&fit=crop'
    },
    {
      id: 4,
      title: 'Physical Therapy Exercise Guide',
      description: 'Step-by-step exercises for rehabilitation with detailed instructions and safety tips.',
      category: 'Physical Therapy',
      pages: 32,
      downloadCount: 1800,
      lastUpdated: '2024-01-08',
      difficulty: 'Intermediate',
      estimatedTime: '30 min read',
      coverImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
    },
    {
      id: 5,
      title: 'Bone Health and Nutrition',
      description: 'Essential nutrients, foods, and lifestyle changes to maintain strong and healthy bones.',
      category: 'Prevention',
      pages: 16,
      downloadCount: 1500,
      lastUpdated: '2024-01-05',
      difficulty: 'Beginner',
      estimatedTime: '18 min read',
      coverImage: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=300&fit=crop'
    },
    {
      id: 6,
      title: 'Understanding Joint Replacement',
      description: 'Complete guide to joint replacement surgery, from decision-making to long-term care.',
      category: 'Surgery',
      pages: 28,
      downloadCount: 950,
      lastUpdated: '2024-01-03',
      difficulty: 'Advanced',
      estimatedTime: '35 min read',
      coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop'
    }
  ];

  const categories = ['All Guides', 'Surgery', 'Recovery', 'Pain Management', 'Physical Therapy', 'Prevention'];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'Advanced':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
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
                  {t('learn.guides.title', 'Patient Guides')}
                </h1>
                <LanguageSwitcher />
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('learn.guides.subtitle', 'Comprehensive guides for better health management')}
              </p>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={category === 'All Guides' ? 'default' : 'secondary'}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {category}
                </Badge>
              ))}
            </div>

            {/* Featured Guide */}
            <Card className="mb-8 overflow-hidden bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <div className="md:flex">
                <div className="md:w-1/3">
                  <img
                    src={guides[0].coverImage}
                    alt={guides[0].title}
                    className="w-full h-64 md:h-full object-cover"
                  />
                </div>
                <div className="md:w-2/3 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge><TranslatedText>{guides[0].category}</TranslatedText></Badge>
                    <Badge className={getDifficultyColor(guides[0].difficulty)}>
                      <TranslatedText>{guides[0].difficulty}</TranslatedText>
                    </Badge>
                    <span className="text-sm text-muted-foreground"><TranslatedText>Featured</TranslatedText></span>
                  </div>
                  <h2 className="text-2xl font-heading font-bold mb-3">
                    <TranslatedText>{guides[0].title}</TranslatedText>
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    <TranslatedText>{guides[0].description}</TranslatedText>
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground mb-6 space-x-4">
                    <div className="flex items-center">
                      <BookOpen size={16} className="mr-1" />
                      <span>{guides[0].pages} pages</span>
                    </div>
                    <div className="flex items-center">
                      <Clock size={16} className="mr-1" />
                      <span>{guides[0].estimatedTime}</span>
                    </div>
                    <div className="flex items-center">
                      <Download size={16} className="mr-1" />
                      <span>{guides[0].downloadCount.toLocaleString()} downloads</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button className="flex items-center gap-2">
                      <Eye size={16} />
                      <TranslatedText>Read Online</TranslatedText>
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Download size={16} />
                      <TranslatedText>Download PDF</TranslatedText>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Guides Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {guides.slice(1).map((guide) => (
                <Card key={guide.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={guide.coverImage}
                      alt={guide.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{guide.category}</Badge>
                      <Badge className={getDifficultyColor(guide.difficulty)}>
                        {guide.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      <TranslatedText>{guide.title}</TranslatedText>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      <TranslatedText>{guide.description}</TranslatedText>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center">
                          <BookOpen size={14} className="mr-1" />
                          {guide.pages}p
                        </span>
                        <span className="flex items-center">
                          <Clock size={14} className="mr-1" />
                          {guide.estimatedTime.split(' ')[0]}m
                        </span>
                      </div>
                      <span className="flex items-center">
                        <Download size={14} className="mr-1" />
                        {guide.downloadCount}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        <Eye size={14} className="mr-1" />
                        <TranslatedText>Read</TranslatedText>
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Download size={14} className="mr-1" />
                        <TranslatedText>PDF</TranslatedText>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Call to Action */}
            <Card className="mt-12 bg-primary/5 border-primary/20">
              <CardContent className="text-center py-8">
                <BookOpen className="mx-auto mb-4 text-primary" size={48} />
                <h3 className="text-2xl font-heading font-bold mb-2">
                  <TranslatedText>Need a Custom Guide?</TranslatedText>
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  <TranslatedText>Our medical team can create personalized guides based on your specific condition and treatment plan.</TranslatedText>
                </p>
                <Button size="lg">
                  <TranslatedText>Request Custom Guide</TranslatedText>
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
