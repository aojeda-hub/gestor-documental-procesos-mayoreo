import { useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';
import { format } from 'date-fns';
import type { ProjectTask } from '@/types/database';

interface ProjectGanttProps {
  tasks: ProjectTask[];
  onDateChange: (task: ProjectTask, start: Date, end: Date) => void;
}

export function ProjectGantt({ tasks, onDateChange }: ProjectGanttProps) {
  const ganttRef = useRef<HTMLDivElement>(null);
  const ganttInstance = useRef<any>(null);

  useEffect(() => {
    if (!ganttRef.current || tasks.length === 0) return;

    // Filter tasks that have dates
    const validTasks = tasks.filter(t => t.start_date && t.end_date);
    if (validTasks.length === 0) return;

    const frappeTasks = validTasks.map(t => {
      // Calculate planned progress based on dates
      let planned_progress = 0;
      const start = new Date(t.start_date!);
      const end = new Date(t.end_date!);
      const now = new Date();
      
      if (now >= end) {
        planned_progress = 100;
      } else if (now > start) {
        const totalDuration = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        planned_progress = (elapsed / totalDuration) * 100;
      }

      const deviation = t.actual_progress - planned_progress;
      
      let customClass = 'gantt-bar-blue'; // Default: En curso
      if (t.status === 'Completada') {
        customClass = 'gantt-bar-green';
      } else if (deviation < -10) {
        customClass = 'gantt-bar-red';
      } else if (deviation < 0) {
        customClass = 'gantt-bar-orange';
      }

      return {
        id: t.id,
        name: `${t.name} (${t.phase})`,
        start: t.start_date!,
        end: t.end_date!,
        progress: t.actual_progress,
        custom_class: customClass,
        dependencies: '' 
      };
    });

    if (ganttInstance.current) {
      ganttInstance.current.refresh(frappeTasks);
    } else {
      ganttInstance.current = new Gantt(ganttRef.current, frappeTasks, {
        header_height: 50,
        column_width: 30,
        step: 24,
        view_modes: ['Day', 'Week', 'Month'],
        bar_height: 30,
        bar_corner_radius: 3,
        arrow_curve: 5,
        padding: 18,
        view_mode: 'Day',
        date_format: 'YYYY-MM-DD',
        language: 'es',
        on_date_change: (task: any, start: Date, end: Date) => {
          const originalTask = tasks.find(t => t.id === task.id);
          if (originalTask) {
            onDateChange(originalTask, start, end);
          }
        }
      });
    }
  }, [tasks]);

  return (
    <div className="gantt-container border rounded-lg overflow-hidden bg-white p-4">
      <style>{`
        /* Base Frappe Gantt Styles */
        :root{--g-arrow-color: #1f2937;--g-bar-color: #fff;--g-bar-border: #fff;--g-tick-color-thick: #ededed;--g-tick-color: #f3f3f3;--g-actions-background: #f3f3f3;--g-border-color: #ebeff2;--g-text-muted: #7c7c7c;--g-text-light: #fff;--g-text-dark: #171717;--g-progress-color: #dbdbdb;--g-handle-color: #37352f;--g-weekend-label-color: #dcdce4;--g-expected-progress: #c4c4e9;--g-header-background: #fff;--g-row-color: #fdfdfd;--g-row-border-color: #c7c7c7;--g-today-highlight: #37352f;--g-popup-actions: #ebeff2;--g-weekend-highlight-color: #f7f7f7}
        .gantt-container{line-height:14.5px;position:relative;overflow:auto;font-size:12px;height:var(--gv-grid-height);width:100%;border-radius:8px;isolation:isolate}
        .gantt-container .grid-header{height:calc(var(--gv-lower-header-height) + var(--gv-upper-header-height) + 10px);background-color:var(--g-header-background);position:sticky;top:0;left:0;border-bottom:1px solid var(--g-row-border-color);z-index:1000}
        .gantt .grid-row{fill:var(--g-row-color)}
        .gantt .row-line{stroke:var(--g-border-color)}
        .gantt .tick{stroke:var(--g-tick-color);stroke-width:.4}
        .gantt .arrow{fill:none;stroke:var(--g-arrow-color);stroke-width:1.5}
        .gantt .bar-wrapper .bar{fill:var(--g-bar-color);stroke:var(--g-bar-border);stroke-width:0;outline:1px solid var(--g-row-border-color);border-radius:3px}
        .gantt .bar-progress{fill:var(--g-progress-color);border-radius:4px}
        .gantt .bar-label{fill:var(--g-text-dark);dominant-baseline:central;font-family:Helvetica;font-size:13px;font-weight:400}
        .gantt .handle{fill:var(--g-handle-color);opacity:0}
        .gantt .bar-wrapper:hover .handle{opacity:1}

        /* Custom Task Coloring */
        .gantt-bar-blue .bar { fill: #3b82f6 !important; stroke: #2563eb !important; }
        .gantt-bar-green .bar { fill: #10b981 !important; stroke: #059669 !important; }
        .gantt-bar-red .bar { fill: #ef4444 !important; stroke: #dc2626 !important; }
        .gantt-bar-orange .bar { fill: #f59e0b !important; stroke: #d97706 !important; }
        
        .gantt .bar-progress { fill: rgba(255, 255, 255, 0.3) !important; }
        .gantt .bar-label { fill: #fff !important; font-weight: 500; font-size: 11px; }
        .gantt .handle { fill: #fff; }
      `}</style>
      <div ref={ganttRef} />
    </div>
  );
}
