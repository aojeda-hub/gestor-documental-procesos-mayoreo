import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { lazy, Suspense } from "react";
import Auth from "@/pages/Auth";
import NotFound from "./pages/NotFound.tsx";

// Cada pantalla se descarga solo al abrirla: antes toda la app (incluidas
// librerías pesadas de PDF, Excel, gráficos) se bajaba de una vez al entrar.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Documents = lazy(() => import("@/pages/Documents"));
const Indicators = lazy(() => import("@/pages/Indicators"));
const MapaProcesos = lazy(() => import("@/pages/MapaProcesos"));
const BPA = lazy(() => import("@/pages/BPA"));
const Desarrollos = lazy(() => import("@/pages/Desarrollos"));
const Projects = lazy(() => import("@/pages/Projects"));
const Seguimientos = lazy(() => import("@/pages/Seguimientos"));
const Skills = lazy(() => import("@/pages/Skills"));
const Users = lazy(() => import("@/pages/Users"));
const Admin = lazy(() => import("@/pages/Admin"));
import type { AppRole } from "@/types/database";

const queryClient = new QueryClient();

const PageLoading = () => <div className="flex h-full items-center justify-center p-12 text-muted-foreground">Cargando...</div>;
const Loading = () => <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando...</div>;

/**
 * Exige sesión y, además, uno de los roles indicados. Sin `roles`, basta con
 * tener cualquiera de los roles del sistema. La BD (RLS) es la protección
 * real; esto evita entrar a pantallas no permitidas escribiendo la URL.
 */
function ProtectedRoute({ children, roles: allowed }: { children: React.ReactNode; roles?: AppRole[] }) {
  const { user, loading, roles, rolesLoaded } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!rolesLoaded) return <Loading />;
  const permitido = allowed ? allowed.some((r) => roles.includes(r)) : roles.length > 0;
  if (!permitido) {
    if (roles.length > 0) return <Navigate to="/" replace />;
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
          Tu usuario no tiene un rol asignado. Contacta a un administrador.
        </div>
      </AppLayout>
    );
  }
  return <AppLayout><Suspense fallback={<PageLoading />}>{children}</Suspense></AppLayout>;
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
            <Route path="/documentos" element={<ProtectedRoute roles={["admin", "responsable_metodos"]}><Documents /></ProtectedRoute>} />
            <Route path="/mapa-procesos" element={<ProtectedRoute roles={["admin", "responsable_metodos"]}><MapaProcesos /></ProtectedRoute>} />
            <Route path="/indicadores" element={<ProtectedRoute><Indicators /></ProtectedRoute>} />
            <Route path="/proyectos" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/seguimientos" element={<ProtectedRoute><Seguimientos /></ProtectedRoute>} />
            <Route path="/bpa" element={<ProtectedRoute roles={["admin", "responsable_metodos"]}><BPA /></ProtectedRoute>} />
            <Route path="/desarrollos" element={<ProtectedRoute><Desarrollos /></ProtectedRoute>} />
            <Route path="/skills" element={<ProtectedRoute><Skills /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute roles={["admin"]}><Users /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
