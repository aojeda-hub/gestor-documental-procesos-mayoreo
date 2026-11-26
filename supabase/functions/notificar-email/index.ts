// Entrega al Apps Script de correo (apps-script.gs en esta carpeta) los avisos
// de la campanita que todavía no se mandaron por email, y anota los envíos que
// fallaron. Autenticada con el header x-sync-secret (NOTIF_EMAIL_SECRET).
//
//   POST ?mode=pendientes  -> { ok, avisos: [{ id, email, nombre, tipo, titulo, mensaje, link, created_at }] }
//   POST ?mode=errores     <- { errores: [{ id, error }] }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET = Deno.env.get("NOTIF_EMAIL_SECRET");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  try {
    if (!SECRET || req.headers.get("x-sync-secret") !== SECRET) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const modo = new URL(req.url).searchParams.get("mode");

    if (modo === "pendientes") {
      const { data, error } = await supabase.rpc("notificaciones_email_tomar", { p_limite: 200 });
      if (error) throw error;
      return json({ ok: true, avisos: data || [] });
    }

    if (modo === "errores") {
      const body = await req.json().catch(() => ({}));
      const errores: { id: string; error: string }[] = body.errores || [];
      for (const e of errores) {
        const { error } = await supabase.from("notificaciones")
          .update({ email_error: String(e.error || "").slice(0, 500) }).eq("id", e.id);
        if (error) throw error;
      }
      return json({ ok: true, registrados: errores.length });
    }

    return json({ error: "modo desconocido" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
