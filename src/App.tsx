
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import AppointmentPage from "./pages/AppointmentPage";
import LegalPoliciesPage from "./pages/LegalPoliciesPage";
import WhatsAppMe from "./pages/WhatsAppMe";
import EMR from "./pages/EMR";
import PharmacyPage from "./pages/PharmacyPage";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import NotFound from "./pages/NotFound";

import { useScrollToHash } from './hooks/useScrollToHash';

const queryClient = new QueryClient();

const App = () => (
  useScrollToHash(80); // 80px offset for fixed navbar

  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/appointment" element={<AppointmentPage />} />
            <Route path="/legal" element={<LegalPoliciesPage />} />
            <Route path="/wa" element={<WhatsAppMe />} />
            <Route path="/emr" element={<EMR />} />
            <Route path="/pharmacy" element={<PharmacyPage />} />
            <Route path="/diagnostics" element={<DiagnosticsPage />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
