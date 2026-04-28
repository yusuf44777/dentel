import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getTurkishErrorMessage } from "../../lib/error-messages";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { BrandMark } from "../../components/BrandMark";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email || !password) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError(
        getTurkishErrorMessage(
          error,
          "Giriş yapılamadı. Bilgilerini kontrol edip tekrar dene."
        )
      );
    }
    // On success, _layout.tsx auth guard redirects to /(tabs) automatically

    setLoading(false);
  }

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
          <View className="px-6 pt-12 pb-10">
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <BrandMark size={36} />
              <Text className="text-4xl font-bold text-primary tracking-tight">
                dentel
              </Text>
            </View>
            <Text className="text-slate-500 mt-2 text-base">
              Diş Hekimliği Öğrenci Platformu
            </Text>
          </View>

          {/* Form */}
          <View className="flex-1 px-6">
            <Text className="text-2xl font-bold text-slate-900 mb-1">
              Giriş Yap
            </Text>
            <Text className="text-slate-500 mb-8 text-sm">
              Hesabına giriş yaparak alım-satım yapmaya başla.
            </Text>

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            )}

            <Input
              label="E-posta"
              placeholder="adiniz@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
            />

            <Input
              label="Şifre"
              placeholder="Şifrenizi girin"
              value={password}
              onChangeText={setPassword}
              secureToggle
              textContentType="password"
            />

            <Button
              label="Giriş Yap"
              onPress={handleLogin}
              loading={loading}
              style={{ marginTop: 8 }}
            />

            {/* Spacer */}
            <View className="flex-1" />

            {/* Register link */}
            <View className="flex-row items-center justify-center py-8">
              <Text className="text-slate-500 text-sm">
                Hesabın yok mu?{" "}
              </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-primary font-semibold text-sm">
                    Kayıt Ol
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
