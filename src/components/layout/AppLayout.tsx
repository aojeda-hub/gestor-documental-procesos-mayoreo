import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, BarChart3, LogOut, Menu, X, Users as UsersIcon, Network, FolderKanban, Briefcase
} from 'lucide-react';
import { SILO_LABELS, ROLE_LABELS } from '@/types/database';
import logo from '@/assets/logo.png';

const navItems = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard },
  { to: '/documentos', label: 'Documentos', icon: FileText },
  { to: '/indicadores', label: 'Indicadores', icon: BarChart3 },
  { to: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  { to: '/bpa', label: 'BPA', icon: Network },
  { to: '/usuarios', label: 'Usuarios', icon: UsersIcon, adminOnly: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut, roles } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar-background text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header with logo */}
        <div className="flex h-14 items-center gap-2 px-5 pt-2">
          <img src={logo} alt="Procesos Mayoreo" className="h-10 w-auto" />
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Section label */}
        <div className="px-5 pb-2 pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-sidebar-primary">
            Gestión Procesos
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3">
          {navItems.map(item => {
            if (item.adminOnly && !roles.includes('admin')) return null;
            const isActive = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}>
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-5 py-4 space-y-3">
          <p className="text-xs text-sidebar-foreground truncate">
            {user?.email || 'usuario@correo.com'}
          </p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">
            {navItems.find(n => n.to === location.pathname)?.label || 'Sistema'}
          </h2>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}