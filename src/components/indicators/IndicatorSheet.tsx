import React from 'react';
import { Indicator } from '@/types/database';
import { SILO_LABELS, INDICATOR_TYPE_LABELS, FREQUENCY_LABELS } from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface IndicatorSheetProps {
  indicator: Indicator;
}

export const IndicatorSheet: React.FC<IndicatorSheetProps> = ({ indicator }) => {
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="w-full border-2 border-slate-800 text-[13px] font-sans leading-tight bg-white overflow-hidden shadow-lg print:shadow-none print:border-slate-500">
      {/* Header Grid */}
      <div className="grid grid-cols-12 border-b-2 border-slate-800">
        <div className="col-span-4 border-r-2 border-slate-800 p-2">
          <div className="font-bold text-slate-700 mb-1">NOMBRE:</div>
          <div className="text-sm font-semibold">{indicator.name}</div>
        </div>
        <div className="col-span-5 border-r-2 border-slate-800 flex flex-col">
          <div className="bg-[#1e6075] text-white px-2 py-0.5 font-bold border-b-2 border-slate-800">PROCESOS RELACIONADOS</div>
          <div className="p-2 flex-grow flex items-center justify-center text-center font-bold">
            {indicator.related_process || 'N/A'}
          </div>
        </div>
        <div className="col-span-3 flex flex-col">
          <div className="bg-[#1e6075] text-white px-2 py-0.5 border-b-2 border-slate-800">ACTUALIZACIÓN</div>
          <div className="p-2 flex-grow text-center font-bold">
            {formatDate(indicator.updated_at)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 border-b-2 border-slate-800">
        <div className="col-span-4 border-r-2 border-slate-800 p-2">
          <div className="font-bold text-slate-700 mb-1">RESPONSABLE:</div>
          <div className="text-slate-900">{indicator.responsible || 'No asignado'}</div>
        </div>
        <div className="col-span-5 border-r-2 border-slate-800 flex flex-col">
          <div className="bg-[#1e6075] text-white px-2 py-0.5 border-b-2 border-slate-800">TIPO DE INDICADOR:</div>
          <div className="p-2 text-[#1e6075] font-bold">
            {INDICATOR_TYPE_LABELS[indicator.indicator_type]}
          </div>
        </div>
        <div className="col-span-3 flex flex-col">
          <div className="bg-[#1e6075] text-white px-2 py-0.5 border-b-2 border-slate-800">ELABORADO POR</div>
          <div className="p-2 flex-grow text-center font-bold text-slate-700">
            {indicator.responsible ? indicator.responsible.split('/')[0] : 'Sistema'}
          </div>
        </div>
      </div>

      {/* Definition, Formula, Unit */}
      <div className="grid grid-cols-12 border-b-2 border-slate-800 bg-[#f8f9fa]">
        <div className="col-span-5 bg-[#1e6075] text-white px-2 py-1 font-bold border-r-2 border-slate-800">DEFINICIÓN DEL INDICADOR</div>
        <div className="col-span-5 bg-[#1e6075] text-white px-2 py-1 font-bold border-r-2 border-slate-800">FÓRMULA DE CÁLCULO</div>
        <div className="col-span-2 bg-[#1e6075] text-white px-2 py-1 font-bold">UNIDAD</div>
      </div>
      <div className="grid grid-cols-12 border-b-2 border-slate-800 min-h-[60px]">
        <div className="col-span-5 border-r-2 border-slate-800 p-2 italic text-slate-700">
          {indicator.definition}
        </div>
        <div className="col-span-5 border-r-2 border-slate-800 p-2 flex items-center">
          <span className="font-mono text-xs">{indicator.formula}</span>
        </div>
        <div className="col-span-2 p-2 flex items-center justify-center font-semibold">
          {indicator.unit}
        </div>
      </div>

      {/* Information Source & Periodicity */}
      <div className="grid grid-cols-12 border-b-2 border-slate-800">
        <div className="col-span-6 bg-[#1e6075] text-white px-2 py-1 font-bold border-r-2 border-slate-800">FUENTE DE INFORMACIÓN</div>
        <div className="col-span-6 bg-[#1e6075] text-white px-2 py-1 font-bold">PERIODICIDAD DEL CÁLCULO</div>
      </div>
      <div className="grid grid-cols-12 border-b-2 border-slate-800 min-h-[50px]">
        <div className="col-span-6 border-r-2 border-slate-800 p-2">
          {indicator.data_source || 'No especificada'}
        </div>
        <div className="col-span-6 p-2">
          {FREQUENCY_LABELS[indicator.frequency]}
        </div>
      </div>

      {/* Presentation & Distribution */}
      <div className="grid grid-cols-12 border-b-2 border-slate-800">
        <div className="col-span-8 bg-[#1e6075] text-white px-2 py-1 font-bold border-r-2 border-slate-800">PRESENTACIÓN</div>
        <div className="col-span-4 bg-[#1e6075] text-white px-2 py-1 font-bold">LISTA DE DISTRIBUCIÓN</div>
      </div>
      <div className="grid grid-cols-12 border-b-2 border-slate-800 min-h-[50px]">
        <div className="col-span-8 border-r-2 border-slate-800 p-2 text-slate-500 italic">
          PowerBI / Dashboard Central
        </div>
        <div className="col-span-4 p-2 text-slate-700">
          Gerencia de {SILO_LABELS[indicator.silo]}
        </div>
      </div>

      {/* Values/Goals section */}
      <div className="grid grid-cols-12">
        <div className="col-span-3 bg-[#1e6075] text-white px-2 py-1 font-bold border-r-2 border-slate-800 border-b-2">VALORES</div>
        <div className="col-span-5 bg-[#1e6075] text-white px-2 py-1 font-bold border-r-2 border-slate-800 border-b-2">ACCIÓN</div>
        <div className="col-span-4 bg-[#1e6075] text-white px-2 py-1 font-bold border-b-2">RESPONSABLE</div>
      </div>
      
      {/* Meta Row */}
      <div className="grid grid-cols-12 border-b border-slate-300">
        <div className="col-span-1 bg-[#f97316] text-white p-1 text-center font-bold border-r-2 border-slate-800 flex items-center justify-center border-b-2">Meta</div>
        <div className="col-span-2 bg-[#f97316] text-white p-1 font-semibold border-r-2 border-slate-800 flex items-center border-b-2">
           {indicator.goals || 'No definido'}
        </div>
        <div className="col-span-5 border-r-2 border-slate-800 p-1 border-b-2 min-h-[2.5rem]">
          {indicator.action_plan ? indicator.action_plan.substring(0, 100) : ''}
        </div>
        <div className="col-span-4 p-1 border-b-2 flex items-center">
          {indicator.responsible}
        </div>
      </div>

      {/* Bueno Row */}
      <div className="grid grid-cols-12 border-b border-slate-300">
        <div className="col-span-1 bg-[#fbef3c] text-slate-900 p-1 text-center font-bold border-r-2 border-slate-800 flex items-center justify-center border-b-2">Bueno</div>
        <div className="col-span-2 bg-[#fbef3c] text-slate-900 p-1 font-semibold border-r-2 border-slate-800 flex items-center border-b-2">
           {/* Placeholder calculation or logic */}
           {indicator.goals ? '> 70%' : ''}
        </div>
        <div className="col-span-5 border-r-2 border-slate-800 p-1 border-b-2 min-h-[2.5rem]"></div>
        <div className="col-span-4 p-1 border-b-2 flex items-center">
          {indicator.responsible}
        </div>
      </div>

      {/* Óptimo Row */}
      <div className="grid grid-cols-12">
        <div className="col-span-1 bg-[#86efac] text-slate-900 p-1 text-center font-bold border-r-2 border-slate-800 flex items-center justify-center">Óptimo</div>
        <div className="col-span-2 bg-[#86efac] text-slate-900 p-1 font-semibold border-r-2 border-slate-800 flex items-center">
           {indicator.goals ? '> 90%' : ''}
        </div>
        <div className="col-span-5 border-r-2 border-slate-800 p-1 min-h-[2.5rem]"></div>
        <div className="col-span-4 p-1 flex items-center">
          {indicator.responsible}
        </div>
      </div>
    </div>
  );
};
