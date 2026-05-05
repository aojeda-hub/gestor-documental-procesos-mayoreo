UPDATE public.profiles SET email='yloreto@mayoreo.biz', silo='procesos' WHERE user_id='40412c0c-71f2-4143-a816-65f64f61fc63';
DELETE FROM public.user_roles WHERE user_id='40412c0c-71f2-4143-a816-65f64f61fc63';
INSERT INTO public.user_roles (user_id, role) VALUES ('40412c0c-71f2-4143-a816-65f64f61fc63','responsable_metodos');
INSERT INTO public.user_silos (user_id, silo) VALUES ('40412c0c-71f2-4143-a816-65f64f61fc63','procesos') ON CONFLICT (user_id, silo) DO NOTHING;