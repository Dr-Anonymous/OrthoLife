import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, Calculator, Calendar, FileText, Smartphone, Globe, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const ResourcesPage = () => {
  const { t } = useLanguage();

  const toolsAndCalculators = [
    {
      id: 1,
      title: 'BMI Calculator',
      description: 'Calculate your Body Mass Index and understand your health status.',
      icon: Calculator,
      type: 'Interactive Tool',
      link: '#'
    },
    {
      id: 2,
      title: 'Pain Tracker',
      description: 'Track your pain levels and patterns to share with your doctor.',
      icon: Calendar,
      type: 'Interactive Tool',
      link: '#'
    },
    {
      id: 3,
      title: 'Recovery Progress Tracker',
      description: 'Monitor your post-surgery recovery milestones and exercises.',
      icon: FileText,
      type: 'Interactive Tool',
      link: '#'
    }
  ];

  const mobileApps = [
    {
      id: 1,
      title: 'OrthoLife Patient App',
      description: 'Book appointments, view reports, and access your medical records.',
      platforms: ['iOS', 'Android'],
      rating: 4.8,
      downloads: '10K+',
      icon: Smartphone
    },
    {
      id: 2,
      title: 'Exercise & Recovery',
      description: 'Guided exercises and rehabilitation programs for faster recovery.',
      platforms: ['iOS', 'Android'],
      rating: 4.6,
      downloads: '5K+',
      icon: Smartphone
    }
  ];

  const externalResources = [
    {
      id: 1,
      title: 'American Academy of Orthopedic Surgeons',
      description: 'Comprehensive orthopedic information and patient education materials.',
      url: 'https://www.aaos.org',
      type: 'Medical Organization'
    },
    {
      id: 2,
      title: 'Bone Health & Osteoporosis Foundation',
      description: 'Resources for bone health, osteoporosis prevention and treatment.',
      url: 'https://www.bonehealthandosteoporosis.org',
      type: 'Health Foundation'
    },
    {
      id: 3,
      title: 'Physical Therapy Guidelines',
      description: 'Evidence-based physical therapy practices and exercises.',
      url: 'https://www.apta.org',
      type: 'Professional Resource'
    }
  ];

  const downloadableResources = [
    {
      id: 1,
      title: 'Pre-Surgery Checklist',
      description: 'Complete checklist to prepare for your orthopedic surgery.',
      format: 'PDF',
      size: '2.1 MB',
      downloads: 1250
    },
    {
      id: 2,
      title: 'Exercise Instruction Sheets',
      description: 'Printable exercise guides for common orthopedic conditions.',
      format: 'PDF',
      size: '5.8 MB',
      downloads: 2100
    },
    {
      id: 3,
      title: 'Pain Management Diary',
      description: 'Track your pain levels, triggers, and medication effectiveness.',
      format: 'PDF',
      size: '1.5 MB',
      downloads: 890
    },
    {
      id: 4,
      title: 'Insurance Claims Guide',
      description: 'Step-by-step guide for filing and managing insurance claims.',
      format: 'PDF',
      size: '3.2 MB',
      downloads: 650
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-heading font-bold text-primary mb-4">
                {t('learn.resources.title', 'Health Resources')}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('learn.resources.subtitle', 'Useful tools and resources for your health journey')}
              </p>
            </div>

            {/* Interactive Tools & Calculators */}
            <section className="mb-12">
              <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                <Calculator className="text-primary" />
                Interactive Tools & Calculators
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {toolsAndCalculators.map((tool) => (
                  <Card key={tool.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <tool.icon className="text-primary" size={32} />
                        <Badge variant="secondary">{tool.type}</Badge>
                      </div>
                      <CardTitle className="text-lg">{tool.title}</CardTitle>
                      <CardDescription>{tool.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full group-hover:bg-primary/90 transition-colors">
                        Launch Tool
                        <ExternalLink size={16} className="ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Mobile Apps */}
            <section className="mb-12">
              <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                <Smartphone className="text-primary" />
                Mobile Apps
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mobileApps.map((app) => (
                  <Card key={app.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <app.icon className="text-primary" size={24} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{app.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-yellow-500">★</span>
                              <span className="text-sm text-muted-foreground">
                                {app.rating} • {app.downloads}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <CardDescription className="mt-3">{app.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {app.platforms.map((platform) => (
                            <Badge key={platform} variant="outline">{platform}</Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm">App Store</Button>
                          <Button size="sm" variant="outline">Play Store</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Downloadable Resources */}
            <section className="mb-12">
              <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                <Download className="text-primary" />
                Downloadable Resources
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {downloadableResources.map((resource) => (
                  <Card key={resource.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{resource.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{resource.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{resource.format}</span>
                            <span>{resource.size}</span>
                            <span>{resource.downloads} downloads</span>
                          </div>
                        </div>
                        <Button size="sm" className="ml-4 group-hover:bg-primary/90 transition-colors">
                          <Download size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* External Resources */}
            <section className="mb-12">
              <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                <Globe className="text-primary" />
                External Resources
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {externalResources.map((resource) => (
                  <Card key={resource.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{resource.title}</h3>
                            <Badge variant="outline">{resource.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{resource.description}</p>
                        </div>
                        <Button variant="outline" className="ml-4 group-hover:bg-primary/10 transition-colors">
                          Visit Site
                          <ExternalLink size={16} className="ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Emergency Contacts */}
            <Card className="bg-red-50 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <FileText className="text-red-600" />
                  Emergency Contacts & Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-red-800 mb-3">Emergency Numbers</h3>
                    <div className="space-y-2 text-sm">
                      <div>Emergency Services: <strong>108</strong></div>
                      <div>Hospital Emergency: <strong>9866812555</strong></div>
                      <div>Poison Control: <strong>1066</strong></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800 mb-3">When to Seek Emergency Care</h3>
                    <ul className="text-sm space-y-1 text-red-700">
                      <li>• Severe bleeding or trauma</li>
                      <li>• Loss of consciousness</li>
                      <li>• Severe difficulty breathing</li>
                      <li>• Signs of stroke or heart attack</li>
                    </ul>
                  </div>
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

export default ResourcesPage;