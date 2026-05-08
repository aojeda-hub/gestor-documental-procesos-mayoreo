import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import Indicators from "@/pages/Indicators";
import BPA from "@/pages/BPA";
import Desarrollos from "@/pages/Desarrollos";
import Projects from "@/pages/Projects";
import Seguimientos from "@/pages/Seguimientos";
import Users from "@/pages/Users";
import Admin from "@/pages/Admin";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando...</div>;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/documentos" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/indicadores" element={<ProtectedRoute><Indicators /></ProtectedRoute>} />
            <Route path="/proyectos" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/seguimientos" element={<ProtectedRoute><Seguimientos /></ProtectedRoute>} />
            <Route path="/bpa" element={<ProtectedRoute><BPA /></ProtectedRoute>} />
            <Route path="/desarrollos" element={<ProtectedRoute><Desarrollos /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
