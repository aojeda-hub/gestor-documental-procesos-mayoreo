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

async function searchMissingDocs() {
  console.log('Searching for missing documents...\n');
  
  for (const title of missingTitles) {
    console.log(`--- Searching for: "${title}" ---`);
    
    // exact match (case insensitive)
    const { data: exact, error: err1 } = await supabase
      .from('documents')
      .select('title, silo, doc_type, empresa')
      .ilike('title', title);
    
    if (exact && exact.length > 0) {
      console.log('  EXACT MATCH FOUND:');
      exact.forEach(d => console.log(`  - ${d.title} (Silo: ${d.silo}, Type: ${d.doc_type}, Empresa: ${d.empresa})`));
    } else {
      // partial match
      const baseName = title.replace(/^(procedimiento|norma|anexo|scrip)\s+/i, '');
      const { data: partial, error: err2 } = await supabase
        .from('documents')
        .select('title, silo, doc_type, empresa')
        .ilike('title', `%${baseName}%`);
        
      if (partial && partial.length > 0) {
        console.log(`  PARTIAL MATCHES FOR "${baseName}":`);
        partial.forEach(d => console.log(`  - ${d.title} (Silo: ${d.silo}, Type: ${d.doc_type}, Empresa: ${d.empresa})`));
      } else {
        console.log('  NO MATCHES FOUND.');
      }
    }
    console.log('');
  }
}

searchMissingDocs();
