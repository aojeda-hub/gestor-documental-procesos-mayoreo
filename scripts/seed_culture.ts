/**
 * Script para cargar la base de conocimientos de Cultura Mayoreo
 * Ejecución: npx ts-node scripts/seed_culture.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan variables de entorno VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const cultureData = [
  {
    title: 'Misión, Visión y Valores',
    category: 'cultura',
    content: `
      MISIÓN:
      Brindar soluciones integrales en la cadena de suministro, superando las expectativas de nuestros clientes con eficiencia y compromiso.
      
      VISIÓN:
      Ser el referente regional en gestión logística y distribución, reconocidos por nuestra cultura de excelencia y mejora continua para el 2030.
      
      VALORES:
      1. Honradez: Actuamos con rectitud, integridad y transparencia en todas nuestras acciones.
      2. Igualdad: Promovemos un trato justo y equitativo, valorando la diversidad y el respeto mutuo.
      3. Constancia: Perseveramos con disciplina y entrega para alcanzar nuestros objetivos institucionales.
    `
  },
  {
    title: 'Perfil del Colaborador y Líder Mayoreo',
    category: 'liderazgo',
    content: `
      PERFIL DEL COLABORADOR:
      Un colaborador Mayoreo se distingue por su compromiso, capacidad de aprendizaje, orientación a resultados y alineación con los valores institucionales.
      
      PERFIL DEL LÍDER:
      El líder Mayoreo es un facilitador que inspira con el ejemplo, fomenta la mejora continua, gestiona el talento de su equipo y utiliza herramientas de gestión para la toma de decisiones basada en datos.
    `
  },
  {
    title: 'Cultura de Mejora Continua',
    category: 'mejora_continua',
    content: `
      MEJORA CONTINUA:
      Nuestra cultura se basa en la identificación constante de oportunidades de optimización. Utilizamos el ciclo PHVA (Planear, Hacer, Verificar, Actuar) y fomentamos que cada colaborador sea protagonista del cambio.
      
      Ruta para la identificación con la cultura:
      1. Conocimiento de valores.
      2. Adopción de comportamientos.
      3. Proactividad en procesos.
      4. Liderazgo transformador.
    `
  }
];

async function seed() {
  console.log('Cargando base de conocimientos...');
  
  for (const item of cultureData) {
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
