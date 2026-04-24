
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://qtxfokwwwfmovicdbtre.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0eGZva3d3d2Ztb3ZpY2RidHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzU0MjgsImV4cCI6MjA4OTUxMTQyOH0.blqnRNo_0fqVwCrDytVQsRDWg8-hHp-GFvGqzqFHgWE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MISSING_DOCS = [
  "Captación remota",
  "Scrip de Captación Remota Cofersa",
  "Scrip de Captación Remota Mundial de Partes",
  "Resultado de Pruebas de Selección",
  "Procedimiento Aprobación de publicación de vacantes en proceso de captación",
  "Procedimiento Pruebas Psicotecnicas",
  "Anexo Instrucciones para Realizar las Pruebas Psicotécnicas",
  "Manual de aplicacion de pruebas psicotecnicas",
  "Diccionario de Competencias Gerenciales",
  "Diccionario de Competencias Comerciales",
  "Procedimiento Exámen Pre-Empleo",
  "Procedimiento Exámen Pre-Empleo Colombia",
  "Procedimiento Exámen Pre-Empleo Costa Rica",
  "Exámenes Autorizados"
];

async function main() {
  const { data: docs, error } = await supabase.from('documents').select('*');
  if (error) {
    console.error('Error fetching documents', error);
    return;
  }

  console.log(`Searching for ${MISSING_DOCS.length} documents in ${docs.length} total documents...`);

  const results = [];

  for (const targetName of MISSING_DOCS) {
    // Try exact match and fuzzy match
    const matches = docs.filter(d => {
      const title = d.title.toLowerCase();
      const target = targetName.toLowerCase();
      return title.includes(target) || target.includes(title);
    });

    if (matches.length > 0) {
      matches.forEach(m => {
        results.push({
          target: targetName,
          found_title: m.title,
          silo: m.silo,
          doc_type: m.doc_type,
          id: m.id
        });
      });
    } else {
      results.push({
        target: targetName,
        found_title: "NOT FOUND",
        silo: "-",
        doc_type: "-",
        id: "-"
      });
    }
  }

  console.table(results);
  
  // Also check if there are many documents in 'sinsilo'
  const sinSiloDocs = docs.filter(d => d.silo === 'sinsilo' || !d.silo);
  console.log(`\nDocuments in 'sinsilo' or NULL silo: ${sinSiloDocs.length}`);
  if (sinSiloDocs.length > 0) {
      console.log("First 10 'sinsilo' docs:");
      console.table(sinSiloDocs.slice(0, 10).map(d => ({ title: d.title, silo: d.silo })));
  }
}

main().catch(console.error);
