DROP POLICY IF EXISTS "Owner or admin view seguimientos" ON public.seguimientos;

CREATE POLICY "Users view own seguimientos"
ON public.seguimientos
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);