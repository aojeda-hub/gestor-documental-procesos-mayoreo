const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== 1. DESCRIPCIÓN DEL DEPARTAMENTO DE PROCESOS ==========
const descripcionDepartamento = `
El departamento de procesos de Mayoreo es el responsable de diseñar, documentar, normalizar y mejorar continuamente los procesos de negocio a nivel internacional.

Somos una organización con presencia internacional, y el departamento de procesos asegura que todas las operaciones (Logística, Compras, Ventas, Personal, Control, Mercadeo, Sistemas) funcionen bajo los mismos estándares de calidad, eficiencia y mejora continua.

🔹 ¿QUÉ HACEMOS?
- Diseñamos y coordinamos el plan de normalización de procesos del negocio.
- Documentamos las "mejores prácticas conocidas hasta el momento" bajo la figura de NORMAS.
- Identificamos áreas de mejora en los procesos para optimizar recursos y reducir costos.
- Implementamos mejoras y optimizaciones para garantizar calidad y efectividad.
- Mantenemos actualizada la documentación de todos los silos.
- Evaluamos la madurez y eficiencia de los procesos.
- Promovemos una cultura de mejora continua y estandarización.

🔹 ¿QUÉ PROBLEMAS RESOLVEMOS?
- Falta de estandarización entre áreas y países.
- Pérdida de conocimiento crítico cuando un colaborador se va.
- Procesos ineficientes que generan pérdida de tiempo y recursos.
- Dificultad para medir el desempeño real de la operación.
- Variabilidad en la calidad del trabajo entre diferentes silos.

🔹 ¿CÓMO TRABAJAMOS?
- Aplicamos pensamiento científico: observar, hipotetizar, probar, medir, documentar.
- Nos regimos por el principio de mejora continua: nunca nos conformamos con el éxito.
- Las NORMAS son la "mejor práctica conocida hasta el momento", pero siempre las retamos.
- Coordinamos con todos los departamentos porque los procesos cruzan toda la organización.
- Documentamos procedimientos, flujos y tareas en los sistemas (eflow WMS, Softland, etc.).

🔹 NUESTRA ESTRUCTURA (3 roles clave):

1. JEFE DE PROCESOS (no es responsable de métodos)
   - Diseña, lidera y coordina el plan de normalización de procesos.
   - Supervisa proyectos de mejora e iniciativas estratégicas.
   - Evalúa la madurez y eficiencia de los procesos.
   - Dirige la documentación de procesos de negocio.
   - Promueve buenas prácticas y articula esfuerzos entre áreas.
   - Le reportan: 1 Coordinador de Procesos y 4 Asesores de Procesos.

2. COORDINADOR DE PROCESOS ✅ (es RESPONSABLE DE MÉTODOS)
   - Supervisa, optimiza y garantiza el correcto funcionamiento de los procesos.
   - Identifica áreas de mejora en los procesos.
   - Elabora reportes de desempeño para la gerencia.
   - Implementa mejoras y optimizaciones.
   - Le reportan: 5 Asesores de Procesos.

3. ASESOR DE PROCESOS ✅ (es RESPONSABLE DE MÉTODOS)
   - Diseña, modela, analiza y normaliza los procesos de la compañía.
   - Conoce y entiende los procesos de negocio.
   - Mantiene actualizada y publicada la documentación.
   - Investiga y propone metodologías de mejora.
   - Participa en iniciativas y proyectos de mejora.
   - Promueve el uso de estándares.

🔹 ¿DE QUÉ NOS ENCARGAMOS EXACTAMENTE?
De que toda la organización tenga claridad de cómo hacer el trabajo de la mejor manera posible, documentada, estandarizada, accesible para todos y en mejora continua. Somos los dueños de la metodología, la norma y la calidad de los procesos.
`;

// ========== 2. MISIÓN, VISIÓN, VALORES (según PDF Cultura 2025) ==========
const mision = "Ofrecer la mejor opción en servicio, surtido y precio del mercado.";
const vision = "Ser el mayorista preferido de nuestros clientes, proveedores, colaboradores, accionistas y comunidades donde operamos.";
const valores = `
Los valores de Mayoreo son tres, y deben vivirse en el día a día:

1. HONRADEZ: Estamos orientados a la verdad, cumplimos nuestros compromisos, respetamos la propiedad intelectual, nos regimos por las leyes, denunciamos el robo.

2. IGUALDAD: Todos servimos al cliente, las normas son para todos, todos tenemos las mismas oportunidades, somos accesibles, tenemos los mismos derechos.

3. CONSTANCIA: Nos exigimos efectividad, somos inconformes con el éxito, preferimos la proactividad, reconocemos el mérito, estamos comprometidos con la sucesión.
`;

// ========== 3. Silos, responsables de métodos y su grupo BPA (según BPA Mayoreo.jpeg) ==========
const silos = [
  { nombre: "LOGÍSTICA", responsable: "Stephanie Araya", email: "saraya@mayoreo.biz", grupoBPA: "CV (Cadena de Valor) - CVP06 a CVP15" },
  { nombre: "PERSONAL", responsable: "Angely Ojeda", email: "aojeda@mayoreo.biz", grupoBPA: "SOP (Soporte) - SOP06" },
  { nombre: "COMPRAS", responsable: "Ambar Pulido", email: "apulido@mayoreo.biz", grupoBPA: "CV (Cadena de Valor) - CVP04, CVP05" },
  { nombre: "VENTAS", responsable: "Mayte Zarraga", email: "mzarraga@mayoreo.biz", grupoBPA: "CV (Cadena de Valor) - CVP07 a CVP11, CVP14, CVP15" },
  { nombre: "MERCADEO", responsable: "Mayte Zarraga", email: "mzarraga@mayoreo.biz", grupoBPA: "SOP (Soporte) - SOP10, SOP11" },
  { nombre: "CONTROL", responsable: "Paola Rodriguez", email: "prodriguez@mayoreo.biz", grupoBPA: "SOP (Soporte) - SOP01, SOP02, SOP03, SOP09" },
  { nombre: "SISTEMAS", responsable: "Edgar Monagas", email: "emonagas@mayoreo.biz", grupoBPA: "SOP (Soporte) - SOP08" }
];

// ========== 4. Responsables de métodos por silo ==========
const responsablesPorSilo: Record<string, string> = {
  "LOGÍSTICA": "Stephanie Araya (saraya@mayoreo.biz)",
  "PERSONAL": "Angely Ojeda (aojeda@mayoreo.biz)",
  "COMPRAS": "Ambar Pulido (apulido@mayoreo.biz)",
  "VENTAS": "Mayte Zarraga (mzarraga@mayoreo.biz)",
  "MERCADEO": "Mayte Zarraga (mzarraga@mayoreo.biz)",
  "CONTROL": "Paola Rodriguez (prodriguez@mayoreo.biz)",
  "SISTEMAS": "Edgar Monagas (emonagas@mayoreo.biz)"
};

// ========== 5. Procesos por silo (nivel 1) ==========
const procesosPorSilo: Record<string, string[]> = {
  "LOGÍSTICA": ["Alisto y facturación", "Comercio Exterior", "Despacho y Transporte", "Recepción y Almacenaje de Mercancía", "Atención al cliente", "Compra", "Gestión de inventario", "Logística 3PL"],
  "PERSONAL": ["Captación", "Desarrollo", "Administracion de Personal", "Seguridad y salud laboral", "Servicios internos"],
  "COMPRAS": ["Definición de Surtido", "Estudio de Factibilidad", "Negociación con Proveedores", "Compra", "Seguimiento Proveedores"],
  "VENTAS": ["Administración de Clientes", "Evaluación potencial de la zona", "Administración de Ventas", "Negociación de Venta", "Administración de Cobranza"],
  "MERCADEO": ["Gestión de Comunicación", "Gestión de Publicidad", "Oferta del Producto"],
  "CONTROL": ["Ejecución y Control del Plan Financiero", "Gestión de Crédito y Cobranza", "Control de Inventarios", "Registro y Control de las Operaciones Contables", "Legal", "Monitoreo"],
  "SISTEMAS": ["Seguridad", "Procesos y sistemas"]
};

// ========== 6. Funciones y responsabilidades de roles ==========
const roles = {
  jefe: `El Jefe de Procesos NO es responsable de métodos. Sus funciones son:
- Diseñar, liderar y coordinar el plan de normalización de procesos.
- Supervisar proyectos e iniciativas de mejora.
- Evaluar la madurez y eficiencia de los procesos.
- Dirigir la documentación de procesos.
- Promover buenas prácticas y articular esfuerzos entre áreas.
- Presentar informes a la Gerencia de Transformación.
- Desarrollar, dirigir y evaluar a los colaboradores a su cargo.
Le reportan: 1 Coordinador de Procesos y 4 Asesores de Procesos.`,

  coordinador: `El Coordinador de Procesos SÍ es responsable de métodos. Sus funciones son:
- Supervisar, optimizar y garantizar el correcto funcionamiento de los procesos.
- Identificar áreas de mejora en los procesos.
- Elaborar reportes sobre el desempeño de los procesos.
- Implementar mejoras y optimizaciones.
- Coordinar con gerentes de área y Recursos Humanos.
Le reportan: 5 Asesores de Procesos.
Formación: Ingeniería o afines. Inglés intermedio. 3 años de experiencia.`,

  asesor: `El Asesor de Procesos SÍ es responsable de métodos. Sus funciones son:
- Diseñar, modelar, analizar y normalizar los procesos.
- Conocer y entender los procesos de negocio.
- Mantener actualizada y publicada la documentación.
- Investigar y proponer metodologías de mejora.
- Participar en iniciativas y proyectos de mejora.
- Validar información y promover el uso de estándares.
Se relaciona con Jefe de Procesos, Responsable Comercial, Responsables Técnicos y todos los departamentos.
Formación: Ingeniería o Licenciatura en procesos. 1 año de experiencia.`
};

// ========== 7. Indicadores clave (del Excel) ==========
const indicadores = {
  "LOGÍSTICA": "Efectividad en recepción, Precisión del inventario, Rotación de inventario, % entregas a tiempo, Costo por error, Disponibilidad, MTBF.",
  "PERSONAL": "Rotación de Personal, Gastos de Personal, Renta Bruta por Hora Hombre, Clima laboral.",
  "VENTAS": "Alcance de Presupuesto de Ventas, Eficiencia en gasto de ventas, Activación de Clientes, Cartera Vencida.",
  "CONTROL": "Morosidad, Gastos bancarios, Índice de Incobrabilidad, Precisión en informes financieros.",
  "COMPRAS": "Rotación del Surtido, GMROI, Obsolescencia, Fill Rate."
};

// ========== 8. Estatus de documentos ==========
const estatusDocumentos = ["Aprobado", "Revisión", "Construcción", "Por iniciar", "Desactualizado", "Por aprobar"];

// ========== 9. FUNCIÓN PRINCIPAL DE RESPUESTA ==========
function findAnswer(question: string): string {
  const q = question.toLowerCase();

  // Pregunta sobre el departamento de procesos
  if (q.includes("departamento de procesos") || (q.includes("qué hace") && q.includes("procesos")) || q.includes("que hace el departamento de procesos")) {
    return descripcionDepartamento;
  }

  // Pregunta sobre misión
  if (q.includes("misión") || q.includes("mision")) return `📌 MISIÓN MAYOREO:\n${mision}`;

  // Pregunta sobre visión
  if (q.includes("visión") || q.includes("vision")) return `📌 VISIÓN MAYOREO:\n${vision}`;

  // Pregunta sobre valores
  if (q.includes("valores") || q.includes("honradez") || q.includes("igualdad") || q.includes("constancia")) return `📌 VALORES MAYOREO:\n${valores}`;

  // Pregunta sobre roles específicos
  if (q.includes("jefe de procesos")) return roles.jefe;
  if (q.includes("coordinador de procesos")) return roles.coordinador;
  if (q.includes("asesor de procesos")) return roles.asesor;

  // Pregunta sobre responsable de métodos de un silo
  for (const silo of silos) {
    if (q.includes(silo.nombre.toLowerCase())) {
      if (q.includes("responsable") || q.includes("quién") || q.includes("quien") || q.includes("correo") || q.includes("email")) {
        return `El responsable de métodos para el silo ${silo.nombre} es ${responsablesPorSilo[silo.nombre]}. Grupo BPA: ${silo.grupoBPA}.`;
      }
      if (q.includes("procesos") || q.includes("qué hace")) {
        return `El silo ${silo.nombre} tiene los siguientes procesos:\n${procesosPorSilo[silo.nombre].map(p => `- ${p}`).join("\n")}`;
      }
      if (q.includes("grupo bpa") || q.includes("grupo del bpa")) {
        return `El silo ${silo.nombre} pertenece al grupo BPA: ${silo.grupoBPA}.`;
      }
    }
  }

  // Pregunta sobre indicadores
  if (q.includes("indicador") || q.includes("kpi")) {
    for (const [area, indicador] of Object.entries(indicadores)) {
      if (q.includes(area.toLowerCase())) {
        return `Indicadores clave para ${area}:\n${indicador}`;
      }
    }
    return `Indicadores por área:\n${Object.entries(indicadores).map(([a, i]) => `${a}: ${i}`).join("\n\n")}`;
  }

  // Pregunta sobre estatus de documentos
  if (q.includes("estatus") || q.includes("estado de documentos")) {
    return `Los estatus de documentos son: ${estatusDocumentos.join(", ")}.`;
  }

  // Pregunta sobre grupo BPA general
  if (q.includes("grupo bpa") || q.includes("bpa")) {
    return `Los grupos BPA son:
- PL (Planificación): PL01 a PL03
- CV (Cadena de Valor): CVP01 a CVP15
- SOP (Soporte): SOP01 a SOP11
Los silos se asignan a estos grupos según su función.`;
  }

  // Respuesta por defecto
  return `Soy el asistente del departamento de procesos de Mayoreo. Puedo responder preguntas sobre:

📌 Descripción del departamento de procesos
📌 Misión, Visión y Valores
📌 Roles: Jefe, Coordinador y Asesor de Procesos
📌 Silos y responsables de métodos (Logística, Personal, Compras, Ventas, Mercadeo, Control, Sistemas)
📌 Procesos por silo
📌 Indicadores clave por área
📌 Estatus de documentos
📌 Grupo BPA al que pertenece cada silo

¿Qué te gustaría consultar?`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();
    if (!question) {
      return new Response(
        JSON.stringify({ answer: "Por favor, escribe una pregunta." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const answer = findAnswer(question);
    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ answer: "Error interno. Por favor, intenta nuevamente." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});