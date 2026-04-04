import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth";
import { supabase, type Notification } from "../lib/supabase";
import { markAllNotificationsRead, markNotificationRead } from "../lib/notifications";
import { Colors } from "../constants/colors";
import { STRINGS } from "../constants/strings";

function formatDate(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async (showRefresh = false) => {
    if (!user?.id) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error) setItems((data ?? []) as Notification[]);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function handleMarkAllRead() {
    if (!user?.id) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(user.id);
      await loadNotifications();
      Alert.alert(STRINGS.common.success, STRINGS.notifications.markedAllRead);
    } catch {
      Alert.alert(STRINGS.common.error, STRINGS.notifications.loadError);
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleOpenItem(item: Notification) {
    if (!item.is_read) {
      await markNotificationRead(item.id);
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
    }

    if (item.listing_id) {
      router.push(`/listing/${item.listing_id}`);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="px-4 pt-2 pb-3 flex-row items-center justify-between border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-2">
            <Ionicons name="chevron-back" size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">{STRINGS.notifications.title}</Text>
        </View>
        <TouchableOpacity onPress={() => void handleMarkAllRead()} disabled={markingAll}>
          {markingAll ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text className="text-primary text-sm font-semibold">
              {STRINGS.notifications.markAllRead}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="notifications-outline" size={40} color={Colors.muted} />
          <Text className="text-slate-500 mt-3 text-sm text-center">
            {STRINGS.notifications.empty}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadNotifications(true);
              }}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                void handleOpenItem(item);
              }}
              className={`bg-white rounded-2xl border px-3 py-3 ${
                item.is_read ? "border-slate-100" : "border-blue-200"
              }`}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-slate-900 font-semibold text-sm">{item.title}</Text>
                  <Text className="text-slate-600 text-sm mt-1 leading-5">{item.body}</Text>
                </View>
                {!item.is_read && (
                  <View className="w-2.5 h-2.5 rounded-full bg-primary mt-1" />
                )}
              </View>
              <Text className="text-slate-400 text-xs mt-2">{formatDate(item.created_at)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
