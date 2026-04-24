const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL="(.*)"/);
  const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);
  
  if (!urlMatch || !keyMatch) return;
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  // Lista de títulos a corregir según la captura del usuario
  const titlesToFix = [
    "Norma para Seguridad de Contratistas.docx",
    "Norma Evaluación de Agua Potable.docx",
    "Norma de Medición de Seguridad, Orden y Limpieza.docx",
    "Norma de Dotación de Equipo de Protección Personal",
    "Norma Desincorporación de Colaboradores",
    "Norma Contratos de Trabajo a Colaboradores",
    "Norma Actividades de Bienestar al Colaborador",
    "Norma Gestión de Reconocimiento",
    "Norma Administración de Remuneración Variable",
    "Norma Descripcion de Cargos",
    "Norma Estructuras Organizacionales",
    "Norma Programa de Pasantías",
    "Norma Oferta Salarial",
    "Norma Assesment Center",
    "Norma requisición de Personal",
    "Norma de Captación de Personal .docx"
  ];

  console.log('Iniciando corrección manual de tipos...');

  for (const title of titlesToFix) {
    // Buscamos el documento por título (case insensitive)
    const { data: matches, error: findError } = await supabase
      .from('documents')
      .select('id, title, doc_type, silo')
      .ilike('title', title);

    if (findError) {
      console.error(`Error buscando ${title}:`, findError);
      continue;
    }

    if (matches && matches.length > 0) {
      for (const doc of matches) {
        console.log(`Corrigiendo: [${doc.id}] ${doc.title} (${doc.doc_type} -> norma)`);
        const { error: updateError } = await supabase
          .from('documents')
          .update({ doc_type: 'norma', silo: 'personal' })
          .eq('id', doc.id);
        
        if (updateError) console.error(`Error actualizando ${doc.id}:`, updateError);
        else console.log(`✓ Actualizado ${doc.title}`);
      }
    } else {
      console.log(`? No se encontró: ${title}`);
    }
  }

  console.log('Corrección finalizada.');
}

run();
