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

  return fallback;
}
