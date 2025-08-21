import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, Calculator, Calendar, FileText, Smartphone, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import BMICalculator from '@/components/BMICalculator';
import PainTracker from '@/components/PainTracker';
import RecoveryProgressTracker from '@/components/RecoveryProgressTracker';

const ResourcesPage = () => {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      (installPrompt as any).prompt();
      (installPrompt as any).userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setInstallPrompt(null);
      });
    }
  };

  const toolsAndCalculators = [
    { id: 1, titleKey: 'resources.tool1.title', descriptionKey: 'resources.tool1.description', icon: Calculator, type: 'Interactive Tool', component: <BMICalculator /> },
    { id: 2, titleKey: 'resources.tool2.title', descriptionKey: 'resources.tool2.description', icon: Calendar, type: 'Interactive Tool', component: <PainTracker /> },
    { id: 3, titleKey: 'resources.tool3.title', descriptionKey: 'resources.tool3.description', icon: FileText, type: 'Interactive Tool', component: <RecoveryProgressTracker /> }
  ];

  const mobileApps = [
    { id: 1, titleKey: 'resources.app1.title', descriptionKey: 'resources.app1.description', platforms: ['iOS', 'Android'], rating: 4.8, downloads: '10K+', icon: Smartphone },
    { id: 2, titleKey: 'resources.app2.title', descriptionKey: 'resources.app2.description', platforms: ['iOS', 'Android'], rating: 4.6, downloads: '5K+', icon: Smartphone }
  ];

  const externalResources = [
    { id: 1, titleKey: 'resources.external1.title', descriptionKey: 'resources.external1.description', url: 'https://www.aaos.org', type: 'Medical Organization' },
    { id: 2, titleKey: 'resources.external2.title', descriptionKey: 'resources.external2.description', url: 'https://www.bonehealthandosteoporosis.org', type: 'Health Foundation' },
    { id: 3, titleKey: 'resources.external3.title', descriptionKey: 'resources.external3.description', url: 'https://www.apta.org', type: 'Professional Resource' }
  ];

  const downloadableResources = [
    { id: 1, titleKey: 'resources.download1.title', descriptionKey: 'resources.download1.description', format: 'PDF', size: '2.1 MB', downloads: 1250 },
    { id: 2, titleKey: 'resources.download2.title', descriptionKey: 'resources.download2.description', format: 'PDF', size: '5.8 MB', downloads: 2100 },
    { id: 3, titleKey: 'resources.download3.title', descriptionKey: 'resources.download3.description', format: 'PDF', size: '1.5 MB', downloads: 890 },
    { id: 4, titleKey: 'resources.download4.title', descriptionKey: 'resources.download4.description', format: 'PDF', size: '3.2 MB', downloads: 650 }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex justify-center items-center gap-4 mb-4">
                <h1 className="text-4xl font-heading font-bold text-primary">
                  {t('learn.resources.title', 'Health Resources')}
                </h1>
                <LanguageSwitcher />
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('learn.resources.subtitle', 'Useful tools and resources for your health journey')}
              </p>
            </div>

            {/* Interactive Tools & Calculators */}
            <section className="mb-12">
              <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                <Calculator className="text-primary" />
                {t('resources.tools.title')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {toolsAndCalculators.map((tool) => (
                  <Dialog key={tool.id}>
                    <Card className="hover:shadow-lg transition-shadow group flex flex-col">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <tool.icon className="text-primary" size={32} />
                          <Badge variant="secondary">{tool.type}</Badge>
                        </div>
                        <CardTitle className="text-lg">{t(tool.titleKey)}</CardTitle>
                        <CardDescription>{t(tool.descriptionKey)}</CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto">
                        <DialogTrigger asChild>
                          <Button className="w-full group-hover:bg-primary/90 transition-colors">
                            {t('resources.tools.launch')}
                            <ExternalLink size={16} className="ml-2" />
                          </Button>
                        </DialogTrigger>
                      </CardContent>
                    </Card>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t(tool.titleKey)}</DialogTitle>
                      </DialogHeader>
                      {tool.component}
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </section>

            {/* Mobile Apps */}
            <section className="mb-12">
              <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                <Smartphone className="text-primary" />
                {t('resources.apps.title')}
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
                            <CardTitle className="text-lg">{t(app.titleKey)}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-yellow-500">★</span>
                              <span className="text-sm text-muted-foreground">
                                {app.rating} • {app.downloads}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <CardDescription className="mt-3">{t(app.descriptionKey)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {app.platforms.map((platform) => (
                            <Badge key={platform} variant="outline">{platform}</Badge>
                          ))}
                        </div>
                        {app.id === 1 && installPrompt ? (
                          <Button size="sm" onClick={handleInstallClick}>
                            {t('resources.apps.install')}
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" disabled={app.id === 1}>App Store</Button>
                            <Button size="sm" variant="outline" disabled={app.id === 1}>Play Store</Button>
                          </div>
                        )}
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
                {t('resources.downloads.title')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {downloadableResources.map((resource) => (
                  <Card key={resource.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{t(resource.titleKey)}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{t(resource.descriptionKey)}</p>
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
                {t('resources.external.title')}
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {externalResources.map((resource) => (
                  <Card key={resource.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{t(resource.titleKey)}</h3>
                            <Badge variant="outline">{resource.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{t(resource.descriptionKey)}</p>
                        </div>
                        <Button variant="outline" className="ml-4 group-hover:bg-primary/10 transition-colors">
                          {t('resources.external.visit')}
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
                  {t('resources.emergency.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-red-800 mb-3">{t('resources.emergency.numbersTitle')}</h3>
                    <div className="space-y-2 text-sm">
                      <div dangerouslySetInnerHTML={{ __html: t('resources.emergency.services') }} />
                      <div dangerouslySetInnerHTML={{ __html: t('resources.emergency.hospital') }} />
                      <div dangerouslySetInnerHTML={{ __html: t('resources.emergency.poison') }} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800 mb-3">{t('resources.emergency.whenToSeekCare')}</h3>
                    <ul className="text-sm space-y-1 text-red-700">
                      <li>{t('resources.emergency.careItem1')}</li>
                      <li>{t('resources.emergency.careItem2')}</li>
                      <li>{t('resources.emergency.careItem3')}</li>
                      <li>{t('resources.emergency.careItem4')}</li>
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