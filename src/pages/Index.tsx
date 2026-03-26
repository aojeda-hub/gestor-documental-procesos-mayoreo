import StatsCards from '@/components/StatsCards';
import ActivityChart from '@/components/ActivityChart';
import ProcessTable from '@/components/ProcessTable';

export default function Index() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Procesos</h1>
          <p className="text-sm text-muted-foreground">Monitoreo en tiempo real</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Sistema operativo
        </div>
      </div>
      <StatsCards />
      <ActivityChart />
      <ProcessTable />
    </div>
  );
}
