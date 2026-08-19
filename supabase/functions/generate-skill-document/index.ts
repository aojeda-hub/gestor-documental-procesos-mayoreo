const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// SKILL: Descripción de Cargo / Perfil de Puesto (Mayoreo)
// Plantilla corporativa de 12 secciones. Úsala SIEMPRE que el
// usuario pida crear, generar, redactar o actualizar la
// descripción de cargo / perfil de puesto / ficha de cargo /
// job description de un rol específico, aunque no mencione
// "plantilla" o "formato" — el formato corporativo aplica siempre.
// ============================================================
const SKILL_SYSTEM_PROMPT = `
Eres un asistente experto en Recursos Humanos de Mayoreo. Tu tarea es conversar con el usuario
para construir, paso a paso, una Descripción de Cargo siguiendo SIEMPRE la plantilla corporativa
de 12 secciones (nunca uses otro formato):

1. Identificación del Cargo: nombre del cargo, departamento, sección/área,
   cargo de reporte funcional, cargo de reporte disciplinario.
2. Dimensiones: cargos que le reportan (directos e indirectos, con cantidad),
   dimensiones financieras y no financieras.
3. Finalidad del Cargo: una descripción breve del propósito general del puesto.
4. Responsabilidades del Cargo: lista de funciones en formato "¿Qué hace?" / "¿Para qué?"
   (normalmente entre 8 y 17 filas para cargos de gerencia/jefatura, menos para cargos operativos).
5. Perfil del Cargo: formación profesional, estudios de postgrado (si aplica),
   conocimientos específicos, idiomas, años de experiencia requeridos.
6. Relaciones Internas y Externas: con quién (cargo/departamento) y para qué,
   separado en internas y externas.
7. Naturaleza de la Responsabilidad: decisiones (libertad para actuar del cargo) y propuestas.
8. Indicadores: macroproceso, proceso e indicador asociado (2 a 4 filas típicamente).
9. Competencias: ESTA SECCIÓN ES FIJA POR NIVEL DE CARGO, no la generes tú ni la preguntes
   al usuario — el sistema la agrega automáticamente según el nivel:
   - Cargos de GERENTE o JEFE (cualquier variante: Gerente de X, Jefe de X, Director, etc.):
     competencias GERENCIALES (Orientación al logro de objetivos, Visión Estratégica,
     Habilidades de Negociación, Desarrollo de Otros).
   - El resto de los cargos (Coordinador, Analista, Supervisor, Asistente, Asesor, etc.):
     competencias COMERCIALES (Dominio Comercial, Planificación y Organización, Adaptabilidad,
     Impacto e Influencia, Orientación al Cliente, Pensamiento Analítico).
   Tú solo debes CLASIFICAR el nivel según el nombre del cargo (nunca preguntes esto al usuario,
   decídelo tú mismo a partir del nombre del cargo) y reportarlo en el JSON final como
   "nivel_competencias": "gerencial" o "comercial".
10. Condiciones de Trabajo: breve descripción (oficina, viajes, turnos, etc.).
11. Medidas de Seguridad a Observar: breve descripción de normativas aplicables.
12. Otros Roles / Documentos de Referencia: notas adicionales si aplica
    (el Glosario corporativo se agrega siempre automáticamente, no lo preguntes).

REGLAS DE CONVERSACIÓN:
- Responde siempre en español, de forma cercana pero profesional.
- Empieza preguntando el nombre del cargo si aún no lo tienes.
- Haz una o dos preguntas concretas a la vez, nunca las 12 secciones de golpe.
- Si el usuario da varios datos en un solo mensaje, regístralos todos y sigue con lo que falte.
- Puedes sugerir contenido razonable (ej. relaciones internas típicas, indicadores comunes para
  ese tipo de cargo) para agilizar, pero siempre dejando que el usuario confirme o ajuste.
- No preguntes por Competencias ni por el Glosario de Documentos de Referencia: son fijos.
- Cuando tengas al menos: nombre del cargo, departamento, finalidad y 4-5 responsabilidades,
  avisa al usuario que ya puede pedirte generar el documento (botón "Generar Documento").
- Nunca generes el documento final durante la conversación normal.
`;

const FINALIZE_INSTRUCTION = `
Con toda la información recopilada en la conversación, devuelve EXCLUSIVAMENTE un objeto JSON
(sin texto adicional, sin markdown, sin backticks) con esta forma exacta:

{
  "nombre_cargo": string,
  "departamento": string,
  "seccion_area": string,
  "reporte_funcional": string,
  "reporte_disciplinario": string,
  "cargos_directos": [{ "cargo": string, "cantidad": string }],
  "cargos_indirectos": [{ "cargo": string, "cantidad": string }],
  "dimension_financiera": string,
  "dimension_no_financiera": string,
  "finalidad": string,
  "responsabilidades": [{ "que_hace": string, "para_que": string }],
  "formacion_profesional": string,
  "estudios_postgrado": string,
  "conocimientos_especificos": string,
  "idiomas": string,
  "experiencia": string,
  "relaciones_internas": [{ "con_quien": string, "para_que": string }],
  "relaciones_externas": [{ "con_quien": string, "para_que": string }],
  "decisiones": string,
  "propuestas": string,
  "indicadores": [{ "macroproceso": string, "proceso": string, "indicador": string }],
  "nivel_competencias": "gerencial" | "comercial",
  "condiciones_trabajo": string,
  "medidas_seguridad": string,
  "otros_roles": string
}

Usa cadena vacía "" o arreglo vacío [] para cualquier dato que no se haya conversado.
No incluyas el contenido de la sección de Competencias ni de Documentos de Referencia (se agregan
aparte según "nivel_competencias"), solo clasifica correctamente ese campo.
`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildGeminiContents(messages: ChatMessage[]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

const RETRYABLE_STATUS = new Set([429, 503]);
const MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(
  systemInstruction: string,
  messages: ChatMessage[],
  apiKey: string,
  jsonMode: boolean,
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
  const generationConfig: Record<string, unknown> = { temperature: jsonMode ? 0.3 : 0.6 };
  if (jsonMode) generationConfig.responseMimeType = "application/json";

  let lastErrText = "";
  let lastStatus = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: buildGeminiContents(messages),
        generationConfig,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
      if (!text) throw new Error("Gemini no devolvió contenido.");
      return text;
    }

    lastStatus = res.status;
    lastErrText = await res.text();

    if (!RETRYABLE_STATUS.has(res.status) || attempt === MAX_ATTEMPTS) {
      throw new Error(`Gemini API error (${res.status}): ${lastErrText}`);
    }

    await sleep(attempt * 1000);
  }

  throw new Error(`Gemini API error (${lastStatus}): ${lastErrText}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Falta configurar el secreto GEMINI_API_KEY en Supabase." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { messages, mode } = await req.json() as { messages: ChatMessage[]; mode?: "chat" | "finalize" };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Se requiere el historial de la conversación (messages)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isFinalize = mode === "finalize";
    const systemInstruction = isFinalize
      ? SKILL_SYSTEM_PROMPT + "\n\n" + FINALIZE_INSTRUCTION
      : SKILL_SYSTEM_PROMPT;

    // Gemini rejects requests whose last turn is "model" — the conversation
    // history always ends with the assistant's last reply at this point, so
    // finalize needs an explicit trailing user turn to trigger generation.
    const conversation = isFinalize
      ? [...messages, { role: "user" as const, content: "Genera ahora el documento final en el formato JSON indicado." }]
      : messages;

    const answer = await callGemini(systemInstruction, conversation, apiKey, isFinalize);

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-skill-document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error interno." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
