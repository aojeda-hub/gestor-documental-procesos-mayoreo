import { ArrowRight } from "lucide-react";

export default function BPA() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10 animate-in fade-in zoom-in-95 duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Arquitectura de Procesos de Negocio (BPA)</h1>
        <p className="text-muted-foreground mt-2">
          Mapa general de la cadena de valor y procesos de soporte.
        </p>
      </div>

      {/* PL - PLANIFICACION */}
      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-bold text-muted-foreground tracking-widest uppercase shrink-0">
            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 inline-flex items-center justify-center mr-2">PL</span> 
            Planificación
          </h2>
          <div className="h-px bg-border flex-1"></div>
        </div>
        <div className="flex flex-wrap gap-4">
          <ProcessNode code="PL P01" name="Formulación del plan estratégico" color="green" />
          <ProcessNode code="PL P02" name="Formulación del presupuesto operativo" color="green" />
          <ProcessNode code="PL P03" name="Monitoreo" color="green" />
        </div>
      </section>

      {/* CV - CADENA DE VALOR */}
      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-bold text-muted-foreground tracking-widest uppercase shrink-0">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 inline-flex items-center justify-center mr-2">CV</span> 
            Cadena de Valor
          </h2>
          <div className="h-px bg-border flex-1"></div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* DISPONIBLE */}
          <div className="border border-dashed border-blue-300 dark:border-blue-800 rounded-xl p-4 bg-blue-50/50 dark:bg-blue-950/20 relative shadow-inner flex flex-col justify-center">
            <h3 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-4 tracking-[0.2em] uppercase text-center">Disponible</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-1 justify-between">
                <ProcessNode code="CVP01" name="Definición de Surtido" color="blue" />
                <ArrowRight className="w-3 h-3 text-blue-300 dark:text-blue-700 shrink-0" />
                <ProcessNode code="CVP02" name="Estudio de Factibilidad" color="blue" />
                <ArrowRight className="w-3 h-3 text-blue-300 dark:text-blue-700 shrink-0" />
                <ProcessNode code="CVP03" name="Negociación con Proveedores" color="blue" />
              </div>
              <div className="flex items-center gap-1 justify-between">
                 <ProcessNode code="CVP05" name="Seguimiento Proveedores" color="blue" />
                 <ArrowRight className="w-3 h-3 text-blue-300 dark:text-blue-700 shrink-0" />
                 <ProcessNode code="CVP04" name="Compra" color="blue" />
                 <ArrowRight className="w-3 h-3 text-blue-300 dark:text-blue-700 shrink-0" />
                 <ProcessNode code="CVP06" name="Recepción y almacenaje" color="blue" />
              </div>
            </div>
          </div>

          {/* VENTA */}
          <div className="border border-dashed border-purple-300 dark:border-purple-800 rounded-xl p-4 bg-purple-50/50 dark:bg-purple-950/20 relative shadow-inner flex flex-col">
            <h3 className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mb-4 tracking-[0.2em] uppercase text-center">Venta</h3>
            <div className="flex flex-col gap-4 h-full justify-center">
              <div className="flex justify-center">
                <ProcessNode code="CVP07" name="Oferta del Producto" color="blue" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2 justify-center">
                   <ProcessNode code="CVP08" name="Gestión clientes" color="blue" />
                   <ProcessNode code="CVP09" name="Evaluación zona" color="blue" />
                   <ProcessNode code="CVP10" name="Administración" color="blue" />
                </div>
                <div className="flex flex-col gap-2 justify-center">
                   <ProcessNode code="CVP11" name="Negociación" color="blue" />
                   <ProcessNode code="CVP12" name="Crédito/Cobranza" color="blue" />
                </div>
              </div>
            </div>
          </div>

          {/* ENTREGA */}
          <div className="border border-dashed border-orange-300 dark:border-orange-800 rounded-xl p-4 bg-orange-50/50 dark:bg-orange-950/20 relative shadow-inner flex flex-col justify-center">
            <h3 className="text-[10px] font-bold text-orange-600 dark:text-orange-400 mb-4 tracking-[0.2em] uppercase text-center">Entrega</h3>
            <div className="flex flex-col gap-4 h-full justify-center">
               <div className="flex justify-center">
                 <ProcessNode code="CVP13" name="Atención al cliente" color="blue" />
               </div>
               <div className="flex items-center gap-1 justify-center">
                 <ProcessNode code="CVP14" name="Alisto y Facturación" color="blue" />
                 <ArrowRight className="w-3 h-3 text-orange-300 dark:text-orange-700 shrink-0" />
                 <ProcessNode code="CVP15" name="Despacho y transporte" color="blue" />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* SO - SOPORTE */}
      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-bold text-muted-foreground tracking-widest uppercase shrink-0">
            <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 inline-flex items-center justify-center mr-2">SO</span> 
            Soporte
          </h2>
          <div className="h-px bg-border flex-1"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <ProcessNode code="SOP01" name="Ejecución y control del plan financiero" color="yellow" />
          <ProcessNode code="SOP02" name="Registro y control de operaciones contables" color="yellow" />
          <ProcessNode code="SOP03" name="Control de inventario" color="yellow" />
          <ProcessNode code="SOP04" name="Comercio exterior" color="yellow" />
          <ProcessNode code="SOP05" name="Logística 3PL" color="yellow" />
          <ProcessNode code="SOP06" name="Personal" color="yellow" />
          <ProcessNode code="SOP07" name="Seguridad y salud laboral" color="yellow" />
          <ProcessNode code="SOP08" name="Procesos y sistemas" color="yellow" />
          <ProcessNode code="SOP09" name="Legal" color="yellow" />
          <ProcessNode code="SOP10" name="Gestión de comunicación" color="yellow" />
          <ProcessNode code="SOP11" name="Gestión de Publicidad" color="yellow" />
        </div>
      </section>
    </div>
  );
}

function ProcessNode({ code, name, color }: { code: string, name: string, color: 'green' | 'blue' | 'yellow' }) {
  const colorClasses = {
    green: "bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-100 shadow-emerald-900/5",
    blue: "bg-[#abcaf1] border-[#8cb6ea] text-blue-950 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-100 shadow-blue-900/5",
    yellow: "bg-[#ffe082] border-[#ffd54f] text-amber-950 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-100 shadow-amber-900/5",
  };

  return (
    <div className={`p-2.5 min-h-[70px] rounded-lg border shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md hover:-translate-y-0.5 cursor-default flex-1 min-w-[90px] max-w-[150px] relative overflow-hidden group ${colorClasses[color]}`}>
      <div className="absolute inset-0 bg-white/20 dark:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="text-[8px] font-black opacity-60 mb-1 tracking-wider uppercase bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full">{code}</span>
      <span className="text-[10px] font-bold leading-tight line-clamp-2">{name}</span>
    </div>
  );
}
