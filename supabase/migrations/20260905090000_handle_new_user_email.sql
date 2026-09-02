-- El trigger de alta de usuario nunca guardaba el correo real (el que se usa
-- para iniciar sesion, sea Google u otro proveedor) en public.profiles.email
-- -- quedaba en NULL, y la pantalla de Usuarios terminaba inventando un
-- correo de reemplazo (patron "nombre.apellido@mayoreo.biz") que no coincide
-- con la convencion real de la empresa (primera inicial + apellido).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  -- Default role: viewer
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$function$;

-- Backfill: usuarios que ya existian con profiles.email vacio, usando el
-- correo real con el que iniciaron sesion.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL AND u.email IS NOT NULL;
