import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Colors } from "../../constants/colors";

const YEAR_LABELS: Record<string, string> = {
  prep: "Hazırlık",
  "1": "1. Sınıf",
  "2": "2. Sınıf",
  "3": "3. Sınıf",
  "4": "4. Sınıf",
  "5": "5. Sınıf",
};

const YEAR_OPTIONS = [
  { label: "Hazırlık", value: "prep" },
  { label: "1. Sınıf", value: "1" },
  { label: "2. Sınıf", value: "2" },
  { label: "3. Sınıf", value: "3" },
  { label: "4. Sınıf", value: "4" },
  { label: "5. Sınıf", value: "5" },
];

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center py-3 border-b border-slate-100">
      <View className="w-8 items-center">
        <Ionicons name={icon as any} size={18} color={Colors.muted} />
      </View>
      <Text className="text-slate-500 text-sm w-24">{label}</Text>
      <Text className="flex-1 text-slate-900 text-sm font-medium">{value}</Text>
    </View>
  );
}

function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("90") ? digits : `90${digits.replace(/^0/, "")}`;
}

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const [listingCount, setListingCount] = useState(0);
  const [soldCount, setSoldCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [fullNameInput, setFullNameInput] = useState("");
  const [whatsappInput, setWhatsappInput] = useState("");
  const [yearInput, setYearInput] = useState<string | null>(null);

  useEffect(() => {
    setFullNameInput(profile?.full_name ?? "");
    setWhatsappInput("");
    setYearInput(profile?.university_year ?? null);
  }, [profile]);

  const loadStats = useCallback(async () => {
    if (!user?.id) {
      setListingCount(0);
      setSoldCount(0);
      return;
    }

    setStatsLoading(true);

    const [{ count: totalListings }, { count: soldListings }] = await Promise.all([
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .in("status", ["active", "sold"]),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("status", "sold"),
    ]);

    setListingCount(totalListings ?? 0);
    setSoldCount(soldListings ?? 0);
    setStatsLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, [loadStats])
  );

  function handleSignOut() {
    Alert.alert("Çıkış Yap", "Hesabından çıkmak istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: signOut },
    ]);
  }

  async function handleSaveProfile() {
    if (!user?.id) return;

    const fullName = fullNameInput.trim();
    if (!fullName) {
      Alert.alert("Eksik Bilgi", "Lütfen ad soyad alanını doldur.");
      return;
    }

    if (!yearInput) {
      Alert.alert("Eksik Bilgi", "Lütfen sınıfını seç.");
      return;
    }

    const normalizedWhatsapp = normalizeWhatsapp(whatsappInput);
    const whatsappToSave = whatsappInput.trim()
      ? normalizedWhatsapp
      : (profile?.whatsapp ?? "");
    if (whatsappInput.trim() && normalizedWhatsapp.length < 12) {
      Alert.alert("Eksik Bilgi", "Geçerli bir WhatsApp numarası gir.");
      return;
    }

    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
        .update({
          full_name: fullName,
          university_year: yearInput,
          whatsapp: whatsappToSave,
        })
        .eq("id", user.id);

    setSavingProfile(false);

    if (error) {
      Alert.alert("Hata", "Profil güncellenemedi. Lütfen tekrar dene.");
      return;
    }

    await refreshProfile();
    setIsEditing(false);
    setShowYearPicker(false);
    Alert.alert("Başarılı", "Profil bilgilerin güncellendi.");
  }

  function handleCancelEdit() {
    setFullNameInput(profile?.full_name ?? "");
    setWhatsappInput("");
    setYearInput(profile?.university_year ?? null);
    setShowYearPicker(false);
    setIsEditing(false);
  }

  const displayName = profile?.full_name ?? user?.email?.split("@")[0] ?? "Kullanıcı";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text className="text-xl font-bold text-slate-900">Profilim</Text>
        </View>

        {/* Avatar + Name */}
        <View className="items-center py-8">
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              className="w-24 h-24 rounded-full"
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-primary items-center justify-center">
              <Text className="text-white text-3xl font-bold">{initials}</Text>
            </View>
          )}
          <Text className="text-xl font-bold text-slate-900 mt-4">{displayName}</Text>
          {profile?.university_year && (
            <View className="bg-blue-50 px-3 py-1 rounded-full mt-2">
              <Text className="text-primary text-sm font-medium">
                {YEAR_LABELS[profile.university_year] ?? profile.university_year}
              </Text>
            </View>
          )}
        </View>

        {/* Info card */}
        <View className="mx-4 bg-white rounded-2xl px-4 shadow-sm mb-4">
          <InfoRow
            icon="mail-outline"
            label="E-posta"
            value={user?.email ?? "-"}
          />
          <InfoRow
            icon="school-outline"
            label="Üniversite"
            value="Üsküdar Üniversitesi"
          />
        </View>

        {/* İstatistikler */}
        <View className="mx-4 bg-white rounded-2xl px-4 py-4 shadow-sm mb-6 flex-row">
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-slate-900">
              {statsLoading ? "..." : listingCount}
            </Text>
            <Text className="text-slate-500 text-xs mt-1">Toplam İlan</Text>
          </View>
          <View className="w-px bg-slate-100" />
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-slate-900">
              {statsLoading ? "..." : soldCount}
            </Text>
            <Text className="text-slate-500 text-xs mt-1">Satıldı</Text>
          </View>
        </View>

        {/* Profil düzenleme */}
        <View className="mx-4 bg-white rounded-2xl px-4 py-4 shadow-sm mb-6">
          <TouchableOpacity
            onPress={() => setIsEditing((prev) => !prev)}
            className="flex-row items-center justify-between"
          >
            <Text className="text-slate-900 font-semibold text-base">Profilini Düzenle</Text>
            <Ionicons
              name={isEditing ? "chevron-up-outline" : "chevron-down-outline"}
              size={18}
              color={Colors.muted}
            />
          </TouchableOpacity>

          {isEditing && (
            <View className="mt-4">
              <Input
                label="Ad Soyad"
                value={fullNameInput}
                onChangeText={setFullNameInput}
                autoCapitalize="words"
                placeholder="Adınızı Soyadınızı girin"
              />

              <Input
                label="WhatsApp Numarası"
                value={whatsappInput}
                onChangeText={setWhatsappInput}
                keyboardType="phone-pad"
                placeholder="Değiştirmek için yeni numara girin"
              />

              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-700 mb-1.5">Sınıf</Text>
                <Pressable
                  onPress={() => setShowYearPicker((prev) => !prev)}
                  className={`flex-row items-center justify-between bg-white border rounded-xl px-4 py-3.5 ${
                    showYearPicker ? "border-primary" : "border-slate-200"
                  }`}
                >
                  <Text className={yearInput ? "text-slate-900 text-base" : "text-muted text-base"}>
                    {yearInput ? (YEAR_LABELS[yearInput] ?? yearInput) : "Sınıfınızı seçin"}
                  </Text>
                  <Ionicons
                    name={showYearPicker ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={Colors.muted}
                  />
                </Pressable>

                {showYearPicker && (
                  <View className="bg-white border border-slate-200 rounded-xl mt-1 overflow-hidden">
                    {YEAR_OPTIONS.map((item, index) => (
                      <TouchableOpacity
                        key={item.value}
                        onPress={() => {
                          setYearInput(item.value);
                          setShowYearPicker(false);
                        }}
                        className={`px-4 py-3 flex-row items-center justify-between ${
                          index < YEAR_OPTIONS.length - 1 ? "border-b border-slate-100" : ""
                        }`}
                      >
                        <Text className={`text-base ${yearInput === item.value ? "text-primary font-semibold" : "text-slate-800"}`}>
                          {item.label}
                        </Text>
                        {yearInput === item.value && (
                          <Ionicons name="checkmark" size={18} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View className="flex-row" style={{ gap: 10 }}>
                <Button
                  label="Vazgeç"
                  variant="secondary"
                  fullWidth={false}
                  style={{ flex: 1 }}
                  onPress={handleCancelEdit}
                />
                <Button
                  label="Kaydet"
                  fullWidth={false}
                  style={{ flex: 1 }}
                  loading={savingProfile}
                  onPress={handleSaveProfile}
                />
              </View>
            </View>
          )}
        </View>

        {/* Sign out */}
        <View className="mx-4 mb-10">
          <Button label="Çıkış Yap" variant="danger" onPress={handleSignOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
