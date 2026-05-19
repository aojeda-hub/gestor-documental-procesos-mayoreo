import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

async function run() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL="(.*)"/);
  const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);
  
  if (!urlMatch || !keyMatch) {
    console.error('Could not find Supabase credentials in .env');
    return;
  }
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('user_roles').select('*'),
  ]);
  
  console.log('--- PROFILES ---');
  console.log(JSON.stringify(profilesRes.data, null, 2));
  console.log('--- ROLES ---');
  console.log(JSON.stringify(rolesRes.data, null, 2));
}

run();
