
-- 1. Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'colaborador';

-- 2. Extend profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Migrate full_name to first_name/last_name (simple split)
UPDATE public.profiles 
SET 
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE WHEN position(' ' in full_name) > 0 THEN substring(full_name from position(' ' in full_name) + 1) ELSE '' END
WHERE first_name = '' AND last_name = '' AND full_name <> '';

-- 3. Extend user_roles table
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS silo silo_type,
ADD COLUMN IF NOT EXISTS department TEXT;

-- 4. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, username)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''), 
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  -- Default role: colaborador
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador');
  RETURN NEW;
END;
$$;

-- 5. RLS for user management
-- Only admins can manage all profiles/roles
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
) WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- Note: "Users can read all profiles" already exists from initial migration.
-- Note: "Admins can manage roles" already exists for user_roles.
