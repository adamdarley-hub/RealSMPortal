import "./global.css";

import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Lazy load all pages for optimal code splitting
const Index = React.lazy(() => import("./pages/Index"));
const Jobs = React.lazy(() => import("./pages/Jobs"));
const JobDetail = React.lazy(() => import("./pages/JobDetail"));
const Documents = React.lazy(() => import("./pages/Documents"));
const Invoices = React.lazy(() => import("./pages/Invoices"));
const Clients = React.lazy(() => import("./pages/Clients"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const Settings = React.lazy(() => import("./pages/Settings"));
const ApiConfig = React.lazy(() => import("./pages/ApiConfig"));
const SupabaseMigration = React.lazy(() => import("./pages/SupabaseMigration"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

// Optimized loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center space-y-4">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/api-config" element={<ApiConfig />} />
          <Route path="/supabase-migration" element={<SupabaseMigration />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
