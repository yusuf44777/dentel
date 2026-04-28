export function getTurkishErrorMessage(
  error: unknown,
  fallback = "Bir hata oluştu. Lütfen tekrar deneyin."
) {
  const rawMessage =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";

  if (!rawMessage) return fallback;

  const message = rawMessage.toLowerCase();

  if (message.includes("sunucu ortam değişkenleri eksik")) {
    return "Drive yükleme ayarları eksik. Supabase Function secret değerlerini kontrol et.";
  }
  if (message.includes("google access token") || message.includes("invalid_grant")) {
    return "Google Drive bağlantısı doğrulanamadı. Refresh token veya OAuth bilgilerini yenile.";
  }
  if (message.includes("drive dosyası") || message.includes("google drive")) {
    return rawMessage;
  }
  if (
    message.includes("drive_file_id") ||
    message.includes("storage_path") ||
    message.includes("storage_provider")
  ) {
    return "Drive metadata kolonları veritabanında eksik görünüyor. Supabase migration'larını çalıştır.";
  }
  if (message.includes("row-level security") || message.includes("violates row-level")) {
    return "Bu işlem için yetki doğrulaması başarısız oldu. Çıkış yapıp tekrar giriş yapmayı dene.";
  }
  if (message.includes("invalid login credentials")) {
    return "E-posta veya şifre hatalı.";
  }
  if (message.includes("email not confirmed")) {
    return "Giriş yapmadan önce e-posta adresini doğrulamalısın.";
  }
  if (message.includes("user already registered")) {
    return "Bu e-posta adresiyle zaten bir hesap var.";
  }
  if (message.includes("password should be at least")) {
    return "Şifre en az 6 karakter olmalıdır.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "İnternet bağlantını kontrol edip tekrar dene.";
  }
  if (message.includes("rate limit")) {
    return "Çok fazla deneme yaptın. Lütfen biraz sonra tekrar dene.";
  }
  if (rawMessage.includes("requestId:") || /[çğıöşüİ]/.test(rawMessage)) {
    return rawMessage;
  }

  return fallback;
}
