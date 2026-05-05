const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base de conocimiento priorizada (más específico primero)
const knowledgeBase = [
  // Preguntas sobre JEFE (específicas)
  { 
    keywords: ["jefe de procesos", "qué hace el jefe", "que hace el jefe", "funciones del jefe", "responsabilidades del jefe"],
    answer: "El Jefe de Procesos diseña, lidera y coordina el plan de normalización de procesos. Supervisa proyectos de mejora, evalúa la madurez de los procesos, dirige la documentación y promueve buenas prácticas. Le reportan 1 Coordinador y 4 Asesores." 
  },
  
  // Preguntas sobre COORDINADOR
  { 
    keywords: ["coordinador de procesos", "qué hace el coordinador", "que hace el coordinador", "funciones del coordinador"],
    answer: "El Coordinador de Procesos supervisa, optimiza y garantiza el correcto funcionamiento de los procesos. Identifica áreas de mejora, elabora reportes de desempeño e implementa mejoras. Le reportan 5 Asesores." 
  },
  
  // Preguntas sobre ASESOR
  { 
    keywords: ["asesor de procesos", "qué hace el asesor", "que hace el asesor", "funciones del asesor"],
    answer: "El Asesor de Procesos diseña, modela, analiza y normaliza los procesos. Mantiene actualizada la documentación, investiga metodologías y promueve estándares." 
  },
  
  // Problemas que resuelve
  { 
    keywords: ["problemas", "resuelven", "que problemas", "qué problemas"],
    answer: "Resolvemos: falta de estandarización, pérdida de conocimiento crítico, procesos ineficientes y dificultad para medir el desempeño real." 
  },
  
  // Cómo trabajan
  { 
    keywords: ["como trabajan", "cómo trabajan", "metodologia"],
    answer: "Trabajamos con pensamiento científico y mejora continua. Observamos, probamos, medimos y documentamos. Las Normas son la mejor práctica conocida hasta el momento." 
  },
  
  // Misión
  { 
    keywords: ["mision", "misión"],
    answer: "Nuestra misión es: Ofrecer la mejor opción en servicio, surtido y precio del mercado." 
  },
  
  // Visión
  { 
    keywords: ["vision", "visión"],
    answer: "Nuestra visión es: Ser el mayorista preferido de nuestros clientes, proveedores, colaboradores, accionistas y comunidades." 
  },
  
  // Valores
  { 
    keywords: ["valores", "honradez", "igualdad", "constancia"],
    answer: "Nuestros valores son: Honradez (orientados a la verdad), Igualdad (todos servimos al cliente) y Constancia (nos exigimos efectividad)." 
  },
  
  // Pregunta general del departamento (solo si no coincide ninguna anterior)
  { 
    keywords: ["departamento de procesos", "que hace el departamento", "qué hace el departamento", "funcion del departamento"],
    answer: "El departamento de procesos se encarga de documentar, normalizar y mejorar los procesos de la compañía." 
  }
];

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

    const lowerQuestion = question.toLowerCase();
    let answer = null;
    
    // Buscar la mejor coincidencia (recorre en orden de prioridad)
    for (const item of knowledgeBase) {
      for (const keyword of item.keywords) {
        if (lowerQuestion.includes(keyword)) {
          answer = item.answer;
          break;
        }
      }
      if (answer) break;
    }
    
    // Si no encontró ninguna coincidencia
    if (!answer) {
      answer = "Puedo responder preguntas sobre: el departamento de procesos, sus roles (Jefe, Coordinador, Asesor), qué problemas resolvemos, misión, visión y valores. ¿Qué te gustaría saber?";
    }

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