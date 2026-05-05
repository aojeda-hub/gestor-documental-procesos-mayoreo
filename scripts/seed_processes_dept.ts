/**
 * Script para cargar la base de conocimientos del Departamento de Procesos
 * Ejecución: npx ts-node scripts/seed_processes_dept.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan variables de entorno VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const processesDeptData = [
  {
    title: 'DC - Jefe de Procesos',
    category: 'procesos_dept',
    content: `
      ROL: Jefe de Procesos
      FINALIDAD: Diseñar, liderar y coordinar el plan de normalización de procesos del negocio.
      RESPONSABILIDADES:
      - Diseñar plan de normalización.
      - Supervisar proyectos de mejora.
      - Evaluar madurez de procesos.
      - Dirigir documentación.
      - Promover buenas prácticas.
      - Articular esfuerzos entre áreas.
      ESTRUCTURA: Le reportan 1 Coordinador de Procesos + 4 Asesores de Procesos.
      REQUISITOS: Formación universitaria en Ingeniería o Administración, 3 años de experiencia progresiva en el área, idioma inglés intermedio.
      COMPETENCIAS: Orientación al logro, visión estratégica, habilidades de negociación y desarrollo de personas.
    `
  },
  {
    title: 'DC - Coordinador de Procesos',
    category: 'procesos_dept',
    content: `
      ROL: Coordinador de Procesos
      FINALIDAD: Supervisar, optimizar y garantizar correcto funcionamiento de procesos operativos y administrativos.
      RESPONSABILIDADES:
      - Identificar áreas de mejora.
      - Elaborar reportes de desempeño.
      - Implementar mejoras.
      ESTRUCTURA: Le reportan 5 Asesores de Procesos.
      COMPETENCIAS: Dominio Comercial, Planificación, Adaptabilidad, Impacto, Orientación al Cliente, Pensamiento Analítico.
    `
  },
  {
    title: 'DC - Asesor de Procesos',
    category: 'procesos_dept',
    content: `
      ROL: Asesor de Procesos
      FINALIDAD: Diseñar, modelar, analizar y normalizar procesos de la compañía.
      RESPONSABILIDADES:
      - Conocer procesos de negocio.
      - Mantener documentación actualizada.
      - Investigar metodologías.
      - Participar en iniciativas de mejora.
      - Validar información.
      - Promover estándares.
      PERFIL: Es el rol con más contacto con las áreas operativas para entender cómo funcionan realmente las cosas.
    `
  },
  {
    title: 'Misión y Propósito del Departamento de Procesos',
    category: 'procesos_dept',
    content: `
      ¿POR QUÉ EXISTE EL DEPARTAMENTO DE PROCESOS?
      Existimos para que la organización funcione como un sistema ordenado, medible y en mejora continua. 
      Nos aseguramos de que el conocimiento no se pierda, que todos trabajemos bajo los mismos estándares de calidad, y que cada problema identificado se convierta en una oportunidad de mejora documentada.
      Sin nosotros, cada área haría las cosas de manera distinta, se perdería el conocimiento cuando alguien se va, y no habría forma de medir si estamos haciendo las cosas bien o mal.

      ¿QUÉ PROBLEMAS RESOLVEMOS?
      - Falta de estandarización entre áreas.
      - Pérdida de conocimiento crítico cuando alguien se va.
      - Procesos ineficientes que generan pérdida de tiempo o recursos.
      - Dificultad para medir el desempeño real.
      Nuestra misión es que cada actividad tenga una 'mejor práctica documentada' que podamos medir, mejorar y replicar.

      ¿CÓMO TRABAJAMOS?
      Trabajamos con pensamiento científico y mejora continua.
      1. Identificamos un proceso mejorable.
      2. Analizamos y proponemos hipótesis de mejora.
      3. Probamos en pequeño y medimos resultados.
      4. Si funciona, lo documentamos como la nueva 'Norma' (mejor práctica conocida hasta el momento).
      Todo esto coordinando con todos los departamentos, porque los procesos cruzan toda la organización.
    `
  }
];

async function seed() {
  console.log('Cargando conocimientos del Departamento de Procesos...');
  
  for (const item of processesDeptData) {
    const { error } = await supabase
      .from('knowledge_base')
      .upsert({
        title: item.title,
        content: item.content,
        category: item.category
      }, { onConflict: 'title' });

    if (error) {
      console.error(`Error cargando ${item.title}:`, error.message);
    } else {
      console.log(`✓ Cargado: ${item.title}`);
    }
  }
  
  console.log('Proceso completado.');
}

seed();
