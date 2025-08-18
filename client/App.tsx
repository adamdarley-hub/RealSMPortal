import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useState, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { StripeProvider } from "./contexts/StripeContext";

// Admin pages
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Documents from "./pages/Documents";
import Invoices from "./pages/Invoices";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import ApiConfig from "./pages/ApiConfig";
import SupabaseMigration from "./pages/SupabaseMigration";

// Auth and Client pages
import Login from "./pages/Login";
import ClientDashboard from "./pages/ClientDashboard";
import ClientInvoices from "./pages/ClientInvoices";
import ClientInvoiceDetail from "./pages/ClientInvoiceDetail";
import ClientProfile from "./pages/ClientProfile";
import ClientJobDetail from "./pages/ClientJobDetail";
import ClientSettings from "./pages/ClientSettings";
import NotFound from "./pages/NotFound";
import ApiTest from "./pages/ApiTest";
import StripeIntegrationExample from "./pages/StripeIntegrationExample";

const queryClient = new QueryClient();

// Route protection components
function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'admin' | 'client' }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/' : '/client'} replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/' : '/client'} replace />;
  }

  return <>{children}</>;
}

function DemoRoute({ children }: { children: React.ReactNode }) {
  const { user, login } = useAuth();
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);

  useEffect(() => {
    if (!user && !isAutoLoggingIn) {
      setIsAutoLoggingIn(true);
      // Auto-login admin user for demo
      login('admin@serveportal.com', 'password').then(() => {
        setIsAutoLoggingIn(false);
      });
    }
  }, [user, login, isAutoLoggingIn]);

  if (!user || isAutoLoggingIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading demo...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Demo route for Builder.io - auto-login admin */}
      <Route path="/demo" element={<DemoRoute><Index /></DemoRoute>} />

      {/* Admin routes */}
      <Route path="/" element={<ProtectedRoute role="admin"><Index /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute role="admin"><Jobs /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute role="admin"><JobDetail /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute role="admin"><Documents /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute role="admin"><Invoices /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute role="admin"><Clients /></ProtectedRoute>} />
      <Route path="/clients/:id" element={<ProtectedRoute role="admin"><ClientDetail /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute role="admin"><Analytics /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute role="admin"><Settings /></ProtectedRoute>} />
      <Route path="/api-config" element={<ProtectedRoute role="admin"><ApiConfig /></ProtectedRoute>} />
      <Route path="/api-test" element={<ProtectedRoute role="admin"><ApiTest /></ProtectedRoute>} />
      <Route path="/stripe-demo" element={<ProtectedRoute role="admin"><StripeProvider><StripeIntegrationExample /></StripeProvider></ProtectedRoute>} />
      <Route path="/supabase-migration" element={<ProtectedRoute role="admin"><SupabaseMigration /></ProtectedRoute>} />

      {/* Client routes */}
      <Route path="/client" element={<ProtectedRoute role="client"><StripeProvider><ClientDashboard /></StripeProvider></ProtectedRoute>} />
      <Route path="/client/invoices" element={<ProtectedRoute role="client"><StripeProvider><ClientInvoices /></StripeProvider></ProtectedRoute>} />
      <Route path="/client/invoices/:id" element={<ProtectedRoute role="client"><StripeProvider><ClientInvoiceDetail /></StripeProvider></ProtectedRoute>} />
      <Route path="/client/profile" element={<ProtectedRoute role="client"><StripeProvider><ClientProfile /></StripeProvider></ProtectedRoute>} />
      <Route path="/client/jobs/:id" element={<ProtectedRoute role="client"><StripeProvider><ClientJobDetail /></StripeProvider></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
