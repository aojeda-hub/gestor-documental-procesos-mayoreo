const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL="(.*)"/);
  const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);
  
  if (!urlMatch || !keyMatch) return;
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  console.log('Iniciando reorganización forzada de Normas...');

  // 1. Obtener todos los documentos que tienen "Norma" o "Protocolo" en el título 
  // pero están marcados como "procedimiento"
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, doc_type, silo')
    .eq('doc_type', 'procedimiento');

  if (error) {
    console.error(error);
    return;
  }

  const toFix = docs.filter(d => {
    const t = d.title.toLowerCase();
    return t.includes('norma') || t.includes('protocolo');
  });

  console.log(`Encontrados ${toFix.length} documentos para corregir.`);

  for (const doc of toFix) {
    console.log(`Corrigiendo: ${doc.title} (${doc.doc_type} -> norma)`);
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        doc_type: 'norma',
        silo: 'personal' // Aseguramos que vayan al silo de personal como pidió el usuario
      })
      .eq('id', doc.id);
    
    if (updateError) console.error(`Error en ${doc.id}:`, updateError);
    else console.log(`✓ OK`);
  }

  console.log('Reorganización finalizada.');
}

run();
