import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

export default function MessagesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="px-4 pt-2 pb-3 border-b border-slate-100">
        <Text className="text-xl font-bold text-slate-900">Mesajlar</Text>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "#E7F9EE",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Ionicons name="logo-whatsapp" size={36} color="#25D366" />
        </View>

        <Text className="text-lg font-bold text-slate-900 text-center mb-2">
          WhatsApp üzerinden iletişim kur
        </Text>
        <Text className="text-slate-500 text-sm text-center leading-relaxed">
          Bir ilanla ilgileniyorsan ilan sayfasındaki{" "}
          <Text className="font-semibold text-slate-700">
            "WhatsApp'tan İletişime Geç"
          </Text>{" "}
          butonuna bas. Satıcıya doğrudan WhatsApp üzerinden ulaşırsın.
        </Text>

        <View
          className="mt-8 bg-white border border-slate-100 rounded-2xl p-4 w-full"
          style={{ gap: 12 }}
        >
          {[
            { icon: "search-outline", text: "İlanı bul" },
            { icon: "chatbubble-ellipses-outline", text: "WhatsApp'tan yaz" },
            { icon: "checkmark-circle-outline", text: "Anlaş, teslim al" },
          ].map((step, i) => (
            <View key={i} className="flex-row items-center gap-3">
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: Colors.primary + "15",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={step.icon as any} size={18} color={Colors.primary} />
              </View>
              <Text className="text-slate-700 text-sm font-medium">{step.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
