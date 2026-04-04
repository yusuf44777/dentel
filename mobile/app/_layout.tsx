import "react-native-get-random-values"; // must be first — polyfills crypto for uuid
import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "../lib/auth";
import { Colors } from "../constants/colors";

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      // Not signed in — go to login
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Signed in — go to main app
      router.replace("/(tabs)");
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="listing/[id]"
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: "Geri",
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.surface },
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
