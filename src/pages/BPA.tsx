import { useState, useEffect } from "react";
import { ChevronRight, Folder, FolderTree, Activity, FileText, CheckCircle2, Clock, XCircle, BarChart3, Presentation, Briefcase, FileSearch, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { bpaData, indicadoresData, documentosData, Silo, Grupo, Proceso, Actividad, Tarea } from "@/data/bpaData";

type Level = "silo" | "grupo" | "proceso" | "actividad" | "tarea";

interface NavState {
  level: Level;
  silo: string | null;
  grupo: string | null;
  proceso: string | null;
  actividad: string | null;
  tarea: string | null;
}

const defaultState: NavState = {
  level: "silo",
  silo: null,
  grupo: null,
  proceso: null,
  actividad: null,
  tarea: null,
};

export default function BPA() {
  const [navState, setNavState] = useState<NavState>(() => {
    try {
      const saved = localStorage.getItem("bpa_nav_state");
      return saved ? JSON.parse(saved) : defaultState;
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    localStorage.setItem("bpa_nav_state", JSON.stringify(navState));
  }, [navState]);

  const [expandedSilos, setExpandedSilos] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("bpa_expanded_silos");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem("bpa_expanded_silos", JSON.stringify(Array.from(expandedSilos)));
  }, [expandedSilos]);

  const toggleSiloExpanded = (silo: string) => {
    setExpandedSilos(prev => {
      const next = new Set(prev);
      if (next.has(silo)) next.delete(silo);
      else next.add(silo);
      return next;
    });
  };

  const selectSilo = (silo: string) => {
    setNavState({ level: "silo", silo, grupo: null, proceso: null, actividad: null, tarea: null });
  };

  const selectGrupo = (silo: string, grupo: string) => {
    setNavState({ level: "grupo", silo, grupo, proceso: null, actividad: null, tarea: null });
  };

  const selectProceso = (silo: string, grupo: string, proceso: string) => {
    setNavState({ level: "proceso", silo, grupo, proceso, actividad: null, tarea: null });
  };

  const selectActividad = (silo: string, grupo: string, proceso: string, actividad: string) => {
    setNavState({ level: "actividad", silo, grupo, proceso, actividad, tarea: null });
  };

  const selectTarea = (silo: string, grupo: string, proceso: string, actividad: string, tarea: string) => {
    setNavState({ level: "tarea", silo, grupo, proceso, actividad, tarea });
  };

  const currentSiloObj = navState.silo ? bpaData.silos.find((s) => s.nombre === navState.silo) : null;
  const currentGrupoObj = currentSiloObj && navState.grupo ? currentSiloObj.grupos.find((g) => g.nombre === navState.grupo) : null;
  const currentProcesoObj = currentGrupoObj && navState.proceso ? currentGrupoObj.procesos.find((p) => p.nombre === navState.proceso) : null;
  const currentActividadObj = currentProcesoObj && navState.actividad ? currentProcesoObj.actividades.find((a) => a.nombre === navState.actividad) : null;

  const currentIndicators = indicadoresData.filter(i => {
    if (navState.silo && i.silo !== navState.silo) return false;
    if (navState.grupo && i.grupo !== navState.grupo) return false;
    if (navState.proceso && i.proceso !== navState.proceso) return false;
    return true;
  });
  
  let currentDocuments = documentosData.filter(d => {
    if (navState.silo && d.silo !== navState.silo) return false;
    if (navState.grupo && d.grupo !== navState.grupo) return false;
    if (navState.proceso && d.proceso !== navState.proceso) return false;
    if (navState.actividad && d.actividad !== navState.actividad) return false;
    return true;
  });

  const allProcesosPorGrupo = {
    PL: [] as { silo: string, grupo: string, proceso: string }[],
    CV: [] as { silo: string, grupo: string, proceso: string }[],
    SOP: [] as { silo: string, grupo: string, proceso: string }[],
  };
  bpaData.silos.forEach(silo => {
    silo.grupos.forEach(grupo => {
      grupo.procesos.forEach(proceso => {
        if (grupo.nombre === "PL") allProcesosPorGrupo.PL.push({ silo: silo.nombre, grupo: grupo.nombre, proceso: proceso.nombre });
        if (grupo.nombre === "CV") allProcesosPorGrupo.CV.push({ silo: silo.nombre, grupo: grupo.nombre, proceso: proceso.nombre });
        if (grupo.nombre === "SOP") allProcesosPorGrupo.SOP.push({ silo: silo.nombre, grupo: grupo.nombre, proceso: proceso.nombre });
      });
    });
  });

  const renderBreadcrumbs = () => {
    return (
      <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-6 bg-muted/30 p-3 rounded-lg border">
        <button onClick={() => setNavState(defaultState)} className="hover:text-primary transition-colors flex items-center gap-1 font-medium">
          <FolderTree className="h-4 w-4" /> BPA
        </button>
        {navState.silo && (
          <>
            <ChevronRight className="h-4 w-4 shrink-0" />
            <button onClick={() => selectSilo(navState.silo!)} className={`hover:text-primary transition-colors truncate max-w-[80px] sm:max-w-[120px] ${navState.level === 'silo' ? 'text-primary font-bold' : ''}`}>
              {navState.silo}
            </button>
          </>
        )}
        {navState.grupo && (
          <>
            <ChevronRight className="h-4 w-4 shrink-0" />
            <button onClick={() => selectGrupo(navState.silo!, navState.grupo!)} className={`hover:text-primary transition-colors truncate max-w-[80px] sm:max-w-[120px] ${navState.level === 'grupo' ? 'text-primary font-bold' : ''}`}>
              {navState.grupo}
            </button>
          </>
        )}
        {navState.proceso && (
          <>
            <ChevronRight className="h-4 w-4 shrink-0" />
            <button onClick={() => selectProceso(navState.silo!, navState.grupo!, navState.proceso!)} className={`hover:text-primary transition-colors truncate max-w-[100px] sm:max-w-[150px] ${navState.level === 'proceso' ? 'text-primary font-bold' : ''}`}>
              {navState.proceso}
            </button>
          </>
        )}
        {navState.actividad && (
          <>
            <ChevronRight className="h-4 w-4 shrink-0" />
            <button onClick={() => selectActividad(navState.silo!, navState.grupo!, navState.proceso!, navState.actividad!)} className={`hover:text-primary transition-colors truncate max-w-[100px] sm:max-w-[150px] ${navState.level === 'actividad' ? 'text-primary font-bold' : ''}`}>
              {navState.actividad}
            </button>
          </>
        )}
        {navState.tarea && (
          <>
            <ChevronRight className="h-4 w-4 shrink-0" />
            <span className="text-primary font-bold truncate max-w-[100px] sm:max-w-[150px]">{navState.tarea}</span>
          </>
        )}
      </nav>
    );
  };

  const getStatusColor = (estatus: string) => {
    switch (estatus) {
      case 'Aprobado': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
      case 'Desactualizado': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300';
      case 'En Construcción': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
      case 'Por Aprobar': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderSidebar = () => {
    return (
      <Card className="h-full border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide text-primary">
              <FolderTree className="h-4 w-4" />
              Estructura BPA
            </CardTitle>
            
            <Dialog>
              <DialogTrigger asChild>
                <button className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors border border-transparent hover:border-primary/20 bg-background/50" title="Ver imagen del mapa de procesos">
                  <Eye className="h-4 w-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] lg:max-w-6xl w-full max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Mapa de Procesos (BPA)</DialogTitle>
                </DialogHeader>
                <div className="mt-4 border rounded-xl overflow-hidden bg-muted/20 p-2 flex items-center justify-center min-h-[50vh]">
                  <img 
                    src="/mapa-bpa.png.jpeg" 
                    alt="Mapa BPA" 
                    className="max-w-full h-auto object-contain rounded-lg shadow-sm" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                      target.nextElementSibling?.classList.add('flex');
                    }} 
                  />
                  <div className="hidden flex-col items-center justify-center text-center text-muted-foreground p-12 bg-muted/10 rounded-lg w-full h-full min-h-[400px] border border-dashed">
                    <Eye className="h-12 w-12 opacity-20 mb-4" />
                    <p className="mb-3 font-medium text-lg">La imagen no se encuentra en el sistema</p>
                    <p className="text-sm max-w-md">
                      Para que la imagen se muestre aquí, por favor guarda la imagen que compartiste en el chat con el nombre:
                      <br/>
                      <code className="bg-primary/10 text-primary px-2 py-1 rounded mt-3 inline-block font-mono font-bold text-base shadow-sm">mapa-bpa.png.jpeg</code>
                      <br/><br/>
                      Y colócala dentro de la carpeta <strong className="text-foreground">public</strong> de tu proyecto.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="p-3 space-y-1">
            {bpaData.silos.map(silo => (
              <div key={silo.nombre} className="space-y-1">
                <button
                  onClick={() => selectSilo(silo.nombre)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-between group ${
                    navState.silo === silo.nombre ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 opacity-70" />
                    {silo.nombre}
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${navState.silo === silo.nombre ? 'rotate-90' : 'opacity-0 group-hover:opacity-50'}`} />
                </button>
                
                {navState.silo === silo.nombre && (
                  <div className="ml-4 pl-2 border-l border-border/50 space-y-1 mt-1 pb-2">
                    {silo.grupos.map(grupo => (
                      <div key={grupo.nombre} className="space-y-1">
                        <button
                          onClick={() => selectGrupo(silo.nombre, grupo.nombre)}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-between group ${
                            navState.grupo === grupo.nombre ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          Grupo: {grupo.nombre}
                          <ChevronRight className={`h-3 w-3 transition-transform ${navState.grupo === grupo.nombre ? 'rotate-90' : 'opacity-0 group-hover:opacity-50'}`} />
                        </button>

                        {navState.grupo === grupo.nombre && (
                          <div className="ml-2 pl-2 border-l border-border/50 space-y-0.5 mt-0.5 pb-1">
                            {grupo.procesos.map(proceso => (
                              <button
                                key={proceso.nombre}
                                onClick={() => selectProceso(silo.nombre, grupo.nombre, proceso.nombre)}
                                className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors flex flex-col gap-0.5 group ${
                                  navState.proceso === proceso.nombre ? 'bg-primary/5 text-primary font-medium' : 'hover:bg-muted/50 text-muted-foreground/80'
                                }`}
                              >
                                <span className="truncate w-full block">{proceso.nombre}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    );
  };

  const renderCenterPanel = () => {
    if (navState.level === "silo" && currentSiloObj) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              Silo: {currentSiloObj.nombre}
            </h2>
            <p className="text-muted-foreground mt-1">Seleccione un Grupo para ver sus procesos.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentSiloObj.grupos.map((grupo, idx) => (
              <Card 
                key={grupo.nombre} 
                className="hover:border-primary/50 cursor-pointer transition-all hover:shadow-md group"
                onClick={() => selectGrupo(currentSiloObj.nombre, grupo.nombre)}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="font-mono text-xs bg-muted/50">Grupo {grupo.nombre}</Badge>
                    <Folder className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="text-base mt-2 line-clamp-2">Grupo de Procesos {grupo.nombre}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {grupo.procesos.length} Procesos
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (navState.level === "grupo" && currentGrupoObj) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Folder className="h-6 w-6 text-primary" />
              Grupo: {currentGrupoObj.nombre}
            </h2>
            <p className="text-muted-foreground mt-1">Procesos disponibles en este grupo.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentGrupoObj.procesos.map((proceso, idx) => (
              <Card 
                key={proceso.nombre} 
                className="hover:border-primary/50 cursor-pointer transition-all hover:shadow-md group"
                onClick={() => selectProceso(navState.silo!, currentGrupoObj.nombre, proceso.nombre)}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">{proceso.nombre}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {proceso.actividades.length} Actividades
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (navState.level === "proceso" && currentProcesoObj) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Proceso: {currentProcesoObj.nombre}
            </h2>
            <p className="text-muted-foreground mt-1">Actividades de este proceso.</p>
          </div>

          <div className="space-y-3">
            {currentProcesoObj.actividades.map((act, idx) => (
              <Card 
                key={act.nombre} 
                className="hover:border-primary/50 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md group"
                onClick={() => selectActividad(navState.silo!, navState.grupo!, currentProcesoObj.nombre, act.nombre)}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium group-hover:text-primary transition-colors">{act.nombre}</h4>
                      <p className="text-xs text-muted-foreground">{act.tareas.length} Tareas identificadas</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (navState.level === "actividad" && currentActividadObj) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Actividad: {currentActividadObj.nombre}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">Tareas correspondientes a esta actividad.</p>
          </div>

          <div className="space-y-2 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {currentActividadObj.tareas.map((tarea, idx) => (
              <div key={tarea.nombre} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-background bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <span className="text-[10px] font-bold">{idx + 1}</span>
                </div>
                <Card 
                  className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] hover:border-primary/50 cursor-pointer transition-all shadow-sm group-hover:shadow-md"
                  onClick={() => selectTarea(navState.silo!, navState.grupo!, navState.proceso!, currentActividadObj.nombre, tarea.nombre)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="font-medium text-sm group-hover:text-primary transition-colors">{tarea.nombre}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (navState.level === "tarea") {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center text-center h-[50vh] bg-muted/10 rounded-xl border border-dashed">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">{navState.tarea}</h2>
          <p className="text-muted-foreground max-w-md">
            Esta es una tarea específica de la actividad {navState.actividad}. 
            Puede ver los documentos relacionados en el panel de la derecha.
          </p>
        </div>
      );
    }

    // Default global view
    return (
      <div className="flex flex-col space-y-8 animate-in fade-in duration-700 p-2 pb-10">
        <div className="text-center mb-2">
          <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center text-primary mx-auto mb-3">
            <FolderTree className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Mapa de Procesos</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Haga clic en cualquier proceso para ver su detalle de forma interactiva.
          </p>
        </div>

        {/* Planificación */}
        {allProcesosPorGrupo.PL.length > 0 && (
          <div className="space-y-4 bg-emerald-50/50 dark:bg-emerald-950/10 p-5 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
            <div className="flex items-center justify-center gap-2 border-b border-emerald-200 dark:border-emerald-800/50 pb-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              <h3 className="font-bold text-sm tracking-widest text-emerald-700 dark:text-emerald-400 uppercase">PL - PLANIFICACIÓN</h3>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {allProcesosPorGrupo.PL.map(m => (
                <button 
                  key={m.proceso}
                  onClick={() => selectProceso(m.silo, m.grupo, m.proceso)}
                  className="w-40 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-800/60 text-emerald-900 dark:text-emerald-100 p-3 rounded-lg border border-emerald-300 dark:border-emerald-700 text-xs font-medium text-center transition-all hover:-translate-y-1 hover:shadow-md shadow-sm flex flex-col items-center justify-center min-h-[80px]"
                >
                  <div className="font-bold mb-1 opacity-70 bg-emerald-200/50 dark:bg-emerald-950/50 px-2 py-0.5 rounded text-[10px] truncate max-w-full">Silo: {m.silo}</div>
                  <div className="leading-tight">{m.proceso}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cadena de Valor */}
        {allProcesosPorGrupo.CV.length > 0 && (
          <div className="space-y-4 bg-blue-50/50 dark:bg-blue-950/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/50 relative">
            <div className="flex items-center justify-center gap-2 border-b border-blue-200 dark:border-blue-800/50 pb-3">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              <h3 className="font-bold text-sm tracking-widest text-blue-700 dark:text-blue-400 uppercase">CV - CADENA DE VALOR</h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {allProcesosPorGrupo.CV.map((m) => (
                <button 
                  key={m.proceso}
                  onClick={() => selectProceso(m.silo, m.grupo, m.proceso)}
                  className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 text-blue-900 dark:text-blue-100 p-3 rounded-lg border border-blue-300 dark:border-blue-700 text-xs font-medium text-center transition-all hover:-translate-y-1 hover:shadow-md shadow-sm flex flex-col items-center justify-center min-h-[80px] z-10"
                >
                  <div className="font-bold mb-1 opacity-70 bg-blue-200/50 dark:bg-blue-950/50 px-2 py-0.5 rounded text-[10px] truncate max-w-full">Silo: {m.silo}</div>
                  <div className="leading-tight">{m.proceso}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Soporte */}
        {allProcesosPorGrupo.SOP.length > 0 && (
          <div className="space-y-4 bg-amber-50/50 dark:bg-amber-950/10 p-5 rounded-xl border border-amber-100 dark:border-amber-900/50">
            <div className="flex items-center justify-center gap-2 border-b border-amber-200 dark:border-amber-800/50 pb-3">
              <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
              <h3 className="font-bold text-sm tracking-widest text-amber-700 dark:text-amber-400 uppercase">SOP - SOPORTE</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {allProcesosPorGrupo.SOP.map(m => (
                <button 
                  key={m.proceso}
                  onClick={() => selectProceso(m.silo, m.grupo, m.proceso)}
                  className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-800/60 text-amber-900 dark:text-amber-100 p-3 rounded-lg border border-amber-300 dark:border-amber-700 text-xs font-medium text-center transition-all hover:-translate-y-1 hover:shadow-md shadow-sm flex flex-col items-center justify-center min-h-[80px]"
                >
                  <div className="font-bold mb-1 opacity-70 bg-amber-200/50 dark:bg-amber-950/50 px-2 py-0.5 rounded text-[10px] truncate max-w-full">Silo: {m.silo}</div>
                  <div className="leading-tight">{m.proceso}</div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderRightPanel = () => {
    // Analytics for indicators
    const aprobados = currentIndicators.filter(i => i.estatus === 'Aprobado').length;
    const total = currentIndicators.length;
    const porcentaje = total > 0 ? Math.round((aprobados / total) * 100) : 0;

    return (
      <div className="h-full flex flex-col gap-4">
        {/* Indicators Panel */}
        <Card className="flex-1 border-0 shadow-none sm:border sm:shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b bg-muted/10 shrink-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-wide">
              <BarChart3 className="h-4 w-4" />
              Indicadores {navState.silo && `- ${navState.silo}`}
            </CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-hidden relative">
            {!navState.silo && !navState.grupo && !navState.proceso ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <FileSearch className="h-10 w-10 opacity-20 mb-3" />
                <p className="text-sm">Seleccione un elemento para ver sus indicadores</p>
              </div>
            ) : currentIndicators.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <XCircle className="h-10 w-10 opacity-20 mb-3" />
                <p className="text-sm">No hay indicadores registrados para esta área</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-6">
                  <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border">
                    <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
                      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                        <circle className="text-muted stroke-current" strokeWidth="10" cx="50" cy="50" r="40" fill="transparent"></circle>
                        <circle className="text-emerald-500 stroke-current drop-shadow-sm transition-all duration-1000 ease-in-out" strokeWidth="10" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray={`${porcentaje * 2.513} 251.3`}></circle>
                      </svg>
                      <span className="absolute text-sm font-bold">{porcentaje}%</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Salud de Indicadores</p>
                      <p className="text-sm font-bold mt-1">{aprobados} de {total} Aprobados</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentIndicators.map((ind, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h4 className="font-semibold text-sm leading-tight">{ind.titulo}</h4>
                          <Badge variant="outline" className="text-[10px] shrink-0 font-mono">v{ind.version}</Badge>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${getStatusColor(ind.estatus)}`}>
                          {ind.estatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
        </Card>

        {/* Documents Panel */}
        <Card className="flex-1 border-0 shadow-none sm:border sm:shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b bg-muted/10 shrink-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-wide">
              <FileText className="h-4 w-4" />
              Documentos Relacionados
            </CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-hidden relative">
            {!navState.silo && !navState.grupo && !navState.proceso && !navState.actividad ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                 <FileSearch className="h-10 w-10 opacity-20 mb-3" />
                 <p className="text-sm">Seleccione un elemento para ver documentos</p>
               </div>
            ) : currentDocuments.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <XCircle className="h-10 w-10 opacity-20 mb-3" />
                <p className="text-sm">No hay documentos en este nivel</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {currentDocuments.map((doc, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-card shadow-sm flex items-start gap-3 hover:border-primary/50 transition-colors group cursor-pointer">
                      <div className="mt-0.5">
                        <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-medium text-sm truncate" title={doc.documento}>{doc.documento}</h4>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase font-semibold">{doc.tipo}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-sm uppercase font-semibold tracking-wider ${getStatusColor(doc.estatus)}`}>
                            {doc.estatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Sistema Integrado de Gestión (BPA)</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Navegación interactiva de 5 niveles por Silo, Grupo, Proceso, Actividad y Tareas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <div className="md:col-span-3 h-full">
          {renderSidebar()}
        </div>

        {/* Center Main Panel */}
        <div className="md:col-span-6 h-full flex flex-col overflow-hidden">
          <Card className="flex-1 border-0 shadow-none sm:border sm:shadow-sm overflow-hidden flex flex-col bg-background/50 backdrop-blur-sm">
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
              {renderBreadcrumbs()}
              {renderCenterPanel()}
            </div>
          </Card>
        </div>

        {/* Right Info Panel */}
        <div className="md:col-span-3 h-full">
          {renderRightPanel()}
        </div>
      </div>
    </div>
  );
}
