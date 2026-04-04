import { Tabs } from "expo-router";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import type { ComponentProps } from "react";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

// Custom FAB-style Sell tab button
function SellButton({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.sellButton}
    >
      <View style={styles.sellInner}>
        <Ionicons name="add" size={32} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

function TabIcon({
  name,
  color,
  size,
}: {
  name: IoniconsName;
  color: string;
  size: number;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Anasayfa",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={focused ? "home" : "home-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Ara",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={focused ? "search" : "search-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: "",
          tabBarButton: (props) => (
            <SellButton onPress={props.onPress ?? undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Mesajlar",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={focused ? "chatbubble" : "chatbubble-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={focused ? "person" : "person-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  sellButton: {
    top: -20,
    alignItems: "center",
    justifyContent: "center",
  },
  sellInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
