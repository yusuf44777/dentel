import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { supabase, type Listing } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { getFavoriteListingIds } from "../../lib/favorites";
import { getUnreadNotificationCount } from "../../lib/notifications";
import { ProductCard, CARD_MARGIN } from "../../components/listing/ProductCard";
import { CATEGORIES, type CategoryMeta } from "../../constants/categories";
import { Colors } from "../../constants/colors";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const selectedCategory =
    CATEGORIES.find((cat) => cat.value === activeCategory) ?? CATEGORIES[0];

  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadNotificationCount(0);
      return;
    }
    const count = await getUnreadNotificationCount(user.id);
    setUnreadNotificationCount(count);
  }, [user?.id]);

  const fetchListings = useCallback(async (category: string, searchText: string) => {
    let query = supabase
      .from("listings")
      .select(
        "*, profiles(id, full_name, avatar_url, university_year, whatsapp, email, created_at), listing_images(id, listing_id, image_url, position)"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (category !== "all") {
      query = query.eq("category", category);
    }
    if (searchText.trim()) {
      query = query.ilike("title", `%${searchText.trim()}%`);
    }

    const { data, error } = await query;
    if (!error && data) {
      const sorted = data.map((listing: any) => ({
        ...listing,
        listing_images: (listing.listing_images ?? []).sort(
          (a: any, b: any) => a.position - b.position
        ),
      }));

      if (user?.id) {
        const favoriteIds = await getFavoriteListingIds(
          user.id,
          sorted.map((item: any) => item.id)
        );
        setListings(
          sorted.map((item: any) => ({
            ...item,
            is_favorited: favoriteIds.has(item.id),
          }))
        );
      } else {
        setListings(sorted);
      }
    }
  }, [user?.id]);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    await fetchListings(activeCategory, search);
    setLoading(false);
    setRefreshing(false);
  }, [activeCategory, fetchListings, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchListings(activeCategory, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [activeCategory, fetchListings, search]);

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void loadUnreadCount();
    }, [loadUnreadCount])
  );

  function renderEmpty() {
    if (loading) return null;
    return (
      <View className="flex-1 items-center justify-center py-20">
        <Ionicons name="medkit-outline" size={36} color={Colors.muted} />
        <Text className="text-slate-700 font-semibold text-base mt-4">
          Henüz ilan yok
        </Text>
        <Text className="text-muted text-sm mt-1">
          İlk ilanı sen ekle!
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="px-4 pt-2 pb-3 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-primary tracking-tight">dentel</Text>
        <TouchableOpacity
          className="w-9 h-9 bg-white border border-slate-200 rounded-full items-center justify-center"
          onPress={() => router.push("/notifications")}
        >
          <Ionicons name="notifications-outline" size={18} color={Colors.text.secondary} />
          {unreadNotificationCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: Colors.danger,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 3,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View className="px-4 mb-3">
        <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-3 py-2.5">
          <Ionicons name="search-outline" size={18} color={Colors.muted} />
          <TextInput
            className="flex-1 ml-2 text-slate-900 text-sm"
            placeholder="Alet, kitap, malzeme ara..."
            placeholderTextColor={Colors.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className="px-4 mb-3">
        <TouchableOpacity
          onPress={() => setIsCategoryDropdownOpen((prev) => !prev)}
          className="flex-row items-center justify-between bg-white border border-slate-200 rounded-2xl px-3 py-3"
        >
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Ionicons
              name={selectedCategory.icon as any}
              size={16}
              color={Colors.text.secondary}
            />
            <Text className="text-sm font-medium text-slate-800">
              {selectedCategory.label}
            </Text>
          </View>
          <Ionicons
            name={isCategoryDropdownOpen ? "chevron-up-outline" : "chevron-down-outline"}
            size={18}
            color={Colors.muted}
          />
        </TouchableOpacity>

        {isCategoryDropdownOpen && (
          <View className="mt-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {CATEGORIES.map((cat: CategoryMeta, index) => {
              const active = activeCategory === cat.value;
              const showDivider = index !== CATEGORIES.length - 1;
              return (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => {
                    setActiveCategory(cat.value);
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`flex-row items-center justify-between px-3 py-3 ${
                    showDivider ? "border-b border-slate-100" : ""
                  }`}
                >
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <Ionicons
                      name={cat.icon as any}
                      size={16}
                      color={active ? Colors.primary : Colors.text.secondary}
                    />
                    <Text
                      className={`text-sm ${
                        active ? "text-primary font-semibold" : "text-slate-700 font-medium"
                      }`}
                    >
                      {cat.label}
                    </Text>
                  </View>
                  {active && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: 16 - CARD_MARGIN,
            paddingBottom: 24,
          }}
          columnWrapperStyle={{ justifyContent: "flex-start" }}
          renderItem={({ item }) => <ProductCard listing={item} />}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
