import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Truck, DollarSign, Users, BarChart3, Megaphone, Monitor } from 'lucide-react';
import type { SiloType } from '@/types/database';

const SILO_CONFIG: Record<SiloType, { icon: typeof ShoppingCart; description: string }> = {
  compras: { icon: ShoppingCart, description: 'Gestione documentos de adquisiciones, órdenes de compra y proveedores.' },
  logistica: { icon: Truck, description: 'Documentación de transporte, almacén e inventarios.' },
  ventas: { icon: DollarSign, description: 'Procesos comerciales, cotizaciones y facturación.' },
  personal: { icon: Users, description: 'Gestión de personal, captación, desarrollo y estructura organizacional.' },
  control: { icon: BarChart3, description: 'Control de crédito, cobranza y auditoría interna.' },
  mercadeo: { icon: Megaphone, description: 'Estrategias de marketing, campañas y análisis de mercado.' },
  sistemas: { icon: Monitor, description: 'Infraestructura tecnológica, soporte y desarrollo de sistemas.' },
};

interface SiloCardProps {
  silo: SiloType;
  siloLabel: string;
  docCount: number;
  onClick: () => void;
}

export default function SiloCard({ silo, siloLabel, docCount, onClick }: SiloCardProps) {
  const config = SILO_CONFIG[silo];
  const Icon = config.icon;

  return (
    <Card
      className="overflow-hidden border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{siloLabel}</h3>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{config.description}</p>
        {docCount > 0 && (
          <Badge variant="secondary" className="mt-3 text-xs">{docCount} documento{docCount !== 1 ? 's' : ''}</Badge>
        )}
      </div>
    </Card>
  );
}
