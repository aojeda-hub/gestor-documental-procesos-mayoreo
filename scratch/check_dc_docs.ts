import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://qtxfokwwwfmovicdbtre.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0eGZva3d3d2Ztb3ZpY2RidHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzU0MjgsImV4cCI6MjA4OTUxMTQyOH0.blqnRNo_0fqVwCrDytVQsRDWg8-hHp-GFvGqzqFHgWE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDC() {
  const { data, error } = await supabase
    .from('documents')
    .select('title, silo, doc_type')
    .ilike('title', '%DC -%');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${data.length} documents containing "DC -":`);
  data.forEach(d => {
    console.log(`- ${d.title} (Silo: ${d.silo}, Type: ${d.doc_type})`);
  });
}

checkDC();
