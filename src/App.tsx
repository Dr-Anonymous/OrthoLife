
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import AppointmentPage from "./pages/AppointmentPage";
import LegalPoliciesPage from "./pages/LegalPoliciesPage";
import WhatsAppMe from "./pages/WhatsAppMe";
import EMR from "./pages/EMR";
import PharmacyPage from "./pages/PharmacyPage";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import UploadPrescriptionPage from "./pages/UploadPrescriptionPage";
import TrackTestResultsPage from "./pages/TrackTestResultsPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import PatientGuidesPage from "./pages/PatientGuidesPage";
import FAQPage from "./pages/FAQPage";
import ResourcesPage from "./pages/ResourcesPage";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LanguageProvider>
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
              <Route path="/blog/:postId" element={<BlogPostPage />} />
              <Route path="/patient-guides" element={<PatientGuidesPage />} />
              <Route path="/faqs" element={<FAQPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </LanguageProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
