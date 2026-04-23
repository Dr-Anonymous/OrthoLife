import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, Calculator, Calendar, FileText, Globe, Activity, Droplets, Thermometer, ShieldCheck, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import BMICalculator from '@/components/BMICalculator';
import PainTracker from '@/components/PainTracker';
import RecoveryProgressTracker from '@/components/RecoveryProgressTracker';
import BloodPressureTracker from '@/components/BloodPressureTracker';
import BloodSugarTracker from '@/components/BloodSugarTracker';
import TemperatureTracker from '@/components/TemperatureTracker';

import PatientSelectionModal from '@/components/PatientSelectionModal';

const ResourcesPage = () => {
  const { t } = useTranslation();
  const { toolId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const phoneParam = searchParams.get('p');
  const { user, loading, patients, selectedPatient, setSelectedPatient } = useAuth();
  const [openToolId, setOpenToolId] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isPatientSelectionModalOpen, setIsPatientSelectionModalOpen] = useState(false);

  const toolsAndCalculators = [
    { id: 1, routeId: 'bmi-calculator', titleKey: 'resources.tool1.title', descriptionKey: 'resources.tool1.description', icon: Calculator, type: 'Interactive Tool', component: <BMICalculator /> },
    { id: 2, routeId: 'pain-tracker', titleKey: 'resources.tool2.title', descriptionKey: 'resources.tool2.description', icon: Calendar, type: 'Interactive Tool', component: <PainTracker /> },
    { id: 3, routeId: 'recovery-tracker', titleKey: 'resources.tool3.title', descriptionKey: 'resources.tool3.description', icon: FileText, type: 'Interactive Tool', component: <RecoveryProgressTracker /> },
    { id: 4, routeId: 'bp-tracker', titleKey: 'resources.tool4.title', descriptionKey: 'resources.tool4.description', icon: Activity, type: 'Interactive Tool', component: <BloodPressureTracker /> },
    { id: 5, routeId: 'sugar-tracker', titleKey: 'resources.tool5.title', descriptionKey: 'resources.tool5.description', icon: Droplets, type: 'Interactive Tool', component: <BloodSugarTracker /> },
    { id: 6, routeId: 'temp-tracker', titleKey: 'resources.tool6.title', descriptionKey: 'resources.tool6.description', icon: Thermometer, type: 'Interactive Tool', component: <TemperatureTracker /> }
  ];

  useEffect(() => {
    if (toolId) {
      setOpenToolId(toolId);
    } else {
      setOpenToolId(null);
    }
  }, [toolId]);

  useEffect(() => {
    // If a phone number is provided but user is not logged in, show login prompt
    if (!loading && phoneParam && !user && toolId) {
      setShowLoginPrompt(true);
    }
  }, [loading, phoneParam, user, toolId]);

  // Open selection modal if multiple patients and none selected
  useEffect(() => {
    if (!loading && user && patients.length > 1 && !selectedPatient) {
      setIsPatientSelectionModalOpen(true);
    }
  }, [loading, user, patients.length, selectedPatient]);

  const handlePatientSelect = (patient: any) => {
    setSelectedPatient(patient);
    setIsPatientSelectionModalOpen(false);
  };

  const handleOpenChange = (open: boolean, routeId: string) => {
    if (open) {
      // If patient is not logged in but we have their phone, prompt them
      if (!user && phoneParam) {
        setShowLoginPrompt(true);
        return;
      }
      navigate(`/resources/${routeId}${location.search}`);
    } else {
      navigate(`/resources${location.search}`);
    }
  };

  const handleLogin = () => {
    if (phoneParam) {
      navigate(`/u/${phoneParam}?redirect=${location.pathname}${location.search}`);
    } else {
      navigate(`/auth?redirect=${location.pathname}${location.search}`);
    }
  };

  const externalResources = [
    { id: 1, titleKey: 'resources.external1.title', descriptionKey: 'resources.external1.description', url: 'https://orthosam.com', type: 'Website' },
    { id: 2, titleKey: 'resources.external2.title', descriptionKey: 'resources.external2.description', url: 'https://g.page/r/CbMg_hjmdmGIEAI/', type: 'Profile' },
    { id: 3, titleKey: 'resources.external3.title', descriptionKey: 'resources.external3.description', url: 'https://g.page/orthosam', type: 'Profile' }
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

      {/* Login Requirement Dialog */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <ShieldCheck className="w-5 h-5" />
              Verification Required
            </DialogTitle>
            <DialogDescription className="pt-2">
              To securely track your health data and share progress with your doctor, please verify your phone number.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <UserCheck className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-semibold text-lg">Hello! 👋</p>
              <p className="text-sm text-muted-foreground">
                By logging in, your vitals will be automatically linked to your patient record at the clinic.
              </p>
            </div>
            <Button onClick={handleLogin} className="w-full h-12 text-lg shadow-lg">
              Verify & Start Tracking
            </Button>
            <Button variant="ghost" onClick={() => setShowLoginPrompt(false)} className="text-muted-foreground">
              Continue as Guest (Not Shared)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PatientSelectionModal
        isOpen={isPatientSelectionModalOpen}
        patients={patients}
        onSelect={handlePatientSelect}
      />

      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex justify-center items-center gap-4 mb-4">
                <h1 className="text-4xl font-heading font-bold text-primary">
                  {t('resources.title', 'Health Resources')}
                </h1>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('resources.subtitle', 'Useful tools and resources for your health journey')}
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
                  <Dialog 
                    key={tool.id} 
                    open={openToolId === tool.routeId} 
                    onOpenChange={(open) => handleOpenChange(open, tool.routeId)}
                  >
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
                    <DialogContent className="sm:max-w-[900px] w-[95vw] overflow-y-auto max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle>{t(tool.titleKey)}</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        {tool.component}
                      </div>
                    </DialogContent>
                  </Dialog>
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
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{t(resource.titleKey)}</h3>
                            <Badge variant="outline">{resource.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{t(resource.descriptionKey)}</p>
                        </div>
                        <Button onClick={(e) => { e.preventDefault(); window.location.href = resource.url; }} variant="outline" className="ml-4 group-hover:bg-primary/10 transition-colors">
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
