const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL="(.*)"/);
  const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);
  
  if (!urlMatch || !keyMatch) return;
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  const { data, error } = await supabase
    .from('documents')
    .select('title, silo, doc_type')
    .limit(50);
    
  if (error) {
    console.error(error);
  } else {
    console.log('--- MUESTRA DE DOCUMENTOS (Primeros 50) ---');
    data.forEach(d => console.log(`- [Silo: ${d.silo}] [Tipo: ${d.doc_type}] ${d.title}`));
  }
}

run();
