import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type UploadPayload = {
  action?: "upload";
  listingId: string;
  index: number;
  imageBase64: string;
  mimeType: string;
  fileName?: string;
};

type DeletePayload = {
  action: "delete";
  fileIds: string[];
};

type DriveFileMetadata = {
  id: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  name?: string;
  parents?: string[];
  appProperties?: Record<string, string>;
};

const DRIVE_FILE_FIELDS =
  "id,webViewLink,webContentLink,thumbnailLink,name,parents,appProperties";

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
  const mimeExt = payload.mimeType.split("/").pop()?.toLowerCase() ?? "";
  const fileNameExt = payload.fileName?.split(".").pop()?.toLowerCase() ?? "";
  const candidate = mimeExt || fileNameExt || "jpg";
  const safe = candidate.replace(/[^a-z0-9]/g, "");
  if (!safe || safe === "jpeg") return "jpg";
  return safe;
}

function normalizeMimeType(mimeType: string) {
  const normalized = mimeType.trim().toLowerCase();
  return normalized === "image/jpg" ? "image/jpeg" : normalized;
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

async function readResponseBody(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: { message: text } };
  }
}

function googleErrorMessage(payload: Record<string, unknown>, fallback: string) {
  const error = payload.error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  const description = payload.error_description;
  if (typeof description === "string" && description.trim()) return description;

  return fallback;
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

  const tokenJson = await readResponseBody(tokenResponse);
  if (!tokenResponse.ok || !tokenJson?.access_token) {
    throw new Error(googleErrorMessage(tokenJson, "Google access token alınamadı."));
  }

  return tokenJson.access_token as string;
}

function createDrivePublicUrl(fileId: string) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

function createMultipartUploadBody(input: {
  metadata: Record<string, unknown>;
  bytes: Uint8Array;
  mimeType: string;
}) {
  const boundary = `dentel_${crypto.randomUUID().replace(/-/g, "")}`;
  const metadata = JSON.stringify(input.metadata);
  const body = new Blob([
    `--${boundary}\r\n`,
    "Content-Type: application/json; charset=UTF-8\r\n\r\n",
    metadata,
    `\r\n--${boundary}\r\n`,
    `Content-Type: ${input.mimeType}\r\n\r\n`,
    input.bytes,
    `\r\n--${boundary}--\r\n`,
  ]);

  return {
    body,
    contentType: `multipart/related; boundary=${boundary}`,
  };
}

async function fetchDriveMetadata(input: {
  accessToken: string;
  fileId: string;
}) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(input.fileId)}?supportsAllDrives=true&fields=${encodeURIComponent(DRIVE_FILE_FIELDS)}`,
    {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    }
  );

  const json = await readResponseBody(response);
  if (!response.ok || !json?.id) {
    throw new Error(googleErrorMessage(json, "Drive dosya bilgisi alınamadı."));
  }

  return json as DriveFileMetadata;
}

async function deleteDriveFile(input: {
  accessToken: string;
  fileId: string;
}) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(input.fileId)}?supportsAllDrives=true`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${input.accessToken}` },
    }
  );

  if (!response.ok && response.status !== 404) {
    const json = await readResponseBody(response);
    throw new Error(googleErrorMessage(json, "Drive dosyası silinemedi."));
  }
}

async function handleDeletePayload(input: {
  payload: DeletePayload;
  accessToken: string;
  userId: string;
  requestId: string;
}) {
  if (!Array.isArray(input.payload.fileIds)) {
    return jsonResponse(400, {
      error: "Temizlenecek Drive dosya listesi geçersiz.",
      requestId: input.requestId,
    });
  }

  const fileIds = Array.from(
    new Set(
      input.payload.fileIds
        .filter((fileId) => typeof fileId === "string")
        .map((fileId) => fileId.trim())
        .filter((fileId) => /^[A-Za-z0-9_-]+$/.test(fileId))
    )
  );

  if (fileIds.length === 0 || fileIds.length > 16) {
    return jsonResponse(400, {
      error: "Temizlenecek Drive dosya listesi geçersiz.",
      requestId: input.requestId,
    });
  }

  const deleted: string[] = [];
  const skipped: string[] = [];

  for (const fileId of fileIds) {
    const metadata = await fetchDriveMetadata({
      accessToken: input.accessToken,
      fileId,
    });

    if (metadata.appProperties?.user_id !== input.userId) {
      skipped.push(fileId);
      continue;
    }

    await deleteDriveFile({
      accessToken: input.accessToken,
      fileId,
    });
    deleted.push(fileId);
  }

  return jsonResponse(200, {
    success: true,
    deleted,
    skipped,
    requestId: input.requestId,
  });
}

async function ensureVerifiedProfile(input: {
  userClient: ReturnType<typeof createClient>;
  userId: string;
  requestId: string;
}) {
  const { data, error } = await input.userClient
    .from("profiles")
    .select("student_document_verified")
    .eq("id", input.userId)
    .maybeSingle();

  if (error) {
    console.log(
      JSON.stringify({
        level: "error",
        event: "upload_listing_image_profile_check_failed",
        requestId: input.requestId,
        userId: input.userId,
        message: error.message,
      })
    );

    return jsonResponse(403, {
      error: "Öğrenci belge doğrulaması kontrol edilemedi.",
      requestId: input.requestId,
    });
  }

  if (data?.student_document_verified !== true) {
    return jsonResponse(403, {
      error: "Fotoğraf yüklemek için öğrenci belgesi doğrulanmış olmalıdır.",
      requestId: input.requestId,
    });
  }

  return null;
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();

  console.log(
    JSON.stringify({
      level: "info",
      event: "upload_listing_image_request_received",
      requestId,
      method: req.method,
    })
  );

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      error: "Yalnızca POST desteklenir.",
      requestId,
    });
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
    console.log(
      JSON.stringify({
        level: "error",
        event: "upload_listing_image_missing_env",
        requestId,
      })
    );

    return jsonResponse(500, {
      error: "Sunucu ortam değişkenleri eksik.",
      requestId,
    });
  }

  if (!authHeader) {
    return jsonResponse(401, { error: "Yetkisiz istek.", requestId });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse(401, {
      error: "Kullanıcı doğrulanamadı.",
      requestId,
    });
  }

  let driveAccessToken: string | null = null;
  let payload: UploadPayload | DeletePayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, {
      error: "Geçersiz JSON gövdesi.",
      requestId,
    });
  }

  if (!payload || typeof payload !== "object") {
    return jsonResponse(400, {
      error: "Geçersiz istek gövdesi.",
      requestId,
    });
  }

  if (payload.action === "delete") {
    try {
      driveAccessToken = await getDriveAccessToken({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        refreshToken: googleRefreshToken,
      });

      return await handleDeletePayload({
        payload,
        accessToken: driveAccessToken,
        userId: user.id,
        requestId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Drive dosyaları temizlenemedi.";
      console.log(
        JSON.stringify({
          level: "error",
          event: "upload_listing_image_cleanup_error",
          requestId,
          message,
        })
      );

      return jsonResponse(500, { error: message, requestId });
    }
  }

  if (
    !payload?.listingId ||
    !payload?.imageBase64 ||
    !payload?.mimeType ||
    typeof payload.index !== "number"
  ) {
    return jsonResponse(400, { error: "Zorunlu alanlar eksik.", requestId });
  }

  const verificationError = await ensureVerifiedProfile({
    userClient,
    userId: user.id,
    requestId,
  });
  if (verificationError) return verificationError;

  payload.mimeType = normalizeMimeType(payload.mimeType);

  if (!payload.mimeType.startsWith("image/")) {
    return jsonResponse(400, {
      error: "Yalnızca görsel dosyaları yüklenebilir.",
      requestId,
    });
  }

  if (!Number.isInteger(payload.index) || payload.index < 0 || payload.index > 32) {
    return jsonResponse(400, { error: "Geçersiz fotoğraf sırası.", requestId });
  }

  let createdFileId: string | null = null;

  try {
    const bytes = decodeBase64(payload.imageBase64);
    const maxBytes = 12 * 1024 * 1024;
    if (bytes.byteLength > maxBytes) {
      return jsonResponse(413, {
        error: "Fotoğraf boyutu çok büyük (maks. 12MB).",
        requestId,
      });
    }

    console.log(
      JSON.stringify({
        level: "info",
        event: "upload_listing_image_validated",
        requestId,
        userId: user.id,
        listingId: payload.listingId,
        index: payload.index,
        mimeType: payload.mimeType,
        bytes: bytes.byteLength,
      })
    );

    driveAccessToken = await getDriveAccessToken({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      refreshToken: googleRefreshToken,
    });

    const ext = detectExtension(payload);
    const storagePath = `listings/${user.id}/${payload.listingId}/${payload.index}.${ext}`;
    const driveFileName = `${user.id}_${payload.listingId}_${payload.index}.${ext}`;

    const metadata = {
      name: driveFileName,
      parents: [googleFolderId],
      appProperties: {
        storage_path: storagePath,
        listing_id: payload.listingId,
        user_id: user.id,
        photo_index: String(payload.index),
      },
    };
    const multipart = createMultipartUploadBody({
      metadata,
      bytes,
      mimeType: payload.mimeType,
    });

    const createResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=${encodeURIComponent(DRIVE_FILE_FIELDS)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${driveAccessToken}`,
          "Content-Type": multipart.contentType,
        },
        body: multipart.body,
      }
    );

    const createJson = await readResponseBody(createResponse);
    if (!createResponse.ok || !createJson?.id) {
      throw new Error(googleErrorMessage(createJson, "Drive dosyası yüklenemedi."));
    }

    const fileId = createJson.id as string;
    createdFileId = fileId;

    console.log(
      JSON.stringify({
        level: "info",
        event: "upload_listing_image_drive_file_created",
        requestId,
        fileId,
        folderId: googleFolderId,
      })
    );

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
      const permissionJson = await readResponseBody(permissionResponse);
      throw new Error(googleErrorMessage(permissionJson, "Drive dosyası public yapılamadı."));
    }

    const fileMetadata = await fetchDriveMetadata({
      accessToken: driveAccessToken,
      fileId,
    }).catch((error) => {
      console.log(
        JSON.stringify({
          level: "warn",
          event: "upload_listing_image_metadata_refresh_failed",
          requestId,
          fileId,
          message: error instanceof Error ? error.message : "Metadata alınamadı.",
        })
      );

      return createJson as DriveFileMetadata;
    });
    const publicUrl = createDrivePublicUrl(fileId);
    console.log(
      JSON.stringify({
        level: "info",
        event: "upload_listing_image_success",
        requestId,
        fileId,
        storagePath,
      })
    );

    return jsonResponse(200, {
      success: true,
      fileId,
      storagePath,
      publicUrl,
      driveViewUrl: fileMetadata.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
      webContentLink: fileMetadata.webContentLink ?? null,
      thumbnailLink: fileMetadata.thumbnailLink ?? null,
      folderId: googleFolderId,
      requestId,
    });
  } catch (error) {
    if (createdFileId && driveAccessToken) {
      await deleteDriveFile({
        accessToken: driveAccessToken,
        fileId: createdFileId,
      }).catch(() => null);
    }

    const message = error instanceof Error ? error.message : "Fotoğraf yüklenemedi.";
    console.log(
      JSON.stringify({
        level: "error",
        event: "upload_listing_image_error",
        requestId,
        message,
      })
    );

    return jsonResponse(500, { error: message, requestId });
  }
});
