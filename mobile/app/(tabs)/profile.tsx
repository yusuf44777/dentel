import { View, Text, ScrollView, TouchableOpacity, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth";
import { Button } from "../../components/ui/Button";
import { Colors } from "../../constants/colors";

const YEAR_LABELS: Record<string, string> = {
  prep: "Hazırlık",
  "1": "1. Sınıf",
  "2": "2. Sınıf",
  "3": "3. Sınıf",
  "4": "4. Sınıf",
  "5": "5. Sınıf",
};

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

export default function ProfileScreen() {
  const { profile, user, signOut } = useAuth();

  function handleSignOut() {
    Alert.alert("Çıkış Yap", "Hesabından çıkmak istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: signOut },
    ]);
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
          {profile?.whatsapp && (
            <InfoRow
              icon="logo-whatsapp"
              label="WhatsApp"
              value={profile.whatsapp}
            />
          )}
        </View>

        {/* Stats — placeholder, wired up in Phase 4 */}
        <View className="mx-4 bg-white rounded-2xl px-4 py-4 shadow-sm mb-6 flex-row">
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-slate-900">0</Text>
            <Text className="text-slate-500 text-xs mt-1">İlan</Text>
          </View>
          <View className="w-px bg-slate-100" />
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-slate-900">0</Text>
            <Text className="text-slate-500 text-xs mt-1">Satıldı</Text>
          </View>
        </View>

        {/* Sign out */}
        <View className="mx-4 mb-10">
          <Button label="Çıkış Yap" variant="danger" onPress={handleSignOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
