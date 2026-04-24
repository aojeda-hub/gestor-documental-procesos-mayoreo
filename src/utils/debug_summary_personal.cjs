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
    .select('title, doc_type, silo')
    .eq('silo', 'personal')
    .order('doc_type');
    
  if (error) {
    console.error(error);
  } else {
    console.log('--- RESUMEN SILO PERSONAL ---');
    const counts = {};
    data.forEach(d => {
      counts[d.doc_type] = (counts[d.doc_type] || 0) + 1;
    });
    console.log(counts);
    console.log('\nPrimeros 20 documentos:');
    data.slice(0, 20).forEach(d => console.log(`- [${d.doc_type}] ${d.title}`));
  }
}

run();
