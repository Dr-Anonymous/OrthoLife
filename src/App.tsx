import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import PageLoader from "./components/PageLoader";

const Index = lazy(() => import("./pages/Index"));
const AppointmentPage = lazy(() => import("./pages/AppointmentPage"));
const LegalPoliciesPage = lazy(() => import("./pages/LegalPoliciesPage"));
const WhatsAppMe = lazy(() => import("./pages/WhatsAppMe"));
const EMR = lazy(() => import("./pages/EMR"));
const PharmacyPage = lazy(() => import("./pages/PharmacyPage"));
const DiagnosticsPage = lazy(() => import("./pages/DiagnosticsPage"));
const UploadPrescriptionPage = lazy(() => import("./pages/UploadPrescriptionPage"));
const TrackTestResultsPage = lazy(() => import("./pages/TrackTestResultsPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const CreatePostPage = lazy(() => import("./pages/CreatePostPage"));
const EditPostPage = lazy(() => import("./pages/EditPostPage"));
const PatientGuidesPage = lazy(() => import("./pages/PatientGuidesPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
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

              {/* Pharmacy Routes */}
              <Route path="/pharmacy" element={<PharmacyPage />} />
              <Route path="/upload-prescription" element={<UploadPrescriptionPage />} />

              {/* Diagnostics Routes */}
              <Route path="/diagnostics" element={<DiagnosticsPage />} />
              <Route path="/track-test-results" element={<TrackTestResultsPage />} />

              {/* Learn Routes */}
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/new" element={<CreatePostPage />} />
              <Route path="/blog/:postId" element={<BlogPostPage />} />
              <Route path="/blog/:postId/edit" element={<EditPostPage />} />
              <Route path="/patient-guides" element={<PatientGuidesPage />} />
              <Route path="/faqs" element={<FAQPage />} />
              <Route path="/resources" element={<ResourcesPage />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
