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
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Colors } from "../../constants/colors";

const ALLOWED_DOMAIN = "st.uskudar.edu.tr";

const YEARS = [
  { label: "Hazırlık", value: "prep" },
  { label: "1. Sınıf", value: "1" },
  { label: "2. Sınıf", value: "2" },
  { label: "3. Sınıf", value: "3" },
  { label: "4. Sınıf", value: "4" },
  { label: "5. Sınıf", value: "5" },
];

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [year, setYear] = useState<string | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    return null;
  }

  async function handleRegister() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          university_year: year,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Update the profile row created by the trigger
    if (data.user) {
      const phone = whatsapp.trim().replace(/\D/g, "");
      const whatsappNumber = phone.startsWith("90") ? phone : `90${phone.replace(/^0/, "")}`;
      await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), university_year: year, whatsapp: whatsappNumber })
        .eq("id", data.user.id);
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6">
        <View className="bg-white rounded-2xl p-8 items-center shadow-sm w-full">
          <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
            <Ionicons name="checkmark-circle" size={40} color={Colors.secondary} />
          </View>
          <Text className="text-xl font-bold text-slate-900 mb-2">
            Kayıt Başarılı!
          </Text>
          <Text className="text-slate-500 text-sm text-center mb-6">
            E-posta adresine bir doğrulama bağlantısı gönderdik. Lütfen
            e-postanı kontrol et.
          </Text>
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
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="px-6 pt-12 pb-8">
            <Text className="text-4xl font-bold text-primary tracking-tight">
              dentel
            </Text>
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

            <Button
              label="Kayıt Ol"
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
