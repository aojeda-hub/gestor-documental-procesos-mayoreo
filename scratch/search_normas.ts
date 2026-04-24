import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://qtxfokwwwfmovicdbtre.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0eGZva3d3d2Ztb3ZpY2RidHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzU0MjgsImV4cCI6MjA4OTUxMTQyOH0.blqnRNo_0fqVwCrDytVQsRDWg8-hHp-GFvGqzqFHgWE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const missingTitles = [
  "Captación remota",
  "Scrip de Captación Remota Cofersa",
  "Scrip de Captación Remota Mundial de Partes",
  "Resultado de Pruebas de Selección",
  "Procedimiento Aprobación de publicación de vacantes en proceso de captación",
  "Procedimiento Pruebas Psicotecnicas"
];

async function searchInNormas() {
  console.log('Searching in normas_personal table...\n');
  
  for (const title of missingTitles) {
    const { data, error } = await supabase
      .from('normas_personal')
      .select('nombre_norma')
      .ilike('nombre_norma', `%${title}%`);
      
    if (data && data.length > 0) {
      console.log(`FOUND in normas_personal for "${title}":`);
      data.forEach(d => console.log(`- ${d.nombre_norma}`));
    } else {
      console.log(`NOT FOUND in normas_personal for "${title}"`);
    }
  }
}

searchInNormas();
