-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  silo TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'Alineación',
  planned_progress NUMERIC NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  description TEXT,
  goal TEXT,
  specific_goals TEXT[],
  responsible TEXT,
  priority TEXT,
  kickoff_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create project_tasks table
CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'Alineación',
  weight NUMERIC NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Pendiente',
  actual_progress NUMERIC NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for projects
CREATE POLICY "Allow all authenticated users to select projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for project_tasks
CREATE POLICY "Allow all authenticated users to select project_tasks"
  ON project_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert project_tasks"
  ON project_tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update project_tasks"
  ON project_tasks FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to delete project_tasks"
  ON project_tasks FOR DELETE
  TO authenticated
  USING (true);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_tasks_updated_at
    BEFORE UPDATE ON project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
