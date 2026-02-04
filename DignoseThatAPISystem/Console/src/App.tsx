import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";

import Auth from "./pages/Auth";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import UsageGuide from "./pages/UsageGuide";
import Companies from "./pages/Companies";
import CompanyNew from "./pages/CompanyNew";
import CompanyDetail from "./pages/CompanyDetail";
import ApiKeys from "./pages/company/ApiKeys";
import Logs from "./pages/company/Logs";
import Analytics from "./pages/company/Analytics";
import Billing from "./pages/company/Billing";
import CompanySettings from "./pages/company/Settings";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/guide" element={<UsageGuide />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/new" element={<CompanyNew />} />
              <Route path="/companies/:id" element={<CompanyDetail />}>
                <Route index element={<Navigate to="api-keys" replace />} />
                <Route path="api-keys" element={<ApiKeys />} />
                <Route path="logs" element={<Logs />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="billing" element={<Billing />} />
                <Route path="settings" element={<CompanySettings />} />
              </Route>
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
