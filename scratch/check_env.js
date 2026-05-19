const fs = require('fs');

console.log('ENV keys in process.env:');
Object.keys(process.env).forEach(key => {
  if (key.includes('SUPABASE') || key.includes('DB') || key.includes('KEY') || key.includes('URL') || key.includes('PORT')) {
    console.log(`- ${key}: ${process.env[key] ? 'present (len ' + process.env[key].length + ')' : 'empty'}`);
  }
});

if (fs.existsSync('.env')) {
  console.log('\nKeys in .env:');
  const content = fs.readFileSync('.env', 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts[0]) {
      console.log(`- ${parts[0].trim()}: ${parts[1] ? 'present' : 'empty'}`);
    }
  });
}
