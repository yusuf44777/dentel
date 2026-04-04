import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { supabase, type ListingStatus } from "../lib/supabase";
import { Colors } from "../constants/colors";
import { STRINGS } from "../constants/strings";
import { emitNotification } from "../lib/notifications";

type TabStatus = "active" | "sold" | "deleted";

const STATUS_TABS: { key: TabStatus; label: string }[] = [
  { key: "active", label: STRINGS.myListings.active },
  { key: "sold", label: STRINGS.myListings.sold },
  { key: "deleted", label: STRINGS.myListings.deleted },
];

export default function MyListingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabStatus>("active");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = useCallback(async (showRefresh = false) => {
    if (!user?.id) return;

    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const { data } = await supabase
      .from("listings")
      .select("*, listing_images(id, listing_id, image_url, position)")
      .eq("seller_id", user.id)
      .eq("status", activeTab)
      .order("created_at", { ascending: false });

    const normalized = (data ?? []).map((item: any) => ({
      ...item,
      listing_images: (item.listing_images ?? []).sort(
        (a: any, b: any) => a.position - b.position
      ),
    }));
    setItems(normalized);
    setLoading(false);
    setRefreshing(false);
  }, [activeTab, user?.id]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function updateListingStatus(listingId: string, status: ListingStatus) {
    const { error } = await supabase
      .from("listings")
      .update({ status })
      .eq("id", listingId);
    if (error) throw error;
  }

  function handleMarkSold(item: any) {
    Alert.alert("Satıldı Olarak İşaretle", "Bu ilanı satıldı olarak işaretlemek ister misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Evet",
        onPress: async () => {
          try {
            await updateListingStatus(item.id, "sold");
            const { data: watchers } = await supabase
              .from("favorites")
              .select("user_id")
              .eq("listing_id", item.id)
              .neq("user_id", user!.id);

            if (watchers?.length) {
              await Promise.all(
                watchers.map((watcher) =>
                  emitNotification({
                    eventType: "listing_marked_sold",
                    recipientUserId: watcher.user_id,
                    listingId: item.id,
                    title: "Favorilediğin ilan satıldı",
                    body: `"${item.title}" ilanı satıldı olarak işaretlendi.`,
                  })
                )
              );
            }
            await loadItems();
          } catch {
            Alert.alert("Hata", "İlan durumu güncellenemedi.");
          }
        },
      },
    ]);
  }

  function handleDelete(item: any) {
    Alert.alert("İlanı Sil", "Bu ilanı silmek ister misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await updateListingStatus(item.id, "deleted");
            await loadItems();
          } catch {
            Alert.alert("Hata", "İlan silinemedi.");
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="px-4 pt-2 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-2">
            <Ionicons name="chevron-back" size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">{STRINGS.myListings.title}</Text>
        </View>
      </View>

      <View className="px-4 pt-3">
        <View className="flex-row bg-white border border-slate-200 rounded-xl p-1">
          {STATUS_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 rounded-lg items-center ${active ? "bg-primary" : ""}`}
              >
                <Text className={`text-xs font-semibold ${active ? "text-white" : "text-slate-600"}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-slate-500 text-sm text-center">{STRINGS.myListings.empty}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadItems(true);
              }}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View className="bg-white rounded-2xl border border-slate-100 p-3">
              <TouchableOpacity onPress={() => router.push(`/listing/${item.id}`)}>
                <View className="flex-row">
                  <View className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden">
                    {item.listing_images?.[0]?.image_url ? (
                      <Image
                        source={{ uri: item.listing_images[0].image_url }}
                        className="w-full h-full"
                      />
                    ) : null}
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-slate-900 font-semibold text-sm" numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text className="text-primary font-bold mt-1">
                      ₺{Number(item.price).toLocaleString("tr-TR")}
                    </Text>
                    <Text className="text-slate-400 text-xs mt-1">
                      {new Date(item.created_at).toLocaleDateString("tr-TR")}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View className="flex-row mt-3" style={{ gap: 8 }}>
                {activeTab !== "deleted" && (
                  <TouchableOpacity
                    onPress={() => router.push(`/listing/${item.id}/edit`)}
                    className="flex-1 bg-slate-100 rounded-xl py-2.5 items-center"
                  >
                    <Text className="text-slate-700 text-xs font-semibold">Düzenle</Text>
                  </TouchableOpacity>
                )}
                {activeTab === "active" && (
                  <TouchableOpacity
                    onPress={() => handleMarkSold(item)}
                    className="flex-1 bg-emerald-100 rounded-xl py-2.5 items-center"
                  >
                    <Text className="text-emerald-700 text-xs font-semibold">Satıldı</Text>
                  </TouchableOpacity>
                )}
                {activeTab !== "deleted" && (
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    className="flex-1 bg-red-100 rounded-xl py-2.5 items-center"
                  >
                    <Text className="text-red-700 text-xs font-semibold">Sil</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
