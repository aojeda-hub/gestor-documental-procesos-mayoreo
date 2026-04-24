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
    .select('id, title, doc_type, silo');
    
  if (error) {
    console.error(error);
  } else {
    console.log('--- LISTADO COMPLETO ---');
    data.forEach(d => {
      console.log(`ID: ${d.id} | Silo: ${d.silo} | Tipo: ${d.doc_type} | Titulo: ${d.title}`);
    });
  }
}

run();
