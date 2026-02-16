import { lazy, Suspense, useEffect } from "react";
import { HospitalsProvider } from "./context/HospitalsContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import PageLoader from "./components/PageLoader";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { trackEvent } from "./lib/analytics";
import { useAuth } from "./hooks/useAuth";

const Index = lazy(() => import("./pages/Index"));
const AppointmentPage = lazy(() => import("./pages/AppointmentPage"));
const LegalPoliciesPage = lazy(() => import("./pages/LegalPoliciesPage"));
const WhatsAppMe = lazy(() => import("./pages/WhatsAppMe"));
const PatientRegistration = lazy(() => import("./pages/PatientRegistration"));
const Consultation = lazy(() => import("./pages/Consultation"));
const ConsultationStats = lazy(() => import("./pages/ConsultationStats"));
const PharmacyPage = lazy(() => import("./pages/PharmacyPage"));
const DiagnosticsPage = lazy(() => import("./pages/DiagnosticsPage"));
const UploadPrescriptionPage = lazy(() => import("./pages/UploadPrescriptionPage"));
const TrackTestResultsPage = lazy(() => import("./pages/TrackTestResultsPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const CreatePostPage = lazy(() => import("./pages/CreatePostPage"));
const EditPostPage = lazy(() => import("./pages/EditPostPage"));
const PatientGuidesPage = lazy(() => import("./pages/PatientGuidesPage"));
const PatientGuidePage = lazy(() => import("./pages/PatientGuidePage"));
const CreateGuidePage = lazy(() => import("./pages/CreateGuidePage"));
const EditGuidePage = lazy(() => import("./pages/EditGuidePage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const SymptomCheckerPage = lazy(() => import("./pages/SymptomCheckerPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const MySpace = lazy(() => import("./pages/MySpace"));
const SendWhatsApp = lazy(() => import("./pages/SendWhatsApp"));
const PrescriptionDownload = lazy(() => import("./pages/PrescriptionDownload"));
const DischargeSummaryDownload = lazy(() => import("./pages/DischargeSummaryDownload"));

const PharmacyAdminPage = lazy(() => import("./pages/PharmacyAdminPage"));
const PharmacySupplierPage = lazy(() => import("./pages/PharmacySupplierPage"));
const PharmacyAuthGuard = lazy(() => import("./components/PharmacyAuthGuard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const InPatientManagement = lazy(() => import("./pages/InPatientManagement"));
const PublicConsentVerification = lazy(() => import("./pages/PublicConsentVerification"));
const JointReplacementPage = lazy(() => import("./pages/services/JointReplacementPage"));
const ArthroscopyPage = lazy(() => import("./pages/services/ArthroscopyPage"));
const FractureCarePage = lazy(() => import("./pages/services/FractureCarePage"));

const queryClient = new QueryClient();

const ActivityLogger = () => {
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      trackEvent({
        eventType: "page_view",
        path: location.pathname,
        user_phone: user.phoneNumber,
        user_name: user.displayName,
      });
    }
  }, [location.pathname, user, loading]);

  return null;
};

import { GlobalSyncManager } from "./components/GlobalSyncManager";

const App = () => {
  const { installPrompt, handleInstallClick } = usePWAInstall();

  // Mark page as ready for pre-rendering after components load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof document !== 'undefined') {
        document.body.setAttribute('data-prerender-ready', 'true');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HospitalsProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ActivityLogger />
              <GlobalSyncManager />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/appointment" element={<AppointmentPage />} />
                  <Route path="/appointment/:serviceType" element={<AppointmentPage />} />
                  <Route path="/legal" element={<LegalPoliciesPage />} />
                  <Route path="/wa" element={<WhatsAppMe />} />
                  <Route path="/badam" element={<PatientRegistration />} />
                  <Route path="/laxmi" element={<PatientRegistration />} />
                  <Route path="/ortholife" element={<PatientRegistration />} />
                  <Route path="/op" element={<Consultation />} />
                  <Route path="/stats" element={<ConsultationStats />} />
                  <Route path="/ip" element={<InPatientManagement />} />

                  {/* Pharmacy Routes */}
                  <Route path="/pharmacy" element={<PharmacyPage />} />
                  <Route
                    path="/pharmacy/admin"
                    element={
                      <PharmacyAuthGuard allowedRoles={['owner']}>
                        <PharmacyAdminPage />
                      </PharmacyAuthGuard>
                    }
                  />
                  <Route
                    path="/pharmacy/supplier"
                    element={
                      <PharmacyAuthGuard allowedRoles={['owner', 'supplier']}>
                        <PharmacySupplierPage />
                      </PharmacyAuthGuard>
                    }
                  />
                  <Route path="/upload-prescription" element={<UploadPrescriptionPage />} />

                  {/* Diagnostics Routes */}
                  <Route path="/diagnostics" element={<DiagnosticsPage />} />
                  <Route path="/track-test-results" element={<TrackTestResultsPage />} />

                  {/* Service Pages */}
                  <Route path="/services/joint-replacement" element={<JointReplacementPage />} />
                  <Route path="/services/arthroscopy" element={<ArthroscopyPage />} />
                  <Route path="/services/fracture-care" element={<FractureCarePage />} />

                  {/* Learn Routes */}
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/te/blog" element={<BlogPage />} />
                  <Route path="/blog/new" element={<CreatePostPage />} />
                  <Route path="/blog/:postId" element={<BlogPostPage />} />
                  <Route path="/te/blog/:postId" element={<BlogPostPage />} />
                  <Route path="/blog/:postId/edit" element={<EditPostPage />} />
                  <Route path="/guides" element={<PatientGuidesPage />} />
                  <Route path="/te/guides" element={<PatientGuidesPage />} />
                  <Route path="/guides/new" element={<CreateGuidePage />} />
                  <Route path="/guides/:guideId" element={<PatientGuidePage />} />
                  <Route path="/te/guides/:guideId" element={<PatientGuidePage />} />
                  <Route path="/guides/:guideId/edit" element={<EditGuidePage />} />
                  <Route path="/faqs" element={<FAQPage />} />
                  <Route path="/resources" element={<ResourcesPage installPrompt={installPrompt} handleInstallClick={handleInstallClick} />} />
                  <Route path="/symptom-checker" element={<SymptomCheckerPage />} />

                  {/* login routes */}
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/u/:phone" element={<AuthPage />} />
                  <Route path="/my" element={<MySpace />} />
                  <Route path="/my-space" element={<Navigate to="/my" replace />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/whatsapp" element={<SendWhatsApp />} />
                  <Route path="/p/:patientPhone" element={<PrescriptionDownload />} />
                  <Route path="/prescription" element={<PrescriptionDownload />} />
                  <Route path="/d/:patientPhone" element={<DischargeSummaryDownload />} />
                  <Route path="/d" element={<DischargeSummaryDownload />} />
                  <Route path="/consent-verify/:id" element={<PublicConsentVerification />} />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </HospitalsProvider>
    </QueryClientProvider>
  );
};

export default App;