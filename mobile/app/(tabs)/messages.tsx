import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Placeholder — full implementation in Phase 4
export default function MessagesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="px-4 pt-2">
        <Text className="text-xl font-bold text-slate-900">Messages</Text>
        <Text className="text-muted text-center mt-20">
          Conversations coming in Phase 4
        </Text>
      </View>
    </SafeAreaView>
  );
}
