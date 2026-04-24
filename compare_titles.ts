import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://qtxfokwwwfmovicdbtre.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0eGZva3d3d2Ztb3ZpY2RidHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzU0MjgsImV4cCI6MjA4OTUxMTQyOH0.blqnRNo_0fqVwCrDytVQsRDWg8-hHp-GFvGqzqFHgWE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const migrationFiles = [
    'supabase/migrations/20260417143800_cleanup_personal_silo.sql',
    'supabase/migrations/20260417154500_add_missing_personal_normas.sql'
];

function extractTitles(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = /ILIKE '(.*?)%/g;
    let m;
    const titles = [];
    while ((m = regex.exec(content)) !== null) {
        titles.push(m[1].trim());
    }
    return titles;
}

async function main() {
    let allTitles = [];
    migrationFiles.forEach(file => {
        allTitles = allTitles.concat(extractTitles(file));
    });

    const uniqueTitles = Array.from(new Set(allTitles)).sort();
    
    const { data: currentNormas, error } = await supabase.from('normas_personal').select('nombre_norma');
    if (error) {
        console.error('Error fetching current normas:', error);
        return;
    }
    
    const currentNames = new Set(currentNormas.map(n => n.nombre_norma));
    const missing = uniqueTitles.filter(t => !currentNames.has(t));

    console.log('Unique titles found in migrations:', uniqueTitles.length);
    console.log('Missing titles in normas_personal:', missing.length);
    console.log('Missing titles list:');
    console.log(JSON.stringify(missing, null, 2));
}

main().catch(console.error);
