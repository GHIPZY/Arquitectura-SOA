import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

export default {
  fetch: async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "content-type, authorization",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verificar si la IP está bloqueada
    const { data: intento } = await supabaseAdmin
      .from("intentos_login")
      .select("intentos, bloqueado_hasta")
      .eq("ip", ip)
      .maybeSingle();

    if (intento?.bloqueado_hasta) {
      const bloqueadoHasta = new Date(intento.bloqueado_hasta);
      if (bloqueadoHasta > new Date()) {
        return Response.json(
          {
            error: "bloqueado",
            bloqueado_hasta: bloqueadoHasta.toISOString(),
          },
          { status: 429, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }
    }

    // Leer credenciales
    let email: string;
    let password: string;
    try {
      const body = await req.json();
      email = body.email;
      password = body.password;
    } catch {
      return Response.json(
        { error: "Cuerpo de solicitud inválido." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (!email || !password) {
      return Response.json(
        { error: "Email y contraseña son requeridos." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Intentar autenticación con Supabase Auth
    const supabasePublic = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: authData, error: authError } =
      await supabasePublic.auth.signInWithPassword({ email, password });

    // Login fallido — registrar intento
    if (authError || !authData.user) {
      const intentosActuales = (intento?.intentos ?? 0) + 1;
      const bloqueadoHasta =
        intentosActuales >= MAX_INTENTOS
          ? new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000).toISOString()
          : null;

      await supabaseAdmin.from("intentos_login").upsert({
        ip,
        intentos: intentosActuales,
        bloqueado_hasta: bloqueadoHasta,
        ultimo_intento: new Date().toISOString(),
      });

      const intentosRestantes = Math.max(0, MAX_INTENTOS - intentosActuales);
      const bloqueadoHastaTs = bloqueadoHasta
        ? new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000).toISOString()
        : null;

      return Response.json(
        {
          error: intentosActuales >= MAX_INTENTOS ? "bloqueado" : "credenciales",
          intentos_usados: intentosActuales,
          intentos_restantes: intentosRestantes,
          max_intentos: MAX_INTENTOS,
          bloqueado_hasta: bloqueadoHastaTs,
        },
        { status: intentosActuales >= MAX_INTENTOS ? 429 : 401, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Login exitoso — resetear intentos
    await supabaseAdmin
      .from("intentos_login")
      .delete()
      .eq("ip", ip);

    // Obtener rol del usuario
    const { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("rol")
      .eq("id", authData.user.id)
      .single();

    return Response.json(
      {
        session: authData.session,
        rol: usuario?.rol ?? null,
      },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  },
};
