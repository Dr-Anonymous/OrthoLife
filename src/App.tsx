import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import PageLoader from "./components/PageLoader";
import { usePWAInstall } from "./hooks/usePWAInstall";

const Index = lazy(() => import("./pages/Index"));
const AppointmentPage = lazy(() => import("./pages/AppointmentPage"));
const LegalPoliciesPage = lazy(() => import("./pages/LegalPoliciesPage"));
const WhatsAppMe = lazy(() => import("./pages/WhatsAppMe"));
const EMR = lazy(() => import("./pages/EMR"));
const PatientRegistration = lazy(() => import("./pages/PatientRegistration"));
const Consultation = lazy(() => import("./pages/Consultation"));
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
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

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
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/appointment" element={<AppointmentPage />} />
                <Route path="/legal" element={<LegalPoliciesPage />} />
                <Route path="/wa" element={<WhatsAppMe />} />
                <Route path="/emr" element={<EMR />} />
                <Route path="/patient-registration" element={<PatientRegistration />} />
                <Route path="/consultation" element={<Consultation />} />

                {/* Pharmacy Routes */}
                <Route path="/pharmacy" element={<PharmacyPage />} />
                <Route path="/upload-prescription" element={<UploadPrescriptionPage />} />

                {/* Diagnostics Routes */}
                <Route path="/diagnostics" element={<DiagnosticsPage />} />
                <Route path="/track-test-results" element={<TrackTestResultsPage />} />

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
                <Route
                  path="/resources"
                  element={
                    <ResourcesPage
                      installPrompt={installPrompt}
                      handleInstallClick={handleInstallClick}
                    />
                  }
                />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/symptom-checker" element={<SymptomCheckerPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/my-space" element={<MySpace />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
