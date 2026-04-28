import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../../lib/supabase";
import { getTurkishErrorMessage } from "../../lib/error-messages";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { BrandMark } from "../../components/BrandMark";
import { Colors } from "../../constants/colors";

const ALLOWED_DOMAIN = "st.uskudar.edu.tr";
const STUDENT_DOCUMENT_URL = "https://www.turkiye.gov.tr/yok-ogrenci-belgesi-sorgulama";
const STUDENT_VERIFIER_URL =
  process.env.EXPO_PUBLIC_STUDENT_VERIFIER_URL ??
  "https://restasismed-dentel-yok-belge-dogrulama.hf.space";

const YEARS = [
  { label: "Hazırlık", value: "prep" },
  { label: "1. Sınıf", value: "1" },
  { label: "2. Sınıf", value: "2" },
  { label: "3. Sınıf", value: "3" },
  { label: "4. Sınıf", value: "4" },
  { label: "5. Sınıf", value: "5" },
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const authEmailRedirectTo =
    process.env.EXPO_PUBLIC_AUTH_EMAIL_REDIRECT_TO ?? Linking.createURL("/auth/callback");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [year, setYear] = useState<string | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [studentDocument, setStudentDocument] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [verificationInfo, setVerificationInfo] = useState<{
    barcode?: string;
    tcMasked?: string | null;
  } | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  function validate() {
    if (!fullName.trim()) return "Lütfen adınızı girin.";
    if (!email.trim()) return "Lütfen e-posta adresinizi girin.";
    const emailLower = email.trim().toLowerCase();
    if (!emailLower.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return `Yalnızca @${ALLOWED_DOMAIN} e-posta adresleri kabul edilmektedir.`;
    }
    if (!year) return "Lütfen sınıfınızı seçin.";
    const phone = whatsapp.trim().replace(/\D/g, "");
    if (!phone || phone.length < 10) return "Geçerli bir WhatsApp numarası girin.";
    if (password.length < 6) return "Şifre en az 6 karakter olmalıdır.";
    if (password !== confirmPassword) return "Şifreler eşleşmiyor.";
    if (!studentDocument) return "e-Devlet öğrenci belgesini PDF olarak yüklemelisin.";
    return null;
  }

  async function openStudentDocumentSource() {
    await Linking.openURL(STUDENT_DOCUMENT_URL);
  }

  async function pickStudentDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;

    if (asset.size && asset.size > 20 * 1024 * 1024) {
      setError("Öğrenci belgesi 20 MB'dan büyük olamaz.");
      return;
    }

    setStudentDocument(asset);
    setVerificationInfo(null);
    setError(null);
  }

  async function verifyStudentDocument() {
    if (!studentDocument) {
      throw new Error("Öğrenci belgesi PDF'i seçilmedi.");
    }

    const form = new FormData();
    form.append("file", {
      uri: studentDocument.uri,
      name: studentDocument.name || "ogrenci-belgesi.pdf",
      type: studentDocument.mimeType || "application/pdf",
    } as any);

    const response = await fetch(`${STUDENT_VERIFIER_URL.replace(/\/$/, "")}/verify`, {
      method: "POST",
      body: form,
    });

    const data = await response.json().catch(() => null) as {
      detail?: string;
      barcode?: string;
      tc_masked?: string | null;
      result?: {
        valid: boolean | null;
        valid_label?: string;
        error?: string | null;
      };
    } | null;

    if (!response.ok) {
      throw new Error(data?.detail ?? "Öğrenci belgesi doğrulanamadı.");
    }

    if (data?.result?.valid !== true) {
      throw new Error(
        data?.result?.error ??
          "Öğrenci belgesi e-Devlet üzerinde geçerli olarak doğrulanamadı."
      );
    }

    return {
      barcode: data.barcode,
      tcMasked: data.tc_masked,
      label: data.result.valid_label ?? "GERÇEK",
    };
  }

  async function handleRegister() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setInfo(null);
    setVerificationInfo(null);
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const phone = whatsapp.trim().replace(/\D/g, "");
    const whatsappNumber = phone.startsWith("90") ? phone : `90${phone.replace(/^0/, "")}`;
    let verifiedDocument: Awaited<ReturnType<typeof verifyStudentDocument>>;

    try {
      setLoadingMessage("Öğrenci belgesi doğrulanıyor...");
      verifiedDocument = await verifyStudentDocument();
      setVerificationInfo({
        barcode: verifiedDocument.barcode,
        tcMasked: verifiedDocument.tcMasked,
      });
    } catch (err) {
      setError(
        getTurkishErrorMessage(
          err,
          err instanceof Error ? err.message : "Öğrenci belgesi doğrulanamadı."
        )
      );
      setLoading(false);
      setLoadingMessage("");
      return;
    }

    setLoadingMessage("Hesap oluşturuluyor...");
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: authEmailRedirectTo,
        data: {
          full_name: fullName.trim(),
          university_year: year,
          whatsapp: whatsappNumber,
          student_document_verified: true,
          student_document_barcode: verifiedDocument.barcode,
          student_document_tc_masked: verifiedDocument.tcMasked,
          student_document_verified_at: new Date().toISOString(),
        },
      },
    });

    if (signUpError) {
      setError(
        getTurkishErrorMessage(
          signUpError,
          "Kayıt sırasında bir hata oluştu. Bilgilerini kontrol edip tekrar dene."
        )
      );
      setLoading(false);
      setLoadingMessage("");
      return;
    }

    // Update the profile row created by the trigger
    if (data.user) {
      await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          university_year: year,
          whatsapp: whatsappNumber,
          student_document_verified: true,
          student_document_barcode: verifiedDocument.barcode,
          student_document_tc_masked: verifiedDocument.tcMasked,
          student_document_verified_at: new Date().toISOString(),
        })
        .eq("id", data.user.id);
    }

    setRegisteredEmail(normalizedEmail);
    setNeedsEmailVerification(!data.session);
    setSuccess(true);
    setLoading(false);
    setLoadingMessage("");
  }

  async function handleResendConfirmation() {
    if (!registeredEmail) return;
    setResendLoading(true);
    setError(null);
    setInfo(null);

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: registeredEmail,
      options: {
        emailRedirectTo: authEmailRedirectTo,
      },
    });

    if (resendError) {
      setError(
        getTurkishErrorMessage(
          resendError,
          "Doğrulama maili tekrar gönderilemedi. Biraz sonra tekrar dene."
        )
      );
    } else {
      setInfo("Doğrulama maili tekrar gönderildi. Spam klasörünü de kontrol et.");
    }

    setResendLoading(false);
  }

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6">
        <View className="bg-white rounded-2xl p-8 items-center shadow-sm w-full">
          <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
            <Ionicons name="checkmark-circle" size={40} color={Colors.secondary} />
          </View>
          <Text className="text-xl font-bold text-slate-900 mb-2">
            {needsEmailVerification ? "Kayıt Alındı" : "Kayıt Başarılı!"}
          </Text>
          <Text className="text-slate-500 text-sm text-center mb-6">
            {needsEmailVerification
              ? "E-posta doğrulaması gerekiyor. Gelen kutusu ve spam klasörünü kontrol et."
              : "Hesabın oluşturuldu. Giriş ekranından devam edebilirsin."}
          </Text>

          {needsEmailVerification && (
            <Button
              label="Maili Tekrar Gönder"
              onPress={() => {
                void handleResendConfirmation();
              }}
              loading={resendLoading}
              style={{ marginBottom: 12 }}
            />
          )}

          {(info || error) && (
            <View
              className={`w-full rounded-xl border px-4 py-3 mb-4 ${
                error ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
              }`}
            >
              <Text className={`text-sm ${error ? "text-danger" : "text-emerald-700"}`}>
                {error ?? info}
              </Text>
            </View>
          )}

          <Link href="/(auth)/login" asChild>
            <Button label="Giriş Yap" />
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  const selectedYearLabel = YEARS.find((y) => y.value === year)?.label;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="px-6 pt-12 pb-8">
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <BrandMark size={36} />
              <Text className="text-4xl font-bold text-primary tracking-tight">
                dentel
              </Text>
            </View>
            <Text className="text-slate-500 mt-2 text-base">
              Üsküdar Üniversitesi Diş Hekimliği
            </Text>
          </View>

          <View className="flex-1 px-6">
            <Text className="text-2xl font-bold text-slate-900 mb-1">
              Kayıt Ol
            </Text>
            <Text className="text-slate-500 mb-6 text-sm">
              Üniversite e-postanla ücretsiz hesap oluştur.
            </Text>

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            )}

            <Input
              label="Ad Soyad"
              placeholder="Adınız Soyadınız"
              value={fullName}
              onChangeText={setFullName}
              textContentType="name"
              autoCapitalize="words"
            />

            <Input
              label="Üniversite E-postası"
              placeholder={`adiniz@${ALLOWED_DOMAIN}`}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
            />

            {/* Year picker */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 mb-1.5">
                Sınıf
              </Text>
              <Pressable
                onPress={() => setShowYearPicker((v) => !v)}
                className={`flex-row items-center justify-between bg-white border rounded-xl px-4 py-3.5 ${
                  showYearPicker ? "border-primary" : "border-slate-200"
                }`}
              >
                <Text className={selectedYearLabel ? "text-slate-900 text-base" : "text-muted text-base"}>
                  {selectedYearLabel ?? "Sınıfınızı seçin"}
                </Text>
                <Ionicons
                  name={showYearPicker ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.muted}
                />
              </Pressable>

              {showYearPicker && (
                <View className="bg-white border border-slate-200 rounded-xl mt-1 overflow-hidden">
                  {YEARS.map((item, idx) => (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => {
                        setYear(item.value);
                        setShowYearPicker(false);
                      }}
                      className={`px-4 py-3 flex-row items-center justify-between ${
                        idx < YEARS.length - 1 ? "border-b border-slate-100" : ""
                      }`}
                    >
                      <Text className={`text-base ${year === item.value ? "text-primary font-semibold" : "text-slate-800"}`}>
                        {item.label}
                      </Text>
                      {year === item.value && (
                        <Ionicons name="checkmark" size={18} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Input
              label="WhatsApp Numarası"
              placeholder="05XX XXX XX XX"
              value={whatsapp}
              onChangeText={setWhatsapp}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />

            <Input
              label="Şifre"
              placeholder="En az 6 karakter"
              value={password}
              onChangeText={setPassword}
              secureToggle
              textContentType="newPassword"
            />

            <Input
              label="Şifre Tekrar"
              placeholder="Şifrenizi tekrar girin"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureToggle
              textContentType="newPassword"
            />

            <View className="mb-4 bg-white border border-slate-200 rounded-2xl p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-slate-900">
                    e-Devlet Öğrenci Belgesi
                  </Text>
                  <Text className="text-xs text-slate-500 mt-1 leading-5">
                    Belgeyi YÖK Öğrenci Belgesi Sorgulama sayfasından PDF olarak indirip yükle.
                  </Text>
                </View>
                <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primary} />
              </View>

              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity
                  onPress={() => {
                    void openStudentDocumentSource();
                  }}
                  className="flex-1 bg-slate-100 rounded-xl px-3 py-3 flex-row items-center justify-center gap-2"
                >
                  <Ionicons name="open-outline" size={16} color={Colors.text.primary} />
                  <Text className="text-slate-800 text-sm font-semibold">Belgeyi Al</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    void pickStudentDocument();
                  }}
                  className="flex-1 bg-primary rounded-xl px-3 py-3 flex-row items-center justify-center gap-2"
                >
                  <Ionicons name="document-attach-outline" size={16} color="#fff" />
                  <Text className="text-white text-sm font-semibold">PDF Yükle</Text>
                </TouchableOpacity>
              </View>

              {studentDocument && (
                <View className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                  <Text className="text-emerald-800 text-xs font-semibold">
                    {studentDocument.name}
                  </Text>
                  <Text className="text-emerald-700 text-[11px] mt-0.5">
                    Kayıt sırasında e-Devlet üzerinden doğrulanacak.
                  </Text>
                </View>
              )}

              {verificationInfo && (
                <View className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  <Text className="text-blue-800 text-xs font-semibold">
                    Belge doğrulandı
                  </Text>
                  <Text className="text-blue-700 text-[11px] mt-0.5">
                    Barkod: {verificationInfo.barcode}
                    {verificationInfo.tcMasked ? ` · TC: ${verificationInfo.tcMasked}` : ""}
                  </Text>
                </View>
              )}
            </View>

            <Button
              label={loadingMessage || "Kayıt Ol"}
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: 8 }}
            />

            <View className="flex-row items-center justify-center py-8">
              <Text className="text-slate-500 text-sm">
                Zaten hesabın var mı?{" "}
              </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-primary font-semibold text-sm">
                    Giriş Yap
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
