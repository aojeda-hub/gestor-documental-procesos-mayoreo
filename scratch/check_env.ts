import * as dotenv from 'dotenv';
dotenv.config();

console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
console.log('SUPABASE_DB_URL present:', !!process.env.SUPABASE_DB_URL);
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
