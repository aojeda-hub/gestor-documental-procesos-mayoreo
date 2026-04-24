import { useMemo } from 'react';
import { format, startOfYear, addMonths, eachMonthOfInterval, endOfYear, isWithinInterval, differenceInDays, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ProjectTask } from '@/types/database';

interface ModernGanttProps {
  tasks: ProjectTask[];
}

const MONTHS_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const PHASES = ['Alineación', 'Diseño', 'Construcción', 'Implementación', 'Adopción'];

export function ModernGantt({ tasks }: ModernGanttProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const yearStart = startOfYear(today);
  const yearEnd = endOfYear(today);

  // Group tasks by phase
  const groupedTasks = useMemo(() => {
    const groups: Record<string, ProjectTask[]> = {};
    PHASES.forEach(p => groups[p] = tasks.filter(t => t.phase === p && t.start_date && t.end_date));
    return groups;
  }, [tasks]);

  const totalDaysInYear = differenceInDays(yearEnd, yearStart) + 1;

  const getLeftOffset = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = differenceInDays(date, yearStart);
    return (diff / totalDaysInYear) * 100;
  };

  const getWidth = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diff = differenceInDays(end, start) + 1;
    return (diff / totalDaysInYear) * 100;
  };

  const getTaskDuration = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    return differenceInDays(end, start) + 1;
  };

  const todayOffset = (differenceInDays(today, yearStart) / totalDaysInYear) * 100;

  return (
    <div className="w-full overflow-x-auto bg-white rounded-xl shadow-lg border p-6 font-sans">
      <div className="min-w-[1000px]">
        {/* Header: Months */}
        <div className="flex mb-4">
          <div className="w-[200px] h-10 flex-shrink-0"></div> {/* Sidebar spacer */}
          <div className="w-[80px] h-10 flex-shrink-0"></div> {/* Days spacer */}
          <div className="flex-1 flex bg-[#001a72] rounded-lg overflow-hidden h-10 items-center">
            {MONTHS_SHORT.map((m, i) => (
              <div key={m} className={`flex-1 text-center text-white text-xs font-bold ${i < 11 ? 'border-r border-white/20' : ''}`}>
                {m}
              </div>
            ))}
          </div>
        </div>

        {/* Gantt Body */}
        <div className="relative border-l border-r border-b rounded-b-lg bg-slate-50/30">
          {/* Today Line */}
          <div 
            className="absolute top-0 bottom-0 w-[1.5px] bg-[#001a72] z-20 flex flex-col items-center"
            style={{ left: `calc(280px + (100% - 280px) * ${todayOffset / 100})` }}
          >
            <div className="h-full w-full border-l border-dashed border-[#001a72]"></div>
            <div className="absolute -bottom-8 whitespace-nowrap text-[#001a72] font-bold text-sm flex flex-col items-center">
              <span>↓</span>
              <span>Hoy</span>
            </div>
          </div>

          {PHASES.map(phase => {
            const phaseTasks = groupedTasks[phase] || [];
            if (phaseTasks.length === 0) return null;

            // Calculate overall phase dates for the parent bar
            const phaseStart = new Date(Math.min(...phaseTasks.map(t => new Date(t.start_date!).getTime())));
            const phaseEnd = new Date(Math.max(...phaseTasks.map(t => new Date(t.end_date!).getTime())));
            const phaseDuration = differenceInDays(phaseEnd, phaseStart) + 1;

            return (
              <div key={phase} className="contents">
                {/* Phase Row */}
                <div className="flex border-t items-center min-h-[45px] hover:bg-slate-100/50 transition-colors">
                  <div className="w-[200px] flex-shrink-0 pr-4">
                    <div className="bg-[#0047cc] text-white text-[11px] font-bold py-2 px-3 rounded-md shadow-sm truncate">
                      {phase}
                    </div>
                  </div>
                  <div className="w-[80px] text-[10px] font-bold text-slate-500 pl-2">
                    {phaseDuration} Días
                  </div>
                  <div className="flex-1 h-full relative py-3">
                    <div 
                      className="absolute h-5 rounded-sm overflow-hidden flex"
                      style={{ 
                        left: `${getLeftOffset(phaseStart.toISOString())}%`, 
                        width: `${getWidth(phaseStart.toISOString(), phaseEnd.toISOString())}%` 
                      }}
                    >
                      {/* Color logic for phase bar based on today */}
                      <div className="h-full bg-green-500" style={{ width: `${Math.min(100, Math.max(0, (differenceInDays(today, phaseStart) / phaseDuration) * 100))}%` }}></div>
                      <div className="h-full bg-orange-500 flex-1"></div>
                    </div>
                  </div>
                </div>

                {/* Task Rows */}
                {phaseTasks.map(task => {
                  const tStart = new Date(task.start_date!);
                  const tEnd = new Date(task.end_date!);
                  const tDuration = getTaskDuration(task.start_date!, task.end_date!);
                  
                  let barColor = 'bg-red-500'; // No iniciado
                  if (task.status === 'Completada') barColor = 'bg-green-500';
                  else if (task.status === 'En curso') {
                    // Split bar logic like in Activity 1? 
                    // Actually let's follow the legend: Green=Completo, Orange=Incompleto, Red=No iniciado
                    barColor = today > tEnd ? 'bg-orange-500' : 'bg-green-500'; 
                  }

                  return (
                    <div key={task.id} className="flex items-center min-h-[40px] hover:bg-slate-100/30 transition-colors">
                      <div className="w-[200px] flex-shrink-0 pr-4 pl-4">
                        <div className="bg-[#5c85ff] text-white text-[10px] font-medium py-1.5 px-3 rounded-md truncate">
                          {task.name}
                        </div>
                      </div>
                      <div className="w-[80px] text-[10px] font-medium text-slate-400 pl-2">
                        {tDuration} Días
                      </div>
                      <div className="flex-1 h-full relative py-2.5">
                        <div 
                          className={`absolute h-4 rounded-sm ${task.status === 'Pendiente' ? 'bg-red-500' : (today > tEnd ? 'bg-orange-500' : 'bg-green-500')}`}
                          style={{ 
                            left: `${getLeftOffset(task.start_date!)}%`, 
                            width: `${getWidth(task.start_date!, task.end_date!)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-12 flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
            <span className="text-xs text-slate-600 font-medium">Completo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded-sm"></div>
            <span className="text-xs text-slate-600 font-medium">Incompleto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
            <span className="text-xs text-slate-600 font-medium">No iniciado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
