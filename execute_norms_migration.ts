import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://qtxfokwwwfmovicdbtre.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0eGZva3d3d2Ztb3ZpY2RidHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzU0MjgsImV4cCI6MjA4OTUxMTQyOH0.blqnRNo_0fqVwCrDytVQsRDWg8-hHp-GFvGqzqFHgWE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const titlesToAdd = [
  "Administración del servicio de Vigilancia",
  "Almacenamiento en Tarimas",
  "Apertura y Cierre de CEDI",
  "Certificación Interna de Montacarguistas y Apiladores",
  "Control de Acceso a las Instalaciones",
  "Dotación de Equipos de Protecctión Personal",
  "Equipamiento de primeros Auxilios",
  "Evaluación de Agua potable",
  "Investigación de Accidentes Laborales",
  "Manejo Sistema CCTV",
  "Mantenimiento de la Planta Eléctrica",
  "Medición de seguridad, Orden  y Limpieza",
  "Norma  Reconocimiento por años de servicio",
  "Norma Apertura y Cierre de CEDI",
  "Norma Ascensos y Promociones",
  "Norma Capacitacion  del personal",
  "Norma Desincorporación de Colaboradores",
  "Norma Matríz de Crecimiento",
  "Norma Movilidad de Colaboradores",
  "Norma Programa de Pasantías",
  "Norma Suspensiones de Colaboradores",
  "Norma Teletrabajo",
  "Norma Transferencia de colaborador",
  "Norma para el Uso Seguro de Montacargas",
  "Plan de Seguridad y Salud Laboral",
  "Procediemiento Inducción a Colaboradores",
  "Procediemiento de Captacion de Personal",
  "Procedimiennto Aprobación de publicación de vacantes en proceso de captación",
  "Procedimiennto de capacitación del personal",
  "Procedimiento  Reconocimiento por años de servicio",
  "Procedimiento Actividades de bienestar al colaborador",
  "Procedimiento Administración de Remuneración Variable",
  "Procedimiento Administración de escala salarial",
  "Procedimiento Ascensos y Promociones",
  "Procedimiento Asociación Solidarista de las Empresas de Mayoreo en Costa Rica",
  "Procedimiento Assesment Center",
  "Procedimiento Beneficios del Colaborador",
  "Procedimiento Compensación salarial",
  "Procedimiento Comunicaciones internas al Colaborador",
  "Procedimiento Contratos de Trabajo a Colaboradores",
  "Procedimiento Descripcion de Cargos",
  "Procedimiento Desincorporación de Colaboradores",
  "Procedimiento Entrevista a Candidatos",
  "Procedimiento Estructuras Organizacionales",
  "Procedimiento Evaluacion de Competencias",
  "Procedimiento Evaluación de agua potable",
  "Procedimiento Exámen Pre-Empleo",
  "Procedimiento Gestión de Reconocimiento",
  "Procedimiento Gestión de Solicitudes de Personal en la Plataforma de Capital Humano",
  "Procedimiento Ingreso del colaborador",
  "Procedimiento Matríz de Crecimiento",
  "Procedimiento Movilidad de Colaboradores",
  "Procedimiento Oferta Salarial",
  "Procedimiento Programa de Pasantías",
  "Procedimiento Pruebas Psicotecnicas",
  "Procedimiento Retroalimentación para el Desarrollo",
  "Procedimiento Sucesión de Personal",
  "Procedimiento Teletrabajo",
  "Procedimiento Transferencia de colaborador",
  "Procedimiento Uso del Comedor de la Empresa",
  "Procedimiento Uso del Uniforme",
  "Procedimiento Vacaciones colaborador",
  "Procedimiento Viaticos de colaboradores",
  "Procedimiento de Requisición de personal",
  "Procedimiento suspenciones de colaboradores",
  "Procedimientos Gestión de Obligaciones Gubernamentales de Personal",
  "Procedimientos Préstamos a Colaboradores",
  "Protocolo de  Atención de personas accidentadas",
  "Protocolo de Vehiculos cargados para despacho",
  "Protocolo de respuestas ante Sismos",
  "Protocolo para Conato de Incendio",
  "Protocolo para continuidad operativa",
  "Protocolo para el manejo de Sustancias peligrosas",
  "Protocolo para la Inspeccion diaria de Montacargas",
  "Reporte del Colaborador de Accidentes Laborales",
  "Revisión de Camiones, Montacargas, Apiladores y Otros Vehículos de la Empresa",
  "Revisión del Sistema contra Incendio del Edificio",
  "Seguimiento de Gestión de Seguridad y Salud",
  "Seguridad Vehicular",
  "Sistema de Alarma",
  "Trabajo Alto Riesgo",
  "Uso de Lockers en Instalaciones de la Empresa",
  "Uso de equipos de protección Personal (EPP)",
  "Uso del Estacionamiento de la Empresa",
  "Uso seguro de Montacargas"
];

async function main() {
  console.log('Starting migration script...');

  // 1. Fetch current norms
  const { data: currentNormas, error: fetchError } = await supabase.from('normas_personal').select('*');
  if (fetchError) throw fetchError;

  console.log(`Currently there are ${currentNormas.length} records.`);

  // 2. Identify duplicates and delete them
  const seen = new Set();
  const duplicateIds = [];
  currentNormas.forEach(n => {
    if (seen.has(n.nombre_norma)) {
      duplicateIds.push(n.id);
    } else {
      seen.add(n.nombre_norma);
    }
  });

  if (duplicateIds.length > 0) {
    console.log(`Deleting ${duplicateIds.length} duplicates...`);
    const { error: deleteError } = await supabase.from('normas_personal').delete().in('id', duplicateIds);
    if (deleteError) throw deleteError;
  }

  // 3. Insert missing ones
  const finalSeen = new Set(currentNormas.filter(n => !duplicateIds.includes(n.id)).map(n => n.nombre_norma));
  const toInsert = titlesToAdd.filter(t => !finalSeen.has(t)).map(t => ({
    nombre_norma: t,
    tipo: 'Norma',
    activo: true,
    fecha_creacion: new Date().toISOString().split('T')[0]
  }));

  if (toInsert.length > 0) {
    console.log(`Inserting ${toInsert.length} missing records...`);
    const { error: insertError } = await supabase.from('normas_personal').insert(toInsert);
    if (insertError) throw insertError;
  }

  console.log('Migration completed successfully.');
}

main().catch(console.error);
