import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotifyEventType = "favorite_added" | "listing_marked_sold" | "report_submitted";

type NotifyPayload = {
  eventType: NotifyEventType;
  recipientUserId: string;
  listingId?: string | null;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Yalnızca POST desteklenir." }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Sunucu ortam değişkenleri eksik." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Yetkisiz istek." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Kullanıcı doğrulanamadı." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let payload: NotifyPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Geçersiz JSON gövdesi." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!payload?.recipientUserId || !payload?.eventType || !payload?.title || !payload?.body) {
    return new Response(JSON.stringify({ error: "Zorunlu alanlar eksik." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: notificationRow, error: notificationError } = await adminClient
    .from("notifications")
    .insert({
      user_id: payload.recipientUserId,
      actor_user_id: user.id,
      listing_id: payload.listingId ?? null,
      event_type: payload.eventType,
      title: payload.title,
      body: payload.body,
      metadata: payload.metadata ?? {},
    })
    .select("id")
    .single();

  if (notificationError) {
    return new Response(JSON.stringify({ error: notificationError.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: settingsRow } = await adminClient
    .from("user_settings")
    .select("push_enabled")
    .eq("user_id", payload.recipientUserId)
    .maybeSingle();

  if (settingsRow?.push_enabled === false) {
    return new Response(
      JSON.stringify({
        success: true,
        notificationId: notificationRow.id,
        sentPushCount: 0,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  const { data: tokens } = await adminClient
    .from("push_tokens")
    .select("token")
    .eq("user_id", payload.recipientUserId)
    .eq("enabled", true);

  const pushMessages = (tokens ?? [])
    .map((row) => row.token)
    .filter(Boolean)
    .map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: {
        notificationId: notificationRow.id,
        listingId: payload.listingId ?? null,
        eventType: payload.eventType,
        ...payload.metadata,
      },
      sound: "default",
      priority: "high",
    }));

  if (pushMessages.length > 0) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pushMessages),
    }).catch(() => null);
  }

  return new Response(
    JSON.stringify({
      success: true,
      notificationId: notificationRow.id,
      sentPushCount: pushMessages.length,
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    }
  );
});
