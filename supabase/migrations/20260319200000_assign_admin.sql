
-- Assign 'admin' role to aojeda@mayoreo.biz
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'aojeda@mayoreo.biz'
ON CONFLICT (user_id, role) DO NOTHING;
