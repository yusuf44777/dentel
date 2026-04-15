import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type UploadPayload = {
  listingId: string;
  index: number;
  imageBase64: string;
  mimeType: string;
  fileName?: string;
};

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function decodeBase64(base64: string) {
  const normalized = base64
    .replace(/^data:.*;base64,/, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function detectExtension(payload: UploadPayload) {
  const fileNameExt = payload.fileName?.split(".").pop()?.toLowerCase() ?? "";
  const mimeExt = payload.mimeType.split("/").pop()?.toLowerCase() ?? "";
  const candidate = fileNameExt || mimeExt || "jpg";
  const safe = candidate.replace(/[^a-z0-9]/g, "");
  return safe || "jpg";
}

function normalizeFolderId(value: string) {
  const raw = value.trim();
  if (!raw) return raw;

  // Accept either plain folder id or full Drive folder URL.
  const fromPath = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1];
  if (fromPath) return fromPath;

  try {
    const url = new URL(raw);
    const idFromQuery = url.searchParams.get("id");
    if (idFromQuery) return idFromQuery;
  } catch {
    // Not a URL, assume raw folder id.
  }

  return raw;
}

async function getDriveAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      refresh_token: input.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenJson = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenJson?.access_token) {
    throw new Error(tokenJson?.error_description ?? "Google access token alınamadı.");
  }

  return tokenJson.access_token as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Yalnızca POST desteklenir." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization");

  const googleClientId = Deno.env.get("GOOGLE_DRIVE_OAUTH_CLIENT_ID");
  const googleClientSecret = Deno.env.get("GOOGLE_DRIVE_OAUTH_CLIENT_SECRET");
  const googleRefreshToken = Deno.env.get("GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN");
  const googleFolderId = normalizeFolderId(Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") ?? "");

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !googleClientId ||
    !googleClientSecret ||
    !googleRefreshToken ||
    !googleFolderId
  ) {
    return jsonResponse(500, { error: "Sunucu ortam değişkenleri eksik." });
  }

  if (!authHeader) {
    return jsonResponse(401, { error: "Yetkisiz istek." });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse(401, { error: "Kullanıcı doğrulanamadı." });
  }

  let payload: UploadPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Geçersiz JSON gövdesi." });
  }

  if (
    !payload?.listingId ||
    !payload?.imageBase64 ||
    !payload?.mimeType ||
    typeof payload.index !== "number"
  ) {
    return jsonResponse(400, { error: "Zorunlu alanlar eksik." });
  }

  if (!payload.mimeType.startsWith("image/")) {
    return jsonResponse(400, { error: "Yalnızca görsel dosyaları yüklenebilir." });
  }

  if (!Number.isInteger(payload.index) || payload.index < 0 || payload.index > 32) {
    return jsonResponse(400, { error: "Geçersiz fotoğraf sırası." });
  }

  let createdFileId: string | null = null;
  let driveAccessToken: string | null = null;

  try {
    const bytes = decodeBase64(payload.imageBase64);
    const maxBytes = 12 * 1024 * 1024;
    if (bytes.byteLength > maxBytes) {
      return jsonResponse(413, { error: "Fotoğraf boyutu çok büyük (maks. 12MB)." });
    }

    driveAccessToken = await getDriveAccessToken({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      refreshToken: googleRefreshToken,
    });

    const ext = detectExtension(payload);
    const storagePath = `listings/${user.id}/${payload.listingId}/${payload.index}.${ext}`;
    const driveFileName = `${user.id}_${payload.listingId}_${payload.index}.${ext}`;

    const createResponse = await fetch(
      "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,webViewLink,name,parents",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${driveAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: driveFileName,
          parents: [googleFolderId],
          appProperties: {
            storage_path: storagePath,
            listing_id: payload.listingId,
            user_id: user.id,
            photo_index: String(payload.index),
          },
        }),
      }
    );

    const createJson = await createResponse.json();
    if (!createResponse.ok || !createJson?.id) {
      throw new Error(createJson?.error?.message ?? "Drive dosyası oluşturulamadı.");
    }

    const fileId = createJson.id as string;
    createdFileId = fileId;

    const mediaResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&supportsAllDrives=true`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${driveAccessToken}`,
          "Content-Type": payload.mimeType,
        },
        body: bytes,
      }
    );

    if (!mediaResponse.ok) {
      const mediaJson = await mediaResponse.json().catch(() => ({}));
      throw new Error(mediaJson?.error?.message ?? "Drive dosyası yüklenemedi.");
    }

    const permissionResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${driveAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone",
        }),
      }
    );

    if (!permissionResponse.ok) {
      const permissionJson = await permissionResponse.json().catch(() => ({}));
      throw new Error(permissionJson?.error?.message ?? "Drive dosyası public yapılamadı.");
    }

    const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    return jsonResponse(200, {
      success: true,
      fileId,
      storagePath,
      publicUrl,
      driveViewUrl: createJson.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
      folderId: googleFolderId,
    });
  } catch (error) {
    if (createdFileId && driveAccessToken) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${createdFileId}?supportsAllDrives=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${driveAccessToken}` },
      }).catch(() => null);
    }

    const message = error instanceof Error ? error.message : "Fotoğraf yüklenemedi.";
    return jsonResponse(500, { error: message });
  }
});
