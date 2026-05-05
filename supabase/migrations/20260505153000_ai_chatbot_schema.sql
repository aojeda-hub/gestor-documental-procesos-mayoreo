-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla 1: knowledge_base (para memoria institucional)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- texto completo del documento
  category TEXT, -- 'cultura', 'valores', 'liderazgo', 'mejora_continua'
  embedding VECTOR(768), -- para búsqueda semántica con Gemini
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla 2: chat_logs (para historial)
CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  user_email TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  context_used JSONB, -- qué datos consultó (ej. documentos, proyectos)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- knowledge_base: SELECT para todos los usuarios autenticados
CREATE POLICY "Allow authenticated select on knowledge_base" 
ON knowledge_base FOR SELECT 
TO authenticated 
USING (true);

-- chat_logs: INSERT para todos los autenticados
CREATE POLICY "Allow authenticated insert on chat_logs" 
ON chat_logs FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- chat_logs: SELECT solo para admins
-- Nota: Asumiendo que existe una forma de identificar admins en profiles o rbac
-- Usaremos una verificación común en este proyecto
CREATE POLICY "Allow admin select on chat_logs" 
ON chat_logs FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (profiles.silo = 'admin' OR auth.jwt() ->> 'role' = 'admin')
  )
);
