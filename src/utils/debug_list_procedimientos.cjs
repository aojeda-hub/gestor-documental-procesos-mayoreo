const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL="(.*)"/);
  const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);
  
  if (!urlMatch || !keyMatch) {
    console.error('No se encontraron las llaves de Supabase en .env');
    return;
  }
  
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  const { data, error } = await supabase
    .from('documents')
    .select('title, doc_type, silo')
    .eq('silo', 'personal')
    .eq('doc_type', 'procedimiento')
    .order('title');
    
  if (error) {
    console.error(error);
  } else {
    console.log('--- DOCUMENTOS EN PERSONAL > PROCEDIMIENTO ---');
    (data || []).forEach(d => console.log(`- ${d.title}`));
    console.log(`Total: ${data?.length || 0}`);
  }
}

run();
