import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";

export default function AuthCallbackScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="text-slate-700 font-semibold mt-4">Doğrulama tamamlanıyor...</Text>
        <Text className="text-slate-500 text-sm mt-2 text-center">
          Otomatik yönlendirilmezse uygulamayı yeniden aç.
        </Text>
      </View>
    </SafeAreaView>
  );
}
