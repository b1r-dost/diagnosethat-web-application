import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/hooks/useAuth";
import { toast } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import NewPatient from "./pages/NewPatient";
import PatientDetail from "./pages/PatientDetail";
import UploadRadiograph from "./pages/UploadRadiograph";
import Analysis from "./pages/Analysis";
import MyRadiographs from "./pages/MyRadiographs";
import Settings from "./pages/Settings";
import Suggestions from "./pages/Suggestions";
import Guide from "./pages/Guide";
import Admin from "./pages/Admin";
import Payment from "./pages/Payment";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      toast.error("Beklenmeyen bir hata oluştu");
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/patients" element={<Patients />} />
                <Route path="/patients/new" element={<NewPatient />} />
                <Route path="/patients/:id" element={<PatientDetail />} />
                <Route path="/patients/:id/upload" element={<UploadRadiograph />} />
                <Route path="/analysis/:id" element={<Analysis />} />
                <Route path="/my-radiographs" element={<MyRadiographs />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/suggestions" element={<Suggestions />} />
                <Route path="/guide" element={<Guide />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/payment" element={<Payment />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

const App = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;
